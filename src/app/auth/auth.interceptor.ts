import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserService } from '../feats/profile user/user-service/user-service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(UserService);
  const isOwnApi = [environment.apiUrl, environment.authUrl].some(base =>
    request.url === base || request.url.startsWith(`${base.replace(/\/+$/, '')}/`));
  const publicAuth = request.url === `${environment.authUrl}/auth/login` ||
    request.url === `${environment.authUrl}/auth/register`;
  const token = auth.token();
  const authenticated = isOwnApi && !publicAuth && token && !request.headers.has('Authorization')
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(authenticated).pipe(catchError((error: HttpErrorResponse) => {
    if (isOwnApi && !publicAuth && error.status === 401 && token && auth.token() === token) auth.limparSessao();
    return throwError(() => error);
  }));
};
