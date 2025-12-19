import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faChartLine, 
  faLayerGroup, 
  faUsers, 
  faShoppingCart, 
  faMoneyBillWave, 
  faCheckCircle,
  faSun,
  faMoon,
  faSignOutAlt,
  faBars,
  faChevronLeft,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FontAwesomeModule],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.scss'
})
export class AdminSidebarComponent implements OnInit {
  collapsed = signal(true);
  locale = signal('en');

  // FontAwesome Icons
  faChartLine = faChartLine;
  faLayerGroup = faLayerGroup;
  faUsers = faUsers;
  faShoppingCart = faShoppingCart;
  faMoneyBillWave = faMoneyBillWave;
  faCheckCircle = faCheckCircle;
  faSun = faSun;
  faMoon = faMoon;
  faSignOutAlt = faSignOutAlt;
  faBars = faBars;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  menuItems = [
    { key: 'dashboard', icon: faChartLine, href: '/admin/dashboard' },
    { key: 'categories', icon: faLayerGroup, href: '/admin/categories' },
    { key: 'users', icon: faUsers, href: '/admin/users' },
    { key: 'orders', icon: faShoppingCart, href: '/admin/pickups' },
    { key: 'transactions', icon: faMoneyBillWave, href: '/admin/transactions' },
    { key: 'approve', icon: faCheckCircle, href: '/admin/deliveryapprove' }
  ];

  constructor(
    public authService: AuthService,
    public translation: TranslationService,
    public themeService: ThemeService,
    private router: Router
  ) {
    // Sync dark mode state with theme service
    effect(() => {
      this.themeService.actualTheme();
    });
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  ngOnInit(): void {
    // Load sidebar state
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed !== null) {
      this.collapsed.set(savedCollapsed === 'true');
    }

    // Theme is handled by ThemeService

    // Load locale
    const savedLocale = localStorage.getItem('locale') || 'en';
    this.locale.set(savedLocale);
  }

  toggleSidebar(): void {
    this.collapsed.update(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    const newLocale = this.locale() === 'en' ? 'ar' : 'en';
    this.locale.set(newLocale);
    this.translation.setLocale(newLocale);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  t(key: string): string {
    return this.translation.t(`sidebar.${key}`) || key;
  }
}

