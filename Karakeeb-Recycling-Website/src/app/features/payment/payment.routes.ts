import { Routes } from '@angular/router';

export const paymentRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/payment/payment').then(m => m.PaymentComponent)
  },
  {
    path: 'success',
    loadComponent: () => import('./components/payment-success/payment-success').then(m => m.PaymentSuccessComponent)
  },
  {
    path: 'receipt/:id',
    loadComponent: () => import('./components/receipt/receipt').then(m => m.ReceiptComponent)
  }
];

