import { Routes } from '@angular/router';

export const pickupRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/pickup/pickup').then(m => m.PickupComponent)
  },
  {
    path: 'confirmation',
    loadComponent: () => import('./components/confirmation/confirmation').then(m => m.PickupConfirmationComponent)
  },
  {
    path: 'tracking/:id',
    loadComponent: () => import('./components/tracking/tracking').then(m => m.TrackingComponent)
  }
];

