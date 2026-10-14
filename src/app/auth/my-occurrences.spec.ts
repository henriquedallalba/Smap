import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OcorrenciasRegistradas } from '../feats/ocorrencias-registradas/ocorrencias-registradas';
import { UserService } from '../feats/profile user/user-service/user-service';
import { environment } from '../../environments/environment';
import { destinoAposLogin } from './auth.guard';

describe('My occurrences', () => {
  const account = signal<{name: string} | null>(null);
  beforeEach(() => {
    account.set({name: 'Conta de teste'});
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      {provide: UserService, useValue: {usuarioLogado: account, token: () => 'test-token'}},
    ] });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('requests only the authenticated endpoint and shows an empty state, never the public feed', async () => {
    const fixture = TestBed.createComponent(OcorrenciasRegistradas);
    fixture.detectChanges();
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne(environment.apiUrl.replace(/\/+$/, '') + '/ocorrencias/minhas');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Você ainda não tem ocorrências');
    expect(fixture.nativeElement.querySelector('app-tela-ocorrencias')).toBeNull();
    http.expectNone(environment.apiUrl + '/ocorrencias');
    account.set(null);
    fixture.detectChanges();
    TestBed.tick();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Sua sessão terminou');
  });

  it('preserves the destination after signing in', () => {
    expect(destinoAposLogin('/ocorrenciasRegistrada')).toBe('/ocorrenciasRegistrada');
  });
});
