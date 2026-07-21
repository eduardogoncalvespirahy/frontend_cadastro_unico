import { HttpInterceptorFn } from '@angular/common/http';

/**
 * A API autentica via cookies httpOnly. Sem `withCredentials: true` o
 * navegador nunca envia (nem aceita) esses cookies em requisições
 * cross-origin (front em :4200, backend em :3000) — por isso todo request
 * passa por aqui em vez de configurar caso a caso.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};
