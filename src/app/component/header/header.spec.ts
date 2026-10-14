import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Header } from './header';
import { AuthProfile, UserService } from '../../feats/profile user/user-service/user-service';

describe('Header session', () => {
  let fixture: ComponentFixture<Header>;
  const account = signal<AuthProfile | null>(null);
  let logoutCalls = 0;

  beforeEach(async () => {
    account.set(null);
    logoutCalls = 0;
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([{ path: 'home', component: Header }]), { provide: UserService, useValue: {
        usuarioLogado: account,
        logout: () => { logoutCalls++; account.set(null); return of(undefined); },
      } }],
    }).compileComponents();
    fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
  });

  it('shows login and registration to visitors', () => {
    expect(fixture.nativeElement.querySelector('a[href="/login"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/cadastro"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-perfil')).toBeNull();
  });

  it('reacts to login and replaces guest links with the real account', () => {
    account.set({ id: '1', name: 'Maria da Silva', email: 'maria@example.test',
      role: 'CITIZEN', active: true, permissions: [], territoryId: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/login"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/cadastro"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.account-name').textContent).toContain('Maria da Silva');
    expect(fixture.nativeElement.querySelector('.btn-perfil').getAttribute('href')).toBe('/perfil-usuario');
  });

  it('clears the account and restores guest links on logout or expiry', () => {
    account.set({ id: '1', name: 'Maria', email: 'maria@example.test',
      role: 'CITIZEN', active: true, permissions: [], territoryId: null });
    fixture.detectChanges();
    fixture.componentInstance.sair();
    fixture.detectChanges();
    expect(logoutCalls).toBe(1);
    expect(fixture.nativeElement.querySelector('.btn-perfil')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/login"]')).not.toBeNull();
  });
});
