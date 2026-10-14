import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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

  loginForm = form(this.loginModel, (schemaPath) => {
    required(schemaPath.email, { message: '*' });
    email(schemaPath.email, { message: '*' });
    required(schemaPath.senha, { message: '*' });
  });

  fazerLogin(event: SubmitEvent) {
    event.preventDefault();
    if (this.loginForm().invalid()) return;
   
    this.usuarioService.login(
      this.loginModel().email,
      this.loginModel().senha
    ).subscribe({ next: () => this.router.navigate(['/perfil-usuario']), error: () => alert('E-mail ou senha inválidos.') });
  }
  
}

