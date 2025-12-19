import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./components/admin-layout/admin-layout').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/admin-dashboard/admin-dashboard').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./components/admin-categories/admin-categories').then(m => m.AdminCategoriesComponent)
      },
      {
        path: 'categories/add-category',
        loadComponent: () => import('./components/add-category/add-category').then(m => m.AddCategoryComponent)
      },
      {
        path: 'categories/:name/edit',
        loadComponent: () => import('./components/edit-category/edit-category').then(m => m.EditCategoryComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./components/admin-users/admin-users').then(m => m.AdminUsersComponent)
      },
      {
        path: 'pickups',
        loadComponent: () => import('./components/admin-pickups/admin-pickups').then(m => m.AdminPickupsComponent)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./components/admin-transactions/admin-transactions').then(m => m.AdminTransactionsComponent)
      },
      {
        path: 'deliveryapprove',
        loadComponent: () => import('./components/admin-delivery-approve/admin-delivery-approve').then(m => m.AdminDeliveryApproveComponent)
      }
    ]
  }
];


