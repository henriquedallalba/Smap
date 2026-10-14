import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { UserService } from '../feats/profile user/user-service/user-service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(UserService);
  const router = inject(Router);
  return auth.validarSessao().pipe(map(valid => valid || router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  })));
};

export function destinoAposLogin(value: string | null): string {
  return value && /^\/(registrar-ocorrencia|ocorrenciasRegistrada|perfil-usuario|perfil-config|admin\/(?:dashboard|ocorrencias(?:\/\d+)?|mapa|regioes|configuracoes)|confirmacao-ocorrencia(?:\/\d+)?)(?:\?[^#\\]*)?$/.test(value)
    ? value : '/perfil-usuario';
}
