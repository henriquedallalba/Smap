import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, Point, Territory } from '../../admin.service';
import * as L from 'leaflet';

@Component({ selector:'app-regioes-admin', imports:[FormsModule], templateUrl:'./regioes-admin.html', styleUrl:'../../admin-forms.css' })
export class RegioesAdmin implements AfterViewInit, OnDestroy {
 readonly service=inject(AdminService);
 readonly territories=signal<Territory[]>([]);
 readonly error=signal(''); readonly success=signal(''); readonly busy=signal(false);
 readonly points=signal<Point[]>([]);
 name=''; kind:'REGION'|'CITY'|'NEIGHBORHOOD'='CITY'; externalCode=''; parentId=''; selected='';
 @ViewChild('mapContainer') container!:ElementRef<HTMLDivElement>;
 private map?:L.Map; private drawings=L.layerGroup(); private observer?:ResizeObserver;
 constructor(){ this.load(); }
 load(){this.service.territories().subscribe({next:t=>{this.territories.set(t);this.draw();},error:e=>this.error.set(this.service.message(e))});}
 ngAfterViewInit(){
   this.map=L.map(this.container.nativeElement).setView([-26.9184,-49.0656],11);
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(this.map);
   this.drawings.addTo(this.map);
   this.map.on('click',(event:L.LeafletMouseEvent)=>{if(this.service.supreme() && this.selected){this.points.update(p=>[...p,{latitude:event.latlng.lat,longitude:event.latlng.lng}]);this.draw();}});
   this.observer=new ResizeObserver(()=>this.map?.invalidateSize());this.observer.observe(this.container.nativeElement);this.draw();
 }
 ngOnDestroy(){this.observer?.disconnect();this.map?.remove();}
 choose(id:string){this.selected=id;this.points.set(this.territories().find(t=>t.id===id)?.boundary??[]);this.draw();
   const p=this.points(); if(p.length)this.map?.fitBounds(p.map(x=>[x.latitude,x.longitude] as L.LatLngTuple),{padding:[20,20]});}
 clear(){this.points.set([]);this.draw();}
 undo(){this.points.update(p=>p.slice(0,-1));this.draw();}
 private draw(){
   this.drawings.clearLayers();
   for(const t of this.territories())if(t.boundary?.length>=3)L.polygon(t.boundary.map(p=>[p.latitude,p.longitude] as L.LatLngTuple),{color:t.id===this.selected?'#087e70':'#879eaa',fillOpacity:.08}).bindTooltip(document.createTextNode(t.name) as any).addTo(this.drawings);
   const p=this.points();if(p.length>=3)L.polygon(p.map(x=>[x.latitude,x.longitude] as L.LatLngTuple),{color:'#ef8b22'}).addTo(this.drawings);
   for(const x of p)L.circleMarker([x.latitude,x.longitude],{radius:4,color:'#087e70'}).addTo(this.drawings);
 }
 create(){if(this.busy())return;this.busy.set(true);this.error.set('');this.success.set('');
   this.service.createTerritory({name:this.name,kind:this.kind,externalCode:this.externalCode,parentId:this.parentId||null}).subscribe({
     next:t=>{this.busy.set(false);this.name='';this.externalCode='';this.load();this.choose(t.id);this.success.set('Território criado. Defina seu limite no mapa.');},
     error:e=>{this.busy.set(false);this.error.set(this.service.message(e));}});
 }
 save(){if(this.busy())return;this.busy.set(true);this.error.set('');this.success.set('');
   this.service.boundary(this.selected,this.points()).subscribe({next:()=>{this.busy.set(false);this.load();this.success.set('Limite salvo. Novas ocorrências serão vinculadas pelas coordenadas.');},error:e=>{this.busy.set(false);this.error.set(this.service.message(e));}});
 }
}
