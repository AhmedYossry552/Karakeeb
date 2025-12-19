import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/components/home/home').then(m => m.Home)
  },
  {
    path: 'buyer-dashboard',
    loadComponent: () => import('./features/buyer-dashboard/components/buyer-dashboard/buyer-dashboard').then(m => m.BuyerDashboardComponent)
  },
  {
    path: 'marketplace',
    loadChildren: () => import('./features/marketplace/marketplace.routes').then(m => m.marketplaceRoutes)
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/components/auth/auth').then(m => m.AuthComponent)
  },
  {
    path: 'category',
    loadComponent: () => import('./features/category/components/category/category').then(m => m.CategoryComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/components/cart/cart').then(m => m.CartComponent)
  },
  {
    path: 'profile',
    loadChildren: () => import('./features/profile/profile.routes').then(m => m.profileRoutes)
  },
  {
    path: 'buyer-orders',
    loadComponent: () => import('./features/buyer-orders/components/buyer-orders/buyer-orders').then(m => m.BuyerOrdersComponent)
  },
  {
    path: 'deliverydashboard',
    canActivate: [() => import('./core/guards/delivery-approved.guard').then(m => m.deliveryApprovedGuard) as any],
    loadComponent: () => import('./features/delivery/components/delivery-dashboard/delivery-dashboard').then(m => m.DeliveryDashboardComponent)
  },
  {
    path: 'deliveryprofile',
    canActivate: [() => import('./core/guards/delivery-approved.guard').then(m => m.deliveryApprovedGuard) as any],
    loadComponent: () => import('./features/delivery/components/delivery-profile/delivery-profile').then(m => m.DeliveryProfileComponent)
  },
  {
    path: 'deliveryeditprofile',
    canActivate: [() => import('./core/guards/delivery-approved.guard').then(m => m.deliveryApprovedGuard) as any],
    loadComponent: () => import('./features/delivery/components/edit-profile/edit-profile').then(m => m.EditProfileComponent)
  },
  {
    path: 'waiting-for-approval',
    canActivate: [() => import('./core/guards/delivery-pending.guard').then(m => m.deliveryPendingGuard) as any],
    loadComponent: () => import('./features/delivery/components/waiting-for-approval/waiting-for-approval').then(m => m.WaitingForApprovalComponent)
  },
  {
    path: 'pickup',
    loadChildren: () => import('./features/pickup/pickup.routes').then(m => m.pickupRoutes)
  },
  {
    path: 'payment',
    loadChildren: () => import('./features/payment/payment.routes').then(m => m.paymentRoutes)
  },
  {
    path: 'ideas',
    loadComponent: () => import('./features/chatbot/components/chatbot/chatbot').then(m => m.ChatbotComponent)
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  // Extra top-level pages to mirror the Next.js app
  {
    path: 'FAQ',
    loadComponent: () => import('./features/faq/components/faq/faq').then(m => m.FaqPageComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/components/about/about').then(m => m.AboutPageComponent)
  },
  {
    path: 'plasticWeRecycle',
    loadComponent: () => import('./features/plastic-we-recycle/components/plastic-we-recycle/plastic-we-recycle').then(m => m.PlasticWeRecyclePageComponent)
  },
  {
    path: 'contact-us',
    loadComponent: () => import('./features/contact-us/components/contact-us/contact-us').then(m => m.ContactUsPageComponent)
  },
  {
    path: 'notifications',
    loadComponent: () => import('./features/notifications-page/components/notifications-page/notifications-page').then(m => m.NotificationsPageComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/unauthorized/components/unauthorized/unauthorized').then(m => m.UnauthorizedPageComponent)
  }
];
