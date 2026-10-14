import { Component, inject } from '@angular/core';
import { BottomNav } from '../../../components/bottom-nav/bottom-nav';
import { RouterLink } from '@angular/router';
import { MapaSeparado } from '../../../components/mapa-separado/mapa-separado';
import { UserService } from '../user-service/user-service';
import { Header } from '../../../component/header/header';

@Component({
  imports: [BottomNav, RouterLink, MapaSeparado, Header],
  selector: 'app-profile-home',
  styleUrl: './profile-home.css',
  templateUrl: './profile-home.html',
})
export class ProfileHome {
   readonly hoje = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date());
   private usuarioService = inject(UserService);
   
 usuarioLogado = this.usuarioService.usuarioLogado;

}
