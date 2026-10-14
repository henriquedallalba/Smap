import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AdminService, Occurrence } from '../../admin.service';
import { OccurrenceImage } from '../../../shared/occurrence-image';

@Component({selector:'app-ocorrencias-admin',imports:[RouterLink,DatePipe,OccurrenceImage],templateUrl:'./ocorrencias-admin.html',styleUrl:'../../admin-forms.css'})
export class OcorrenciasAdmin {
 readonly service=inject(AdminService);
 readonly records=httpResource<Occurrence[]>(()=>this.service.apiBase+'/ocorrencias/admin',{defaultValue:[]});
 readonly query=signal('');readonly moderation=signal('');readonly status=signal('');
 readonly filtered=computed(()=>this.records.value().filter(o=>
   (!this.moderation() || (o.moderacao??'APROVADA')===this.moderation()) && (!this.status() || o.status===this.status()) &&
   [o.titulo,o.descricao,o.localizacao,o.categoria,String(o.id)].some(v=>(v??'').toString().toLowerCase().includes(this.query().toLowerCase()))
 ).sort((a,b)=>b.id-a.id));
 readonly pending=computed(()=>this.records.value().filter(o=>o.moderacao==='PENDENTE').length);
 readonly approved=computed(()=>this.records.value().filter(o=>(o.moderacao??'APROVADA')==='APROVADA').length);
 readonly rejected=computed(()=>this.records.value().filter(o=>o.moderacao==='REJEITADA').length);
 readonly page=signal(1);
 readonly pages=computed(()=>Math.max(1,Math.ceil(this.filtered().length/20)));
 readonly visible=computed(()=>this.filtered().slice((Math.min(this.page(),this.pages())-1)*20,Math.min(this.page(),this.pages())*20));
}

