import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';


export const deliveryPendingGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();

  if (user && user.role === 'delivery' && authService.isPendingOrDeclinedDelivery) {
    return true;
  }

  if (user && user.role === 'delivery' && authService.isApprovedDelivery) {
    return router.parseUrl('/deliverydashboard');
  }

  return router.parseUrl('/unauthorized');
};


