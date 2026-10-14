import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminService, Territory, Ban, Audit, PERMISSIONS } from '../../admin.service';
import { AuthProfile } from '../../../feats/profile user/user-service/user-service';

@Component({selector:'app-configuracoes-admin',imports:[FormsModule,DatePipe],templateUrl:'./configuracoes-admin.html',styleUrl:'../../admin-forms.css'})
export class ConfiguracoesAdmin {
 readonly service=inject(AdminService); readonly territories=signal<Territory[]>([]);readonly admins=signal<AuthProfile[]>([]);
 readonly bans=signal<Ban[]>([]);readonly audit=signal<Audit[]>([]);readonly error=signal('');readonly success=signal('');readonly busy=signal(false);
 readonly options=PERMISSIONS; name='';email='';password='';territoryId='';permissions:string[]=[];
 constructor(){this.load();}
 load(){
   this.service.territories().subscribe({next:t=>this.territories.set(t),error:e=>this.error.set(this.service.message(e))});
   this.service.admins().subscribe({next:a=>this.admins.set(a),error:e=>this.error.set(this.service.message(e))});
   if(this.service.can('BAN'))this.service.bans().subscribe({next:b=>this.bans.set(b),error:e=>this.error.set(this.service.message(e))});
   if(this.service.supreme())this.service.audit().subscribe({next:a=>this.audit.set(a),error:e=>this.error.set(this.service.message(e))});
 }
 territory(id:string|null){return this.territories().find(t=>t.id===id)?.name??(id?'Área indisponível':'Global');}
 toggle(id:string,checked:boolean){this.permissions=checked?[...this.permissions,id]:this.permissions.filter(p=>p!==id);}
 create(){
   if(this.busy())return;this.busy.set(true);this.error.set('');this.success.set('');
   this.service.createAdmin({name:this.name,email:this.email,password:this.password,territoryId:this.territoryId,permissions:this.permissions}).subscribe({
     next:()=>{this.busy.set(false);this.password='';this.name='';this.email='';this.permissions=[];this.success.set('Conta administrativa criada. Entregue a senha por um canal seguro.');this.load();},
     error:e=>{this.busy.set(false);this.error.set(this.service.message(e));}});
 }
 disable(id:string){
   if(this.busy() || !confirm('Desativar esta conta? Os acessos das contas delegadas por ela também serão bloqueados.'))return;
   this.busy.set(true);this.service.disable(id).subscribe({next:()=>{this.busy.set(false);this.success.set('Conta desativada.');this.load();},error:e=>{this.busy.set(false);this.error.set(this.service.message(e));}});
 }
 revoke(id:string){
   if(this.busy() || !confirm('Revogar este banimento?'))return;
   this.busy.set(true);this.service.revoke(id).subscribe({next:()=>{this.busy.set(false);this.success.set('Banimento revogado.');this.load();},error:e=>{this.busy.set(false);this.error.set(this.service.message(e));}});
 }
}
