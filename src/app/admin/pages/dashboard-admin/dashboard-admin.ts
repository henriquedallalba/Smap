import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AdminService, Occurrence } from '../../admin.service';

@Component({selector:'app-dashboard-admin',imports:[RouterLink],templateUrl:'./dashboard-admin.html',styleUrl:'../../admin-forms.css'})
export class DashboardAdmin {
 readonly service=inject(AdminService);
 readonly records=httpResource<Occurrence[]>(()=>this.service.apiBase+'/ocorrencias/admin',{defaultValue:[]});
 readonly pending=computed(()=>this.records.value().filter(o=>o.moderacao==='PENDENTE').length);
 readonly active=computed(()=>this.records.value().filter(o=>o.status==='EM_ANDAMENTO').length);
 readonly solved=computed(()=>this.records.value().filter(o=>o.status==='RESOLVIDA').length);
}
