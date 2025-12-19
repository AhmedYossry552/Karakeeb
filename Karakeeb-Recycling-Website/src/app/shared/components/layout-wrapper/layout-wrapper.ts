import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar';
import { FooterComponent } from '../footer/footer';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ConfirmationService, ConfirmationOptions } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-layout-wrapper',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, ConfirmationDialogComponent],
  templateUrl: './layout-wrapper.html',
  styleUrl: './layout-wrapper.scss'
})
export class LayoutWrapperComponent implements OnInit, OnDestroy {
  confirmationOptions: ConfirmationOptions | null = null;
  isConfirmationOpen = false;
  private confirmationResolve: ((value: boolean) => void) | null = null;
  private routerSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private router: Router,
    private confirmationService: ConfirmationService
  ) {
    // Apply theme changes
    effect(() => {
      const theme = this.themeService.actualTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
      }
    });
  }

  shouldHideLayout = false;
  private currentUrl = '';

  ngOnInit(): void {
    // Initial theme application
    const theme = this.themeService.actualTheme();
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }

    // Subscribe to confirmation requests
    this.confirmationService.confirmation$.subscribe(({ options, resolve }) => {
      this.confirmationOptions = options;
      this.isConfirmationOpen = true;
      this.confirmationResolve = resolve;
    });

    // Initial check for role-based redirect
    this.checkAndRedirect();

    // Handle role-based redirects - redirect users from home page to their dashboards
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const currentUrl = event.urlAfterRedirects || event.url;
        this.currentUrl = currentUrl;
        
        // Update shouldHideLayout based on current route
        this.shouldHideLayout = this.shouldHideLayoutForRoute(currentUrl);
        
        // Check and redirect on navigation
        this.checkAndRedirect();
      });
    
    // Initial check
    this.shouldHideLayout = this.shouldHideLayoutForRoute(this.router.url);
  }

  private checkAndRedirect(): void {
    const user = this.authService.getUser();
    const token = this.authService.getToken();
    const currentUrl = this.router.url;
    
    // Only redirect if user is logged in and on home page
    // BUT: Allow pending/declined delivery users to access home page
    if (user && token && (currentUrl === '/' || currentUrl === '')) {
      if (user.role === 'admin') {
        this.router.navigate(['/admin/dashboard']);
      } else if (user.role === 'delivery') {
        // Only redirect approved delivery users to dashboard
        // Pending/declined users can stay on home page
        if (this.authService.isApprovedDelivery) {
          this.router.navigate(['/deliverydashboard']);
        }
        // Don't redirect pending/declined users - they can access home page
      } else if (user.role === 'buyer') {
        this.router.navigate(['/buyer-dashboard']);
      }
    }
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  onConfirmationConfirmed(): void {
    this.isConfirmationOpen = false;
    if (this.confirmationResolve) {
      this.confirmationResolve(true);
      this.confirmationResolve = null;
    }
    this.confirmationOptions = null;
  }

  onConfirmationCancelled(): void {
    this.isConfirmationOpen = false;
    if (this.confirmationResolve) {
      this.confirmationResolve(false);
      this.confirmationResolve = null;
    }
    this.confirmationOptions = null;
  }

  private shouldHideLayoutForRoute(url: string): boolean {
    // Hide navbar and footer for delivery and admin routes
    const hideLayoutRoutes = [
      '/deliverydashboard',
      '/deliveryprofile',
      '/deliveryeditprofile',
      '/waiting-for-approval',
      '/admin'
    ];
    return hideLayoutRoutes.some(route => url.startsWith(route));
  }
}

