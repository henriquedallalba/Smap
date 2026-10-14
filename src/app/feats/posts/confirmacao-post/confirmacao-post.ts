import { Component, computed, inject } from '@angular/core';
import { ConsumoApi } from '../consumo-api';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Ocorrencia } from '../../ocorrencia';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  imports: [RouterLink],
  selector: 'app-confirmacao-post',
  styleUrl: './confirmacao-post.css',
  templateUrl: './confirmacao-post.html',
})
export class ConfirmacaoPost {

  protected consumoService = inject(ConsumoApi)
  private readonly urlApi = `${environment.apiUrl.replace(/\/+$/, '')}/ocorrencias`;

  private route = inject(ActivatedRoute);

  


  // colocando o valor do ID na variavel id
  id = this.route.snapshot.paramMap.get('id')
  
  // metodo get
   readonly ocorrenciaDetail = httpResource<Ocorrencia>(
        () => this.urlApi+'/minhas/'+ this.id
    )



}
