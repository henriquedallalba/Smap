import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { UserService } from '../feats/profile user/user-service/user-service';
import { authInterceptor } from './auth.interceptor';
import { authGuard, destinoAposLogin } from './auth.guard';
import { environment } from '../../environments/environment';

describe('Autenticação de ocorrências', () => {
  let auth: UserService;
  let http: HttpClient;
  let requests: HttpTestingController;
  const profile = { id: 'account-id', name: 'Pessoa Teste', email: 'pessoa@example.test', role: 'CITIZEN', territoryId: null, permissions: [], active: true };
  const token = 'a'.repeat(43);
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    auth = TestBed.inject(UserService); http = TestBed.inject(HttpClient); requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify());
  function login() {
    auth.login(profile.email, 'MinhaSenha!123').subscribe();
    const request = requests.expectOne(environment.authUrl + '/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ accessToken: token, tokenType: 'Bearer', expiresAt: Date.now() + 60000, user: profile });
  }
  it('leva visitante ao login e preserva o destino', async () => {
    const result = await firstValueFrom(TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot,
      { url: '/registrar-ocorrencia' } as RouterStateSnapshot)) as Observable<boolean | UrlTree>);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fregistrar-ocorrencia');
  });
  it('confirma a sessão no servidor antes de liberar a rota', async () => {
    login();
    const result = firstValueFrom(TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot,
      { url: '/registrar-ocorrencia' } as RouterStateSnapshot)) as Observable<boolean | UrlTree>);
    const request = requests.expectOne(environment.authUrl + '/auth/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer ' + token);
    request.flush(profile);
    expect(await result).toBe(true);
  });
  it('envia o token à API de ocorrências, nunca a serviços externos', () => {
    login();
    http.post(environment.apiUrl + '/ocorrencias', {}).subscribe();
    const own = requests.expectOne(environment.apiUrl + '/ocorrencias');
    expect(own.request.headers.get('Authorization')).toBe('Bearer ' + token); own.flush({});
    http.get(environment.apiUrl + '.evil.test/ocorrencias').subscribe();
    const external = requests.expectOne(environment.apiUrl + '.evil.test/ocorrencias');
    expect(external.request.headers.has('Authorization')).toBe(false); external.flush({});
  });
  it('limpa sessão revogada e não libera a rota se auth estiver fora do ar', async () => {
    login();
    const unavailable = firstValueFrom(auth.validarSessao());
    requests.expectOne(environment.authUrl + '/auth/me').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(await unavailable).toBe(false);
    const revoked = firstValueFrom(auth.validarSessao());
    requests.expectOne(environment.authUrl + '/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await revoked).toBe(false); expect(auth.token()).toBeNull();
  });
  it('revoga no servidor ao sair e remove a sessão local imediatamente', () => {
    login(); auth.logout().subscribe();
    expect(auth.token()).toBeNull();
    const request = requests.expectOne(environment.authUrl + '/auth/logout');
    expect(request.request.headers.get('Authorization')).toBe('Bearer ' + token); request.flush(null);
  });
  it('cadastro envia somente os campos aceitos pela auth-smap', () => {
    auth.cadastrar({ nome: ' Pessoa ', sobreNome: 'Teste', email: profile.email, senha: 'MinhaSenha!123', cpf: '52998224725', acceptedTerms: true }).subscribe();
    const request = requests.expectOne(environment.authUrl + '/auth/register');
    expect(request.request.body).toEqual({ name: 'Pessoa Teste', email: profile.email, password: 'MinhaSenha!123', cpf: '52998224725', acceptedTerms: true, termsVersion: '2026-10-01.1', privacyVersion: '2026-10-01.1' });
    request.flush(profile);
  });
  it('recusa destinos externos e aceita retorno ao formulário', () => {
    expect(destinoAposLogin('https://example.com')).toBe('/perfil-usuario');
    expect(destinoAposLogin('//example.com')).toBe('/perfil-usuario');
    expect(destinoAposLogin('/admin')).toBe('/perfil-usuario');
    expect(destinoAposLogin('/registrar-ocorrencia')).toBe('/registrar-ocorrencia');
  });
});
