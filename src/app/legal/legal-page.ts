import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LEGAL_DOCUMENTS } from './legal-documents';

@Component({
  selector: 'app-legal-page', imports: [RouterLink],
  template: '<main class="legal-page"><nav><a routerLink="/home">SMAP</a><a routerLink="/cadastro">Voltar ao cadastro</a><a routerLink="/termos">Termos de Uso</a><a routerLink="/privacidade">Privacidade</a></nav><article [innerHTML]="document"></article></main>',
  styleUrl: './legal-page.css',
})
export class LegalPage {
  readonly document = inject(ActivatedRoute).snapshot.data['document'] === 'privacy' ? LEGAL_DOCUMENTS.privacy : LEGAL_DOCUMENTS.terms;
}
