import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { destinoAposLogin } from '../../../auth/auth.guard';
import { LoginInterface } from './login-interface';
import { email, form, required, FormField } from '@angular/forms/signals';
import { UserService } from '../../profile user/user-service/user-service';

@Component({
  imports: [RouterLink, FormField],
  selector: 'app-form-login',
  styleUrl: './form-login.css',
  templateUrl: './form-login.html',
})
export class FormLogin {
  loginModel = signal<LoginInterface>({
    email: '',
    senha: '',
  });

  private usuarioService = inject(UserService);
  private router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly codigo = signal('');
  readonly carregando = signal(false);
  readonly erro = signal('');

  loginForm = form(this.loginModel, (schemaPath) => {
    required(schemaPath.email, { message: 'Informe seu e-mail.' });
    email(schemaPath.email, { message: 'Informe um e-mail válido.' });
    required(schemaPath.senha, { message: 'Informe sua senha.' });
  });

  fazerLogin(event: SubmitEvent) {
    event.preventDefault();
    if (this.carregando()) return;
    if (this.loginForm().invalid()) {
      this.loginForm.email().markAsTouched();
      this.loginForm.senha().markAsTouched();
      return;
    }
    this.erro.set('');
    this.carregando.set(true);
    this.usuarioService.login(this.loginModel().email, this.loginModel().senha, this.codigo())
      .pipe(finalize(() => this.carregando.set(false))).subscribe({
        next: () => {
          this.loginModel.update(value => ({ ...value, senha: '' }));
          this.codigo.set('');
          void this.router.navigateByUrl(destinoAposLogin(this.route.snapshot.queryParamMap.get('returnUrl')));
        },
        error: error => this.erro.set(error.status === 401
          ? 'E-mail, senha ou código inválidos, ou conta temporariamente bloqueada.'
          : error.status === 429 ? 'Muitas tentativas. Aguarde um minuto e tente novamente.'
          : 'Não foi possível acessar o serviço de login. Tente novamente.'),
      });
  }
  
}
