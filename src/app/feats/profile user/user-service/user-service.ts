import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, tap, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AuthProfile { id: string; email: string; name: string; role: 'SUPREME'|'ADMIN'|'CITIZEN'; territoryId: string|null; permissions: string[]; active: boolean; }
interface AuthSession { accessToken: string; tokenType: string; expiresAt: number; user: AuthProfile; }

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.authUrl.replace(/\/+$/, '');
  private readonly session = signal<AuthSession|null>(null);
  private expiryTimer?: ReturnType<typeof setTimeout>;
  readonly usuarioLogado = computed(() => {
    const user = this.session()?.user;
    return user ? { nome: user.name, email: user.email, role: user.role, id: user.id } : null;
  });
  token(): string|null { const current = this.session(); return current && current.expiresAt > Date.now() ? current.accessToken : null; }
  cadastrar(usuario: { nome:string; sobreNome:string; email:string; senha:string; cpf:string; check:boolean }) {
    return this.http.post<AuthProfile>(`${this.base}/auth/register`, {
      name: `${usuario.nome.trim()} ${usuario.sobreNome.trim()}`.trim(), email: usuario.email.trim(), password: usuario.senha,
      cpf: usuario.cpf, acceptedTerms: usuario.check, termsVersion: '2026-10-01.1', privacyVersion: '2026-10-01.1',
    }).pipe(timeout(12000));
  }
  login(email:string, senha:string, code?:string) {
    return this.http.post<AuthSession>(`${this.base}/auth/login`, { email:email.trim(), password:senha, ...(code?.trim()?{code:code.trim()}: {}) }).pipe(timeout(12000), tap(session => {
      this.limparSessao(); this.session.set(session); this.expiryTimer=setTimeout(()=>this.limparSessao(), Math.max(0,session.expiresAt-Date.now()));
    }));
  }
  validarSessao() { const token=this.token(); if(!token) return of(false); return this.http.get<AuthProfile>(`${this.base}/auth/me`).pipe(timeout(12000),map(profile=>profile.active&&this.token()===token),catchError(()=>of(false))); }
  logout() { const token=this.token(); this.limparSessao(); return token?this.http.post<void>(`${this.base}/auth/logout`,{}, {headers:{Authorization:`Bearer ${token}`}}):of(undefined); }
  limparSessao() { if(this.expiryTimer) clearTimeout(this.expiryTimer); this.session.set(null); }
}

