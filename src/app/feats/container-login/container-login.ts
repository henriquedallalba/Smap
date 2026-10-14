import { Component } from '@angular/core';
import { FormLogin } from './form-login/form-login';
import { Header } from '../../component/header/header';

@Component({
  imports: [FormLogin, Header],
  selector: 'app-container-login',
  styleUrl: './container-login.css',
  templateUrl: './container-login.html',
})
export class ContainerLogin {}
