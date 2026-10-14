import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProfileHome } from '../feats/profile user/profile-home/profile-home';
import { ProfileConfig } from '../feats/profile user/profile-config/profile-config';
import { UserService } from '../feats/profile user/user-service/user-service';
import { MapaSeparado } from '../components/mapa-separado/mapa-separado';
import { FormLogin } from '../feats/container-login/form-login/form-login';

@Component({ selector: 'app-mapa-separado', template: '' })
class MapStub {}

describe('Account screens', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: UserService, useValue: {
        usuarioLogado: signal({ name: 'Maria da Silva', email: 'maria@example.test' }),
        logout: () => of(undefined),
      } }],
    });
    TestBed.overrideComponent(ProfileHome, {
      remove: { imports: [MapaSeparado] }, add: { imports: [MapStub] },
    });
  });

  it('shows the account name, date and honest history state on the profile', () => {
    const fixture = TestBed.createComponent(ProfileHome);
    fixture.detectChanges();
    const page = fixture.nativeElement;
    expect(page.querySelector('h1').textContent).toContain('Maria da Silva');
    expect(page.textContent).toContain(fixture.componentInstance.hoje);
    expect(page.querySelector('a[href="/ocorrenciasRegistrada"]').textContent).toContain('Ver minhas ocorrências');
    expect(page.querySelector('img[src=""]')).toBeNull();
    expect(page.querySelector('img[src="/assets/user.jpg"]')).toBeNull();
  });

  it('shows real profile details without simulated statistics or notification toggles', () => {
    const fixture = TestBed.createComponent(ProfileConfig);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dl').textContent).toContain('maria@example.test');
    expect(fixture.nativeElement.textContent).toContain('ainda não estão disponíveis');
    expect(fixture.nativeElement.querySelector('.list')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="switch"]')).toBeNull();
  });

  it('gives readable validation feedback when submitting empty login fields', () => {
    const fixture = TestBed.createComponent(FormLogin);
    fixture.detectChanges();
    fixture.componentInstance.fazerLogin(new Event('submit') as SubmitEvent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Informe seu e-mail.');
    expect(fixture.nativeElement.textContent).toContain('Informe sua senha.');
  });
});
