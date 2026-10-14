import { Component, inject } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import { UserService } from '../../../feats/profile user/user-service/user-service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.css',
})
export class AdminSidebar { readonly auth=inject(UserService); }
