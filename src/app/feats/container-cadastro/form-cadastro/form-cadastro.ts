import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { email, form, maxLength, minLength, required, FormField } from '@angular/forms/signals';
import { finalize } from 'rxjs';
import { UserService } from '../../profile user/user-service/user-service';
import { destinoAposLogin } from '../../../auth/auth.guard';

@Component({
  imports: [FormField, RouterLink],
  selector: 'app-form-cadastro',
  styleUrl: './form-cadastro.css',
  templateUrl: './form-cadastro.html',
})
export class FormCadastro {
  cadastroModel = signal({ nome: '', sobreNome: '', email: '', senha: '', cpf: '' });
  private usuarioService = inject(UserService);
  private router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly aceitouTermos = signal(false);
  cadastroForm = form(this.cadastroModel, path => {
    required(path.nome); required(path.sobreNome); required(path.email); required(path.senha);
    required(path.cpf); maxLength(path.cpf, 18);
    email(path.email);
    maxLength(path.nome, 59); maxLength(path.sobreNome, 60); maxLength(path.email, 254);
    minLength(path.senha, 12, { message: 'Use pelo menos 12 caracteres.' });
    maxLength(path.senha, 72, { message: 'Use no máximo 72 caracteres.' });
  });

  cadastrar(event: SubmitEvent) {
    event.preventDefault();
    if (this.carregando()) return;
    if (!this.aceitouTermos()) { this.erro.set('Para criar sua conta, leia e aceite os Termos de Uso e a Política de Privacidade.'); return; }
    if (this.cadastroForm().invalid()) return;
    if (new TextEncoder().encode(this.cadastroModel().senha).length > 72) {
      this.erro.set('A senha é muito longa. Reduza a quantidade de caracteres ou emojis.');
      return;
    }
    this.erro.set('');
    this.carregando.set(true);
    this.usuarioService.cadastrar({ ...this.cadastroModel(), acceptedTerms: this.aceitouTermos() }).pipe(
      finalize(() => this.carregando.set(false)),
    ).subscribe({
      next: () => {
        this.cadastroForm().reset();
        void this.router.navigate(['/login'], { queryParams: {
          cadastro: 'sucesso', returnUrl: destinoAposLogin(this.route.snapshot.queryParamMap.get('returnUrl')),
        } });
      },
      error: error => this.erro.set(error.status === 409 ? 'Este e-mail já está cadastrado. Entre na sua conta.'
        : error.status === 400 ? 'Confira o nome, e-mail, senha, CPF e o aceite dos termos informados.'
        : error.status === 429 ? 'Muitas tentativas. Aguarde um minuto.'
        : 'Não foi possível criar sua conta. Tente novamente.'),
    });
  }
}
