import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserService, AuthProfile } from '../feats/profile user/user-service/user-service';

export interface Point { latitude: number; longitude: number; }
export interface Territory { id: string; name: string; kind: 'REGION'|'CITY'|'NEIGHBORHOOD'; externalCode: string; parentId: string|null; boundary: Point[]; }
export interface Occurrence {
 id: number; titulo: string; descricao: string; categoria: string; localizacao: string;
 latitude: number|string|null; longitude: number|string|null; criadaEm: string|null; imagemUrl?: string|null;
 status: string; moderacao: string|null; motivoModeracao?: string|null;
}
export interface HistoryEvent { id:number; administradorId:string; acao:string; motivo:string|null; data:string; }
export interface AdminDetail { historico?: HistoryEvent[]; ocorrencia: Occurrence; territorioId: string|null; autorId?: string; }
export interface Ban { id:string; accountId:string; territoryId:string|null; reason:string; createdAt:number; revokedAt:number|null; }
export interface Audit { id:string; actorId:string; action:string; targetId:string; occurredAt:number; }
export const PERMISSIONS = [
 {id:'APPROVE',label:'Aprovar'}, {id:'REJECT',label:'Recusar'}, {id:'CHANGE_STATUS',label:'Alterar status'},
 {id:'VIEW_AUTHOR',label:'Identificar autor'}, {id:'DELEGATE',label:'Delegar contas'}, {id:'BAN',label:'Banir na área'},
];
@Injectable({providedIn:'root'})
export class AdminService {
 private readonly http=inject(HttpClient);
 readonly auth=inject(UserService);
 readonly authBase=environment.authUrl.replace(/\/+$/,'');
 readonly apiBase=environment.apiUrl.replace(/\/+$/,'');
 supreme() { return this.auth.usuarioLogado()?.role==='SUPREME'; }
 can(permission:string) { return this.supreme() || !!this.auth.usuarioLogado()?.permissions.includes(permission); }
 territories() { return this.http.get<Territory[]>(this.authBase+'/territories').pipe(timeout(12000)); }
 admins() { return this.http.get<AuthProfile[]>(this.authBase+'/admins').pipe(timeout(12000)); }
 createTerritory(body:unknown) { return this.http.post<Territory>(this.authBase+'/territories',body).pipe(timeout(12000)); }
 boundary(id:string,boundary:Point[]) { return this.http.post<Territory>(this.authBase+'/territories/'+id+'/boundary',{boundary}).pipe(timeout(12000)); }
 createAdmin(body:unknown) { return this.http.post<AuthProfile>(this.authBase+'/admins',body).pipe(timeout(12000)); }
 disable(id:string) { return this.http.delete<void>(this.authBase+'/admins/'+id).pipe(timeout(12000)); }
 bans() { return this.http.get<Ban[]>(this.authBase+'/bans').pipe(timeout(12000)); }
 ban(accountId:string,territoryId:string|null,reason:string) { return this.http.post<Ban>(this.authBase+'/bans',{accountId,territoryId,reason}).pipe(timeout(12000)); }
 revoke(id:string) { return this.http.delete<void>(this.authBase+'/bans/'+id).pipe(timeout(12000)); }
 audit() { return this.http.get<Audit[]>(this.authBase+'/audit').pipe(timeout(12000)); }
 moderate(id:number,action:string,status?:string,reason?:string) { return this.http.post<Occurrence>(this.apiBase+'/ocorrencias/admin/'+id+'/moderar',{action,status,reason}).pipe(timeout(12000)); }
 link(id:number) { return this.http.post<Occurrence>(this.apiBase+'/ocorrencias/admin/'+id+'/vincular',{}).pipe(timeout(12000)); }
 labelModeracao(value:string|null|undefined) { return value==='PENDENTE'?'Aguardando aprovação':value==='REJEITADA'?'Recusada':'Publicada'; }
 labelStatus(value:string|null|undefined) { return value==='EM_ANDAMENTO'?'Em andamento':value==='RESOLVIDA'?'Resolvida':'Pendente'; }
 message(error:any) {
   return error?.status===403 ? 'Sem permissão para esta ação ou território.'
    : error?.status===401 ? 'Sua sessão expirou. Entre novamente.'
    : error?.status===409 ? 'Operação incompatível com o estado atual ou cadastro duplicado.'
    : error?.status===400 ? (error.error?.message || 'Confira os campos e os limites territoriais.')
    : 'Não foi possível concluir. Confira se as APIs estão disponíveis e tente novamente.';
 }
}

