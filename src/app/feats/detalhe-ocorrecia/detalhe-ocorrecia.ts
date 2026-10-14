import { Component, inject } from '@angular/core';
import { OccurrenceImage } from '../../shared/occurrence-image';
import { httpResource } from '@angular/common/http';
import { Ocorrencia } from '../ocorrencia';
import { environment } from '../../../environments/environment';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BottomNav } from '../../components/bottom-nav/bottom-nav';

@Component({
  imports: [BottomNav, RouterLink, OccurrenceImage],
  selector: 'app-detalhe-ocorrecia',
  styleUrl: './detalhe-ocorrecia.css',
  templateUrl: './detalhe-ocorrecia.html',
})
export class DetalheOcorrecia {
  private readonly urlApi = `${environment.apiUrl.replace(/\/+$/, '')}/ocorrencias`;
  private readonly route = inject(ActivatedRoute);

  protected readonly id = this.route.snapshot.paramMap.get('id');

  protected readonly ocorrenciaDetail = httpResource<Ocorrencia>(
    () => this.route.snapshot.queryParamMap.get('minhas') === 'true' ? `${this.urlApi}/minhas/${this.id}` : `${this.urlApi}/${this.id}`,
  );

  protected formatarData(valor: string): string {
    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return 'Data não informada';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(data);
  }

  protected formatarStatus(status?: Ocorrencia['status']): string {
    switch (status) {
      case 'EM_ANDAMENTO':
        return 'Em andamento';
      case 'RESOLVIDA':
        return 'Resolvida';
      default:
        return 'Pendente';
    }
  }

  protected classeStatus(status?: Ocorrencia['status']): string {
    return `status-${(status ?? 'PENDENTE').toLowerCase()}`;
  }

  protected etapaAtingida(status: Ocorrencia['status'] | undefined, etapa: number): boolean {
    const etapaAtual = {
      PENDENTE: 0,
      EM_ANDAMENTO: 1,
      RESOLVIDA: 2,
    }[status ?? 'PENDENTE'];

    return etapa <= etapaAtual;
  }
}
