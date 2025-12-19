import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ThemeService } from '../../../core/services/theme.service';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { NotificationBellComponent } from '../notification-bell/notification-bell';
import { MarketplaceService } from '../../../core/services/marketplace.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faHome, 
  faShoppingCart, 
  faUser, 
  faSignOutAlt, 
  faSun, 
  faMoon, 
  faGlobe, 
  faCog, 
  faWallet,
  faBars,
  faTimes,
  faChevronDown,
  faPlus,
  faMinus,
  faTrash,
  faStore,
  faThLarge,
  faRecycle,
  faMicrochip
} from '@fortawesome/free-solid-svg-icons';
import { faUserCircle } from '@fortawesome/free-regular-svg-icons';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NotificationBellComponent, FontAwesomeModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  isMenuOpen = signal(false);
  isProfileOpen = signal(false);
  isCartOpen = signal(false);
  cartItems: CartItem[] = [];
  cartTotalItems = signal(0);
  
  // Font Awesome Icons
  faHome = faHome;
  faShoppingCart = faShoppingCart;
  faUser = faUser;
  faSignOutAlt = faSignOutAlt;
  faSun = faSun;
  faMoon = faMoon;
  faGlobe = faGlobe;
  faCog = faCog;
  faWallet = faWallet;
  faBars = faBars;
  faTimes = faTimes;
  faChevronDown = faChevronDown;
  faPlus = faPlus;
  faMinus = faMinus;
  faTrash = faTrash;
  faUserCircle = faUserCircle;
  faStore = faStore;
  faThLarge = faThLarge;
  faRecycle = faRecycle;
  faMicrochip = faMicrochip;
  
  private cartSubscription?: Subscription;
  
  private stockCache = new Map<string, number>(); // Cache stock levels for items

  constructor(
    public authService: AuthService,
    public translation: TranslationService,
    public themeService: ThemeService,
    public cartService: CartService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private toastr: ToastrService,
    private marketplaceService: MarketplaceService
  ) {
    // Update document direction when locale changes
    effect(() => {
      const locale = this.translation.getLocale();
      if (typeof document !== 'undefined') {
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = locale;
      }
    });
  }
  
  get user$() {
    return this.authService.user$;
  }
  
  get user() {
    return this.authService.getUser();
  }
  
  get isDarkMode() {
    return this.themeService.isDarkMode();
  }

  ngOnInit(): void {
    // Close dropdowns when clicking outside
    document.addEventListener('click', this.handleClickOutside);
    
    // Subscribe to cart changes
    this.cartSubscription = this.cartService.cart$.subscribe(cart => {
      this.cartItems = cart;
      // Calculate total quantity of all items
      const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
      this.cartTotalItems.set(totalQuantity);
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleClickOutside);
    this.cartSubscription?.unsubscribe();
  }

  private handleClickOutside = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-dropdown') && !target.closest('.profile-button')) {
      this.isProfileOpen.set(false);
    }
    if (!target.closest('.cart-dropdown') && !target.closest('.cart-button')) {
      this.isCartOpen.set(false);
    }
  };

  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
  }

  toggleProfile(): void {
    this.isProfileOpen.update(v => !v);
  }

  toggleCart(): void {
    this.isCartOpen.update(v => !v);
    this.isProfileOpen.set(false);
    this.isMenuOpen.set(false);
  }

  getItemName(item: CartItem): string {
    if (typeof item.name === 'string') {
      return item.name;
    }
    return this.locale === 'ar' ? item.name.ar : item.name.en;
  }

  async removeFromCart(item: CartItem): Promise<void> {
    const itemName = this.getItemName(item);
    const confirmMessage = this.translation.t('cart.removeConfirm') || 
      `Are you sure you want to remove "${itemName}" from your cart?`;
    
    const confirmed = await this.confirmationService.confirm({
      title: this.translation.t('cart.remove') || 'Remove Item',
      message: confirmMessage,
      confirmText: this.translation.t('cart.remove') || 'Remove',
      cancelText: this.translation.t('common.cancel') || 'Cancel'
    });
    
    if (confirmed) {
      try {
        await this.cartService.removeFromCart(item);
        this.toastr.success(
          `${itemName} ${this.translation.t('cart.removedFromCart') || 'has been removed from your cart'}`,
          this.translation.t('cart.itemRemoved') || 'Item Removed',
          { timeOut: 3000 }
        );
      } catch (error) {
        this.toastr.error(
          this.translation.t('cart.removeError') || 'Failed to remove item from cart',
          this.translation.t('common.error') || 'Error',
          { timeOut: 3000 }
        );
      }
    }
  }

  async updateQuantity(item: CartItem, change: number): Promise<void> {
    const user = this.user;
    const isBuyer = user?.role === 'buyer';
    const newQuantity = item.quantity + change;
    
    // Handle quantity going to 0 or below (remove item)
    if (newQuantity <= 0) {
      const itemName = this.getItemName(item);
      const confirmMessage = this.translation.t('cart.removeConfirm') || 
        `Are you sure you want to remove "${itemName}" from your cart?`;
      
      const confirmed = await this.confirmationService.confirm({
        title: this.translation.t('cart.remove') || 'Remove Item',
        message: confirmMessage,
        confirmText: this.translation.t('cart.remove') || 'Remove',
        cancelText: this.translation.t('common.cancel') || 'Cancel'
      });
      
      if (confirmed) {
        try {
          await this.cartService.removeFromCart(item);
          this.toastr.success(
            `${itemName} ${this.translation.t('cart.removedFromCart') || 'has been removed from your cart'}`,
            this.translation.t('cart.itemRemoved') || 'Item Removed',
            { timeOut: 3000 }
          );
        } catch (error) {
          this.toastr.error(
            this.translation.t('cart.removeError') || 'Failed to remove item from cart',
            this.translation.t('common.error') || 'Error',
            { timeOut: 3000 }
          );
        }
      }
      return;
    }
    
    // For buyers, check stock limit before allowing increase
    if (isBuyer && change > 0) {
      try {
        // Fetch current item to check stock
        const itemDetails = await firstValueFrom(
          this.marketplaceService.getItemByName(
            typeof item.name === 'string' ? item.name : item.name.en,
            'buyer',
            this.locale
          )
        );
        
        if (itemDetails) {
          const availableStock = itemDetails.quantity || 0;
          // Update cache
          this.stockCache.set(item._id, availableStock);
          
          if (newQuantity > availableStock) {
            this.toastr.warning(
              this.translation.t('cart.insufficientStock') || `Only ${availableStock} available in stock. Cannot add more.`,
              this.translation.t('cart.stockLimit') || 'Stock Limit',
              { timeOut: 3000 }
            );
            return; // Block the update
          }
        }
      } catch (error) {
        // If stock check fails, allow the update but show a warning
        console.warn('Could not verify stock, allowing update:', error);
        this.toastr.warning(
          this.translation.t('cart.stockCheckWarning') || 'Could not verify stock availability. Proceeding with update.',
          this.translation.t('cart.warning') || 'Warning',
          { timeOut: 2000 }
        );
        // Continue with the update despite the warning
      }
    }

    // Update quantity (for both customers and buyers if stock check passed)
    try {
      await this.cartService.updateQuantity(item, newQuantity);
    } catch (error) {
      console.error('Failed to update quantity:', error);
      this.toastr.error(
        this.translation.t('cart.updateError') || 'Failed to update quantity',
        this.translation.t('common.error') || 'Error',
        { timeOut: 3000 }
      );
    }
  }

  goToCart(): void {
    this.isCartOpen.set(false);
    this.router.navigate(['/cart']);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    const current = this.translation.getLocale();
    this.translation.setLocale(current === 'en' ? 'ar' : 'en');
  }

  openEcoAssist(event: Event): void {
    event.preventDefault();
    const user = this.user;
    if (!user) {
      this.toastr.warning(
        this.translation.t('chatbot.loginRequired') || 'Please login to use EcoAssist',
        this.translation.t('chatbot.authenticationRequired') || 'Authentication Required'
      );
      this.router.navigate(['/auth']);
      return;
    }
    this.router.navigate(['/ideas']);
  }

  async logout(): Promise<void> {
    // Clear cart
    this.cartService.clearCart();
    
    // Logout from auth service
    this.authService.logout();
    
    // Close dropdowns
    this.isProfileOpen.set(false);
    this.isMenuOpen.set(false);
    
    // Navigate to home
    await this.router.navigate(['/']);
  }

  getUserInitials(user: any): string {
    if (!user) return 'U';
    const name = user.name || user.fullName || user.firstName || user.email || 'User';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  get isBuyer(): boolean {
    return this.authService.isBuyer;
  }

  get locale(): string {
    return this.translation.getLocale();
  }
}

