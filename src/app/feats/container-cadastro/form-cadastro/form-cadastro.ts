import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CadastroInterface } from './cadastro-interface';
import {
  email,
  form,
  maxLength,
  minLength,
  pattern,
  required,
  FormField,
} from '@angular/forms/signals';
import { UserService } from '../../profile user/user-service/user-service';

@Component({
  imports: [FormField],
  selector: 'app-form-cadastro',
  styleUrl: './form-cadastro.css',
  templateUrl: './form-cadastro.html',
})
export class FormCadastro {
  cadastroModel = signal<CadastroInterface>({
    nome: '',
    sobreNome: '',
    email: '',
    cpf: '',
    telefone: '',
    cep: '',
    senha: '',
    check: false,
    username: '',
  });
  private usuarioService = inject(UserService);
  private router = inject(Router);


  etapa = signal(1);

  
  cadastroForm = form(this.cadastroModel, (schemaPath) => {
    required(schemaPath.nome, { message: '*' });
    required(schemaPath.sobreNome, { message: '*' });
    required(schemaPath.email, { message: '*' });
    required(schemaPath.cpf, { message: '*' });
    required(schemaPath.telefone, { message: '*' });
    required(schemaPath.cep, { message: '*' });
    required(schemaPath.senha);
    required(schemaPath.check);
    email(schemaPath.email, { message: '*' });
    maxLength(schemaPath.senha, 16, { message: '*A senha deve ter no máximo 16 caracteres!' });
    minLength(schemaPath.senha, 12, { message: '*Mínimo 12 caracteres!' });
    pattern(schemaPath.senha, /.*[A-Z].*/, { message: '*Ao menos 1 letra maiúscula!' });
    pattern(schemaPath.senha, /.*\d.*/, { message: '*Ao menos 1 número!' });
    pattern(schemaPath.senha, /.*[@$!%*?&].*/, { message: '*Ao menos 1 caractere especial!' });
    pattern(schemaPath.cpf, /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/, { message: '*CPF inválido!' });
    pattern(schemaPath.telefone, /^(\(\d{2}\)\s?\d{4,5}-\d{4}|\d{10,11})$/, {
      message: '*Telefone inválido!',
    });
    pattern(schemaPath.cep, /^(\d{5}-\d{3}|\d{8})$/, { message: '*CEP inválido!' });
  });

  
  proximaEtapa() {
    this.etapa.set(2);
  }

  voltarEtapa() {
    this.etapa.set(1);
  }

  cadastrar(event: SubmitEvent) {
    event.preventDefault();
    if (this.cadastroForm().invalid()) return;
    this.usuarioService.cadastrar(this.cadastroModel()).subscribe({
      next: () => { this.cadastroForm().reset(); this.router.navigate(['/login']); },
      error: (error: { status?: number }) => {
        const message = error.status === 0
          ? 'A autenticação não está disponível. Inicie a auth-smap na porta 8081.'
          : error.status === 409
            ? 'Este e-mail já está cadastrado.'
            : error.status === 400
              ? 'Confira CPF, senha (mínimo 12 caracteres) e aceite os termos.'
              : 'Não foi possível criar a conta. Confira os dados e tente novamente.';
        alert(message);
      },
    });
  }
}


