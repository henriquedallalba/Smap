import { Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import * as L from 'leaflet';
import { AdminService, AdminDetail, Territory } from '../../admin.service';
import { OccurrenceImage } from '../../../shared/occurrence-image';

@Component({selector:'app-ocorrencia-detalhes',imports:[RouterLink,FormsModule,DatePipe,OccurrenceImage],templateUrl:'./ocorrencia-detalhe-admin.html',styleUrl:'../../admin-forms.css'})
export class OcorrenciaDetalhes implements OnDestroy {
 readonly service=inject(AdminService);
 private readonly route=inject(ActivatedRoute);
 readonly id=toSignal(this.route.paramMap.pipe(map(p=>Number(p.get('id')))),{initialValue:Number(this.route.snapshot.paramMap.get('id'))});
 readonly record=httpResource<AdminDetail>(()=>this.service.apiBase+'/ocorrencias/admin/'+this.id());
 readonly ocorrenciaResource=this.record;
 readonly current=computed(()=>this.record.value()?.ocorrencia);
 readonly ocorrencia=computed(()=>this.current());
 readonly protocolo=computed(()=>this.current()?.id ? `SMAP-${this.current()!.id}` : '');
 readonly formatadoEnviado=computed(()=>this.current()?.criadaEm ? new Date(this.current()!.criadaEm!).toLocaleString('pt-BR') : 'Data não informada');
 readonly territories=signal<Territory[]>([]);readonly error=signal('');readonly success=signal('');readonly busy=signal(false);
 reason='';status='EM_ANDAMENTO';banReason='';banTerritory='';
 readonly container=viewChild<ElementRef<HTMLDivElement>>('mapContainer');
 private map?:L.Map;private mapElement?:HTMLDivElement;private observer?:ResizeObserver;private marker?:L.CircleMarker;
 constructor(){
   this.service.territories().subscribe({next:t=>this.territories.set(t),error:e=>this.error.set(this.service.message(e))});
   effect(()=>{
     const el=this.container()?.nativeElement;const o=this.current();
     if(!el || !o){this.removeMap();return;}
     if(this.mapElement!==el){
       this.removeMap();this.mapElement=el;this.map=L.map(el).setView([-26.9184,-49.0656],11);
       L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(this.map);
       this.observer=new ResizeObserver(()=>this.map?.invalidateSize());this.observer.observe(el);
     }
     this.marker?.remove();
     const latitude=Number(o.latitude), longitude=Number(o.longitude);
     if(Number.isFinite(latitude) && Number.isFinite(longitude)){
       this.marker=L.circleMarker([latitude,longitude],{radius:9,color:'#087e70'}).addTo(this.map!);
       this.map?.setView([latitude,longitude],15);
     }
   });
 }
 ngOnDestroy(){this.removeMap();}
 private removeMap(){this.observer?.disconnect();this.map?.remove();this.map=undefined;this.mapElement=undefined;}
 moderate(action:string){
   if(this.busy())return;this.busy.set(true);this.error.set('');this.success.set('');
   this.service.moderate(this.id(),action,action==='CHANGE_STATUS'?this.status:undefined,action==='REJECT'?this.reason:undefined).subscribe({
     next:()=>{this.busy.set(false);this.success.set('Ocorrência atualizada.');this.record.reload();},
     error:e=>{this.busy.set(false);this.error.set(this.service.message(e));}});
 }
 link(){
   if(this.busy())return;this.busy.set(true);this.error.set('');
   this.service.link(this.id()).subscribe({next:()=>{this.busy.set(false);this.success.set('Território recalculado pelas coordenadas.');this.record.reload();},error:e=>{this.busy.set(false);this.error.set(this.service.message(e));}});
 }
 ban(){
   const author=this.record.value()?.autorId;
   if(!author || this.busy() || !confirm('Aplicar este banimento à conta autora?'))return;
   this.busy.set(true);this.error.set('');this.success.set('');
   this.service.ban(author,this.banTerritory||null,this.banReason).subscribe({next:()=>{this.busy.set(false);this.success.set('Banimento aplicado. Consulte Contas e segurança para revogá-lo.');this.banReason='';},error:e=>{this.busy.set(false);this.error.set(this.service.message(e));}});
 }
 territoryName(){return this.territories().find(t=>t.id===this.record.value()?.territorioId)?.name??'Sem território associado';}
}

