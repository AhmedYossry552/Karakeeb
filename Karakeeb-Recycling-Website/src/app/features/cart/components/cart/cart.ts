import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CartService, CartItem } from '../../../../core/services/cart.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import { getPriceWithMarkup } from '../../../../core/utils/price.utils';
import { MarketplaceService } from '../../../../core/services/marketplace.service';
import { FloatingRecorderButtonComponent } from '../../../voice-recorder/components/floating-recorder-button/floating-recorder-button';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, FloatingRecorderButtonComponent],
  templateUrl: './cart.html',
  styleUrl: './cart.scss'
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  isLoading = signal(false);
  private cartSubscription?: Subscription;
  private stockCache = new Map<string, number>(); // Cache stock levels for items

  constructor(
    public cartService: CartService,
    public authService: AuthService,
    public translation: TranslationService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private toastr: ToastrService,
    private marketplaceService: MarketplaceService
  ) {}

  ngOnInit(): void {
    this.cartSubscription = this.cartService.cart$.subscribe(cart => {
      this.cartItems = cart;
    });
  }

  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
  }

  get user() {
    return this.authService.getUser();
  }

  get isBuyer(): boolean {
    return this.authService.isBuyer;
  }

  get locale(): string {
    return this.translation.getLocale();
  }

  get totalPrice(): number {
    // Prices are already stored with markup for buyers, so use as-is
    return this.cartItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  }

  getItemPrice(item: CartItem): number {
    // Price is already stored with markup for buyers, so return as-is
    // For customers, return base price
    return item.price;
  }

  get totalItems(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  get totalPoints(): number {
    return this.cartItems.reduce((sum, item) => sum + ((item.points || 0) * item.quantity), 0);
  }

  get isCustomer(): boolean {
    return this.user?.role === 'customer';
  }

  getItemName(item: CartItem): string {
    if (typeof item.name === 'string') {
      return item.name;
    }
    return this.locale === 'ar' ? item.name.ar : item.name.en;
  }

  async canIncreaseQuantity(item: CartItem): Promise<boolean> {
    const user = this.user;
    if (user?.role !== 'buyer') {
      return true; // Customers can always increase
    }

    // Check cache first
    const cachedStock = this.stockCache.get(item._id);
    if (cachedStock !== undefined) {
      return item.quantity < cachedStock;
    }

    // Fetch stock if not cached
    try {
      const itemDetails = await firstValueFrom(
        this.marketplaceService.getItemByName(
          typeof item.name === 'string' ? item.name : item.name.en,
          'buyer',
          this.locale
        )
      );
      
      if (itemDetails) {
        const availableStock = itemDetails.quantity || 0;
        this.stockCache.set(item._id, availableStock);
        return item.quantity < availableStock;
      }
    } catch (error) {
      console.warn('Could not check stock for item:', item._id, error);
      // If check fails, allow increase (graceful degradation)
      return true;
    }

    return true; // Default to allowing increase if check fails
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

  async clearCart(): Promise<void> {
    const confirmMessage = this.translation.t('cart.clearConfirm') || 'Are you sure you want to clear your cart?';
    const confirmed = await this.confirmationService.confirm({
      title: this.translation.t('cart.clearAll') || 'Clear Cart',
      message: confirmMessage,
      confirmText: this.translation.t('cart.clearAll') || 'Clear All',
      cancelText: this.translation.t('common.cancel') || 'Cancel'
    });
    
    if (confirmed) {
      try {
        await this.cartService.clearCart();
        this.toastr.success(
          this.translation.t('cart.cartCleared') || 'Your cart has been cleared',
          this.translation.t('cart.success') || 'Success',
          { timeOut: 3000 }
        );
      } catch (error) {
        this.toastr.error(
          this.translation.t('cart.clearError') || 'Failed to clear cart',
          this.translation.t('common.error') || 'Error',
          { timeOut: 3000 }
        );
      }
    }
  }

  proceedToCheckout(): void {
    if (!this.user) {
      // Redirect to login with return URL
      this.router.navigate(['/auth'], { 
        queryParams: { returnUrl: '/cart' } 
      });
      return;
    }

    // Check if user can checkout (buyer or customer)
    if (this.user.role !== 'buyer' && this.user.role !== 'customer') {
      this.toastr.error(this.translation.t('cart.onlyBuyersCustomers') !== 'cart.onlyBuyersCustomers' ? this.translation.t('cart.onlyBuyersCustomers') : 'Only buyers and customers can checkout.');
      return;
    }

    // Check if cart is empty
    if (this.cartItems.length === 0) {
      this.toastr.warning(this.translation.t('cart.emptyCart') !== 'cart.emptyCart' ? this.translation.t('cart.emptyCart') : 'Your cart is empty');
      return;
    }

    // Navigate to pickup page (which handles the checkout flow)
    this.router.navigate(['/pickup']);
  }
}

