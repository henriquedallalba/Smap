import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, map, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { FormsModule, NgForm } from '@angular/forms';
import { Header } from '../../component/header/header';
import { Ocorrencia } from '../../feats/ocorrencia';
import { ConsumoApi } from '../../feats/posts/consumo-api';
import { BottomNav } from '../../components/bottom-nav/bottom-nav';
import { UserService } from '../../feats/profile user/user-service/user-service';
import { OccurrenceImage } from '../../shared/occurrence-image';

@Component({
  selector: 'app-mapa',
  imports: [FormsModule, Header, BottomNav, OccurrenceImage],
  templateUrl: './mapa.html',
  styleUrl: './mapa.css',
})
export class Mapa implements AfterViewInit, OnDestroy {
  private readonly centroBlumenau: L.LatLngTuple = [-26.9187, -49.0661];

  readonly consumoService = inject(ConsumoApi);
  readonly router = inject(Router);
  private readonly auth = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  ocorrenciaModel = signal<Ocorrencia>({
    categoria: '',
    descricao: '',
    latitude: 0,
    longitude: 0,
    criadaEm: '',
    titulo: '',
    localizacao: '',
    imagemUrl: null,
  });

  @ViewChild('mapContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  protected readonly tileError = signal(false);
  readonly categorias = ['Vias públicas', 'Iluminação', 'Lixo e limpeza', 'Alagamento', 'Sinalização', 'Acessibilidade', 'Outros'];
  readonly ponto = signal<{ latitude: number; longitude: number; precisao?: number } | null>(null);
  readonly localizando = signal(false);
  readonly mensagem = signal('');
  readonly erro = signal('');
  readonly erroCarregamento = signal('');
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly processandoImagem = signal(false);
  readonly arquivoImagem = signal<File | null>(null);
  readonly imagemPreviewUrl = signal<string | null>(null);
  readonly imagemInfo = signal('');
  readonly ocorrencias = signal<Ocorrencia[]>([]);
  private selecao?: L.CircleMarker;
  private registros = L.layerGroup();
  private requestId = 0;
  private destroyed = false;
  private map?: L.Map;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement).setView(this.centroBlumenau, 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .on('tileerror', () => this.tileError.set(true))
      .addTo(this.map);
    this.registros.addTo(this.map);
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.requestId++;
      this.localizando.set(false);
      this.selecionar(event.latlng.lat, event.latlng.wrap().lng);
    });
    this.carregar();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(this.mapContainer.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.requestId++;
    this.resizeObserver?.disconnect();
    this.revogarPreview();
    this.map?.remove();
  }

  async selecionarImagem(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) return;

    this.erro.set('');
    this.mensagem.set('');

    if (!arquivo.type.startsWith('image/')) {
      this.erro.set('Selecione um arquivo de imagem válido.');
      input.value = '';
      return;
    }

    if (arquivo.size > 20 * 1024 * 1024) {
      this.erro.set('A imagem original deve ter no máximo 20 MB.');
      input.value = '';
      return;
    }

    this.processandoImagem.set(true);

    try {
      const compactada = await this.compactarImagem(arquivo);
      this.arquivoImagem.set(compactada);
      this.revogarPreview();
      this.imagemPreviewUrl.set(URL.createObjectURL(compactada));
      this.imagemInfo.set(
        `${arquivo.name} · ${this.formatarTamanho(arquivo.size)} → ${this.formatarTamanho(compactada.size)}`,
      );
    } catch {
      this.arquivoImagem.set(null);
      this.revogarPreview();
      this.imagemInfo.set('');
      this.erro.set('Não foi possível preparar esta imagem. Tente uma foto em JPEG, PNG ou WebP.');
      input.value = '';
    } finally {
      this.processandoImagem.set(false);
    }
  }

  removerImagem(...inputs: HTMLInputElement[]): void {
    this.arquivoImagem.set(null);
    this.imagemInfo.set('');
    this.revogarPreview();
    for (const input of inputs) input.value = '';
  }

  localizar(): void {
    this.erro.set('');
    this.mensagem.set('');
    if (!navigator.geolocation) {
      this.erro.set('Seu navegador não oferece localização. Selecione um ponto no mapa.');
      return;
    }
    const request = ++this.requestId;
    this.localizando.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (this.destroyed || request !== this.requestId) return;
        this.localizando.set(false);
        this.selecionar(coords.latitude, coords.longitude, coords.accuracy);
        this.map?.setView([coords.latitude, coords.longitude], 16);
      },
      (error) => {
        if (this.destroyed || request !== this.requestId) return;
        this.localizando.set(false);
        this.erro.set(error.code === 1
          ? 'Permissão de localização negada. Escolha o ponto no mapa ou habilite a permissão no navegador.'
          : 'Não foi possível obter sua localização. Tente novamente ou escolha o ponto no mapa.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  private selecionar(latitude: number, longitude: number, precisao?: number): void {
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
      this.erro.set('Selecione um ponto válido no mapa.');
      return;
    }
    this.ponto.set({ latitude, longitude, precisao });
    this.erro.set('');
    this.mensagem.set('');
    this.selecao?.remove();
    this.selecao = L.circleMarker([latitude, longitude], {
      radius: 10, color: '#175cd3', fillOpacity: 0.5, interactive: false,
    }).addTo(this.map!);
  }

  cadastrar(form: NgForm, event?: SubmitEvent): void {
    if (event) {
      event.preventDefault();
    }
    if (this.salvando()) return;
    if (!this.auth.token()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/registrar-ocorrencia' } });
      return;
    }

    this.erro.set('');
    this.mensagem.set('');

    const ponto = this.ponto();
    const dados = this.ocorrenciaModel();

    // 1. Validação dos campos e da seleção de mapa
    if (form.invalid || !ponto || !dados.titulo.trim() || !dados.localizacao.trim() || !this.categorias.includes(dados.categoria) || dados.descricao.trim().length < 10 || dados.descricao.length > 1000) {
      form.control.markAllAsTouched();
      this.erro.set('Preencha os campos obrigatórios (descrição com no mínimo 10 caracteres) e selecione um ponto no mapa.');
      return;
    }

    // 2. Monta o objeto completo incluindo todos os campos da interface Ocorrencia
    const registro: Ocorrencia = {
      ...dados,
      titulo: dados.titulo.trim(),
      localizacao: dados.localizacao.trim(),
      descricao: dados.descricao.trim(),
      imagemUrl: dados.imagemUrl?.trim() || null,
      latitude: ponto.latitude,
      longitude: ponto.longitude,
      criadaEm: new Date().toISOString(),
    };

    // 3. Executa a requisição HTTP
    this.salvando.set(true);
    const arquivo = this.arquivoImagem();
    const cadastro$ = arquivo
      ? this.consumoService.enviarImagem(arquivo).pipe(
          map(({ url }) => ({ ...registro, imagemUrl: url })),
          switchMap((registroComImagem) => this.consumoService.cadastrarOcorrencia(registroComImagem)),
        )
      : this.consumoService.cadastrarOcorrencia(registro);

    cadastro$.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.salvando.set(false)),
    ).subscribe({
      next: (response) => {
        
          this.router.navigate(['/confirmacao-ocorrencia', response.id]);


      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.auth.limparSessao();
          void this.router.navigate(['/login'], { queryParams: { returnUrl: '/registrar-ocorrencia' } });
          return;
        }
        this.erro.set(error.status === 0
          ? 'Não foi possível conectar à API. Verifique se o servidor está disponível e tente novamente.'
          : error.status === 503
            ? 'O serviço de autenticação está indisponível. Seus dados continuam aqui; tente novamente.'
          : error.status === 413
            ? 'A imagem ficou maior que o limite aceito pela API.'
            : 'O servidor não conseguiu salvar a ocorrência. Confira os dados e tente novamente.');
      }

    });
  }

  carregar(): void {
    if (this.carregando()) return;
    this.carregando.set(true);
    this.erroCarregamento.set('');
    this.consumoService.listarOcorrencias().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.carregando.set(false)),
    ).subscribe({
      next: (registros) => {
        if (!Array.isArray(registros)) {
          this.erroCarregamento.set('A API retornou uma lista de ocorrências em formato inesperado.');
          return;
        }
        this.ocorrencias.set(registros.filter((item) => item != null));
        this.renderizar();
        const pontos = this.ocorrencias().filter((item) =>
          this.temCoordenadas(item) && this.estaEmBlumenau(item.latitude, item.longitude));
        if (pontos.length) {
          this.map?.fitBounds(pontos.map((o) => [o.latitude!, o.longitude!] as L.LatLngTuple),
            { maxZoom: 16, padding: [24, 24] });
        }
      },
      error: () => this.erroCarregamento.set('Não foi possível carregar as ocorrências da API. Tente novamente quando o servidor estiver disponível.'),
    });
  }

  private temCoordenadas(registro: Ocorrencia): registro is Ocorrencia & { latitude: number; longitude: number } {
    return Number.isFinite(registro.latitude) && Math.abs(registro.latitude!) <= 90 &&
      Number.isFinite(registro.longitude) && Math.abs(registro.longitude!) <= 180;
  }

  private estaEmBlumenau(latitude: number, longitude: number): boolean {
    return latitude >= -27.05 && latitude <= -26.75 &&
      longitude >= -49.25 && longitude <= -48.95;
  }

  private renderizar(): void {
    this.registros.clearLayers();
    for (const registro of this.ocorrencias()) {
      if (this.temCoordenadas(registro)) {
        const popup = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = registro.titulo || registro.categoria;
        const description = document.createElement('p');
        description.textContent = registro.descricao;
        if (registro.imagemUrl) {
          const image = document.createElement('img');
          image.src = registro.imagemUrl;
          image.alt = `Imagem da ocorrência: ${registro.titulo}`;
          image.className = 'map-popup-image';
          image.addEventListener('error', () => image.remove());
          popup.appendChild(image);
        }
        popup.append(title, description);

        L.circleMarker([registro.latitude, registro.longitude], {
          radius: 9, color: '#13795b', fillOpacity: 0.8, bubblingMouseEvents: false,
        }).bindPopup(popup).addTo(this.registros);
      }
    }
  }

  private async compactarImagem(arquivo: File): Promise<File> {
    const imagemUrl = URL.createObjectURL(arquivo);
    const imagem = new Image();

    try {
      await new Promise<void>((resolve, reject) => {
        imagem.onload = () => resolve();
        imagem.onerror = () => reject(new Error('Formato de imagem não suportado'));
        imagem.src = imagemUrl;
      });
    } finally {
      URL.revokeObjectURL(imagemUrl);
    }

    const maiorLado = Math.max(imagem.naturalWidth, imagem.naturalHeight);
    const escala = Math.min(1, 1440 / maiorLado);
    const largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
    const altura = Math.max(1, Math.round(imagem.naturalHeight * escala));
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;

    const contexto = canvas.getContext('2d');
    if (!contexto) {
      throw new Error('Canvas indisponível');
    }

    contexto.drawImage(imagem, 0, 0, largura, altura);

    let qualidade = 0.78;
    let resultado = await this.canvasParaBlob(canvas, qualidade);

    while (resultado.size > 900 * 1024 && qualidade > 0.48) {
      qualidade -= 0.1;
      resultado = await this.canvasParaBlob(canvas, qualidade);
    }

    const nomeBase = arquivo.name.replace(/\.[^.]+$/, '') || 'ocorrencia';
    return new File([resultado], `${nomeBase}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }

  private canvasParaBlob(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Falha ao compactar imagem')),
        'image/jpeg',
        qualidade,
      );
    });
  }

  private formatarTamanho(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private revogarPreview(): void {
    const url = this.imagemPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.imagemPreviewUrl.set(null);
  }
}

