import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable, firstValueFrom } from 'rxjs';
import { FormCadastro } from '../feats/container-cadastro/form-cadastro/form-cadastro';
import { UserService } from '../feats/profile user/user-service/user-service';
import { adminGuard } from './admin.guard';
import { environment } from '../../environments/environment';

describe('Aceite e administração',()=>{
 let requests:HttpTestingController;
 beforeEach(()=>{
   TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]});
   requests=TestBed.inject(HttpTestingController);
 });
 afterEach(()=>requests.verify());
 it('mantém aceite desmarcado e não cadastra sem ele',()=>{
   const fixture=TestBed.createComponent(FormCadastro);
   fixture.componentInstance.cadastroModel.set({nome:'Maria',sobreNome:'Silva',email:'maria@example.test',senha:'SenhaDeTeste!123',cpf:'52998224725'});
   fixture.detectChanges();
   expect(fixture.nativeElement.querySelector('#aceite-termos').checked).toBe(false);
   expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
   fixture.componentInstance.cadastrar(new Event('submit') as SubmitEvent);
   requests.expectNone(environment.authUrl+'/auth/register');
   expect(fixture.componentInstance.erro()).toContain('Termos de Uso');
 });
 it('envia o aceite explícito e as versões ao servidor',()=>{
   const fixture=TestBed.createComponent(FormCadastro);
   fixture.componentInstance.cadastroModel.set({nome:'Maria',sobreNome:'Silva',email:'maria@example.test',senha:'SenhaDeTeste!123',cpf:'52998224725'});
   fixture.componentInstance.aceitouTermos.set(true);fixture.detectChanges();
   fixture.componentInstance.cadastrar(new Event('submit') as SubmitEvent);
   const request=requests.expectOne(environment.authUrl+'/auth/register');
   expect(request.request.body.acceptedTerms).toBe(true);
   expect(request.request.body.termsVersion).toBe('2026-10-01.1');
   expect(request.request.body.privacyVersion).toBe('2026-10-01.1');
   expect(request.request.body.cpf).toBe('52998224725');
   request.flush({},{status:400,statusText:'Bad Request'});
 });
 for(const role of ['CITIZEN','ADMIN','SUPREME']){
   it('verifica o papel '+role+' no servidor antes de liberar o painel',async()=>{
     const auth=TestBed.inject(UserService);
     auth.login('test@example.test','SenhaDeTeste!123').subscribe();
     const profile={id:'test-id',name:'Teste',email:'test@example.test',role,permissions:[],territoryId:null,active:true};
     requests.expectOne(environment.authUrl+'/auth/login').flush({accessToken:'a'.repeat(43),tokenType:'Bearer',expiresAt:Date.now()+60000,user:profile});
     const promise=firstValueFrom(TestBed.runInInjectionContext(()=>adminGuard({} as ActivatedRouteSnapshot,{url:'/admin/dashboard'} as RouterStateSnapshot)) as Observable<boolean|UrlTree>);
     requests.expectOne(environment.authUrl+'/auth/me').flush(profile);
     const result=await promise;
     if(role==='CITIZEN')expect(result instanceof UrlTree).toBe(true);else expect(result).toBe(true);
   });
 }
});
