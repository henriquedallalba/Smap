import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, tap, timeout } from 'rxjs';
import { LEGAL_VERSION } from '../../../legal/legal-documents';
import { environment } from '../../../../environments/environment';

export interface AuthProfile {
  id: string; email: string; name: string;
  role: 'SUPREME' | 'ADMIN' | 'CITIZEN';
  territoryId: string | null; permissions: string[]; active: boolean;
}
interface AuthSession { accessToken: string; tokenType: string; expiresAt: number; user: AuthProfile; }

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.authUrl.replace(/\/+$/, '');
  private readonly session = signal<AuthSession | null>(null);
  private expiryTimer?: ReturnType<typeof setTimeout>;
  readonly usuarioLogado = computed(() => this.session()?.user ?? null);

  constructor() {
    // Remove obsolete local accounts, which included plaintext passwords.
    try { localStorage.removeItem('usuarios'); localStorage.removeItem('usuarioLogado'); } catch {}
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expiryTimer));
  }

  token(): string | null {
    const session = this.session();
    return session && session.expiresAt > Date.now() ? session.accessToken : null;
  }

  cadastrar(usuario: { nome: string; sobreNome: string; email: string; senha: string; cpf: string; acceptedTerms: boolean }) {
    return this.http.post<AuthProfile>(this.base + '/auth/register', {
      name: (usuario.nome.trim() + ' ' + usuario.sobreNome.trim()).trim(),
      email: usuario.email.trim(), password: usuario.senha,
      cpf: usuario.cpf,
      acceptedTerms: usuario.acceptedTerms, termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION,
    }).pipe(timeout(12000));
  }

  login(email: string, senha: string, code?: string) {
    return this.http.post<AuthSession>(this.base + '/auth/login', {
      email: email.trim(), password: senha, ...(code?.trim() ? { code: code.trim() } : {}),
    }).pipe(timeout(12000), tap(session => {
      this.limparSessao();
      this.session.set(session);
      this.expiryTimer = setTimeout(() => this.limparSessao(), Math.max(0, session.expiresAt - Date.now()));
    }));
  }

  validarSessao() {
    const token = this.token();
    if (!token) { this.limparSessao(); return of(false); }
    return this.http.get<AuthProfile>(this.base + '/auth/me').pipe(
      timeout(12000),
      map(profile => {
        if (this.token() !== token || !profile.active) return false;
        this.session.update(session => session ? { ...session, user: profile } : null);
        return true;
      }),
      catchError(() => of(false)),
    );
  }

  logout() {
    const token = this.token();
    this.limparSessao();
    return token ? this.http.post<void>(this.base + '/auth/logout', {}, {
      headers: { Authorization: 'Bearer ' + token },
    }).pipe(timeout(12000)) : of(undefined);
  }

  limparSessao() {
    clearTimeout(this.expiryTimer);
    this.session.set(null);
  }
}
