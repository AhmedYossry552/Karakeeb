import { Routes } from '@angular/router';

export const deliveryRoutes: Routes = [
  {
    path: 'profile',
    loadComponent: () => import('./components/delivery-profile/delivery-profile').then(m => m.DeliveryProfileComponent)
  },
  {
    path: 'edit-profile',
    loadComponent: () => import('./components/edit-profile/edit-profile').then(m => m.EditProfileComponent)
  }
];

