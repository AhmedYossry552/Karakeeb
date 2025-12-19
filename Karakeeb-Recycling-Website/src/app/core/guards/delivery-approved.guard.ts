import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';


export const deliveryApprovedGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();

  if (user && user.role === 'delivery' && authService.isApprovedDelivery) {
    return true;
  }

  if (user && user.role === 'delivery') {
    return router.parseUrl('/waiting-for-approval');
  }

  return router.parseUrl('/unauthorized');
};


