import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { UserService } from '../feats/profile user/user-service/user-service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(UserService);
  const router = inject(Router);
  return auth.validarSessao().pipe(map(valid => {
    if (!valid) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    return ['ADMIN', 'SUPREME'].includes(auth.usuarioLogado()?.role ?? '') || router.createUrlTree(['/perfil-usuario']);
  }));
};
