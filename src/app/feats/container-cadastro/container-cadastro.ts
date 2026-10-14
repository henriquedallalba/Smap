import { Component } from '@angular/core';
import { FormCadastro } from './form-cadastro/form-cadastro';
import { RouterLink } from '@angular/router';
import { Header } from '../../component/header/header';


@Component({
  imports: [FormCadastro, RouterLink, Header],
  selector: 'app-container-cadastro',
  styleUrl: './container-cadastro.css',
  templateUrl: './container-cadastro.html',
})
export class ContainerCadastro {
  
}
