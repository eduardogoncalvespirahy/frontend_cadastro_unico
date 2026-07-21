import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Se uma chamada volta 401 (access token expirado), tenta renovar via
 * /auth/refresh (rotaciona o refresh token no cookie) e repete a chamada
 * original uma única vez. Chamadas de /auth/* nunca passam por esse fluxo,
 * senão um refresh ou login inválido entraria em loop.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (req.url.includes('/auth/')) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return auth.handleUnauthorized().pipe(
        switchMap(() => next(req)),
        catchError((refreshError) => {
          auth.forceLogout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
