import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';

interface OcorrenciaApi {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  localizacao: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  criadaEm?: string | null;
  // ⚠️ ADICIONAR quando API tiver:
  status?: string;
  moderacao?: string;
  // prioridade?: string;
}

interface CategoriaLegenda {
  nome: string;
  cor: string;
  icone: string;
}

@Component({
  selector: 'app-mapa-admin',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mapa-admin.html',
  styleUrl: './mapa-admin.css',
})
export class MapaAdmin implements AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl.replace(/\/+$/, '')}/ocorrencias/admin`;

  @ViewChild('mapContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private resizeObserver?: ResizeObserver;
  private registros = L.layerGroup();

  // ===== ESTADO =====
  protected readonly ocorrencias = signal<OcorrenciaApi[]>([]);
  protected readonly carregando = signal(true);
  protected readonly comErro = signal(false);
  protected readonly selecionadaId = signal<number | null>(null);

  // ===== FILTROS =====
  protected readonly filtroBusca = signal('');
  protected readonly filtroPrioridade = signal('');
  protected readonly filtroStatus = signal('');
  protected readonly filtroCategoria = signal('');

  // ===== CORES POR CATEGORIA (extraídas do Print 1) =====
  protected readonly categoriasLegenda: CategoriaLegenda[] = [
    { nome: 'Buraco', cor: '#8B5E3C', icone: '🕳️' },
    { nome: 'Iluminação', cor: '#F59E0B', icone: '💡' },
    { nome: 'Sinalização', cor: '#EF4444', icone: '🚦' },
    { nome: 'Saneamento', cor: '#3B82F6', icone: '💧' },
  ];

  private readonly coresCategoria: Record<string, string> = {
    buraco: '#8B5E3C',
    asfalto: '#8B5E3C',
    iluminacao: '#F59E0B',
    iluminação: '#F59E0B',
    sinalizacao: '#EF4444',
    sinalização: '#EF4444',
    saneamento: '#3B82F6',
    esgoto: '#3B82F6',
    vazamento: '#3B82F6',
    lixo: '#7C8B3A',
    entulho: '#F97316',
    arvore: '#10B981',
    árvore: '#10B981',
    acessibilidade: '#8B5CF6',
  };

  // ===== COMPUTED =====
  protected readonly comCoordenadas = computed(() =>
    this.ocorrencias().filter(
      (o) =>
        Number.isFinite(Number(o.latitude)) && Number.isFinite(Number(o.longitude)) &&
        Math.abs(Number(o.latitude)) <= 90 && Math.abs(Number(o.longitude)) <= 180,
    ),
  );

  protected readonly ocorrenciasFiltradas = computed(() => {
    let lista = this.comCoordenadas();

    const busca = this.filtroBusca().toLowerCase().trim();
    if (busca) {
      lista = lista.filter(
        (o) =>
          o.titulo.toLowerCase().includes(busca) ||
          o.descricao.toLowerCase().includes(busca) ||
          o.localizacao.toLowerCase().includes(busca),
      );
    }

    if (this.filtroCategoria()) {
      lista = lista.filter((o) =>
        o.categoria?.toLowerCase().includes(this.filtroCategoria().toLowerCase()),
      );
    }

    if(this.filtroStatus()) lista=lista.filter(o=>o.status===this.filtroStatus());
    return lista;
  });

  protected readonly semCoordenadas = computed(
    () => this.ocorrencias().length - this.comCoordenadas().length,
  );

  protected readonly recentes = computed(() =>
    [...this.ocorrenciasFiltradas()]
      .sort((a, b) => (b.criadaEm ?? '').localeCompare(a.criadaEm ?? ''))
      .slice(0, 5),
  );

  protected readonly statusResumo = computed(() => {
    const list=this.ocorrenciasFiltradas();
    return {total:list.length,altaPrioridade:list.filter(o=>o.moderacao==='PENDENTE').length,
      emExecucao:list.filter(o=>o.status==='EM_ANDAMENTO').length,concluidos:list.filter(o=>o.status==='RESOLVIDA').length};
  });
  protected readonly regiaoAtual = computed(() => 'Seu território administrativo');

  constructor() {
    this.carregar();
  }

  // ===== LIFECYCLE =====
  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false, // vamos reposicionar
      attributionControl: false,
    }).setView([-26.92, -49.07], 13);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    this.registros.addTo(this.map);
    this.renderizar();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(this.mapContainer.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  // ===== HELPERS =====
  protected corDaCategoria(categoria: string): string {
    const chave = Object.keys(this.coresCategoria).find((k) =>
      categoria?.toLowerCase().includes(k),
    );
    return chave ? this.coresCategoria[chave] : '#6B7280';
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.comErro.set(false);

    this.http.get<OcorrenciaApi[]>(this.apiBase).subscribe({
      next: (dados) => {
        this.ocorrencias.set(dados);
        this.carregando.set(false);
        this.renderizar();
      },
      error: () => {
        this.carregando.set(false);
        this.comErro.set(true);
      },
    });
  }

  protected focar(ocorrencia: OcorrenciaApi): void {
    const latitude=Number(ocorrencia.latitude), longitude=Number(ocorrencia.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }
    this.selecionadaId.set(ocorrencia.id);
    this.map?.setView([latitude, longitude], 16);
  }

  protected limparFiltros(): void {
    this.filtroBusca.set('');
    this.filtroPrioridade.set('');
    this.filtroStatus.set('');
    this.filtroCategoria.set('');
    this.renderizar();
  }

  protected alternarFullscreen(): void {
    const el = document.querySelector('.mapa-wrapper');
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  protected recarregarMapa(): void {
    this.renderizar();
  }

  // ===== RENDERIZAÇÃO =====
  private renderizar(): void {
    this.registros.clearLayers();

    for (const ocorrencia of this.ocorrenciasFiltradas()) {
      const cor = this.corDaCategoria(ocorrencia.categoria);

      const popup = document.createElement('div');
      popup.className = 'popup-ocorrencia';
      const title=document.createElement('strong');title.textContent='#'+ocorrencia.id+' '+ocorrencia.titulo;
      const location=document.createElement('p');location.textContent=ocorrencia.categoria+' — '+ocorrencia.localizacao;
      const description=document.createElement('p');description.textContent=ocorrencia.descricao;
      popup.append(title,location,description);

      const marcador = L.circleMarker(
          [Number(ocorrencia.latitude), Number(ocorrencia.longitude)],
        {
          radius: 10,
          color: cor,
          fillColor: cor,
          fillOpacity: 0.9,
          weight: 2,
          bubblingMouseEvents: false,
        },
      )
        .bindPopup(popup)
        .addTo(this.registros);

      marcador.on('click', () => this.selecionadaId.set(ocorrencia.id));
    }

    if (this.ocorrenciasFiltradas().length > 0) {
      this.map?.fitBounds(
        this.ocorrenciasFiltradas().map(
          (o) => [Number(o.latitude), Number(o.longitude)] as L.LatLngTuple,
        ),
        { maxZoom: 15, padding: [60, 60] },
      );
    }
  }
}
