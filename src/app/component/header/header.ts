import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../feats/profile user/user-service/user-service';

@Component({
  imports: [RouterLink],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  readonly auth = inject(UserService);
  private readonly router = inject(Router);

  sair() {
    this.auth.logout().subscribe({ error: () => { /* Session is already cleared locally. */ } });
    void this.router.navigate(['/home']);
  }
}
