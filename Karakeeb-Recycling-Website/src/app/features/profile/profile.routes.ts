import { Routes } from '@angular/router';

export const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/profile/profile').then(m => m.ProfileComponent)
  },
  {
    path: 'edit',
    loadComponent: () => import('./components/edit-profile/edit-profile').then(m => m.EditProfileComponent)
  },
  {
    path: 'ewallet',
    loadComponent: () => import('../ewallet/components/ewallet/ewallet').then(m => m.EWalletComponent)
  },
  {
    path: 'rewarding',
    loadComponent: () => import('../rewards/components/rewards/rewards').then(m => m.RewardsComponent)
  }
];

