import { Routes } from '@angular/router';

export const marketplaceRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/marketplace/marketplace').then(m => m.MarketplaceComponent)
  },
  {
    path: ':itemName',
    loadComponent: () => import('./components/item-details/item-details').then(m => m.ItemDetailsComponent)
  }
];

