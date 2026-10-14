import { Component, inject } from '@angular/core';
import { OccurrenceImage } from '../../shared/occurrence-image';
import { httpResource } from '@angular/common/http';
import { UserService } from '../profile user/user-service/user-service';
import { Ocorrencia } from '../ocorrencia';
import { environment } from '../../../environments/environment';
import { Header } from '../../component/header/header';
import { RouterLink } from '@angular/router';
import { BottomNav } from '../../components/bottom-nav/bottom-nav';

@Component({
  imports: [RouterLink, BottomNav, Header, OccurrenceImage],
  selector: 'app-ocorrencias-registradas',
  styleUrl: './ocorrencias-registradas.css',
  templateUrl: './ocorrencias-registradas.html',
})
export class OcorrenciasRegistradas {

  readonly auth = inject(UserService);
  readonly minhas = httpResource<Ocorrencia[]>(() => this.auth.usuarioLogado() ? {
    url: environment.apiUrl.replace(/\/+$/, '') + '/ocorrencias/minhas',
    headers: { Authorization: 'Bearer ' + this.auth.token() },
  } : undefined, { defaultValue: [] });

}
