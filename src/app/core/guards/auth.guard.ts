import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();

  if (auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/** Bloqueia a rota se a credencial não tiver ADMIN nem nenhum dos papéis informados. */
export function permissionGuard(...roles: string[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.whenReady();

    if (auth.isAuthenticated() && auth.can(...roles)) {
      return true;
    }

    router.navigate(['/']);
    return false;
  };
}

/** Impede um usuário já logado de ver a tela de login de novo. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();

  if (!auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
