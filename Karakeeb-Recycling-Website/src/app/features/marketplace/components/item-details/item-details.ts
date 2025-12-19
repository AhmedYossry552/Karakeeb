import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MarketplaceService, MarketplaceItem } from '../../../../core/services/marketplace.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService, CartItem } from '../../../../core/services/cart.service';

@Component({
  selector: 'app-item-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-details.html',
  styleUrl: './item-details.scss'
})
export class ItemDetailsComponent implements OnInit, OnDestroy {
  item = signal<MarketplaceItem | null>(null);
  isLoading = signal(true);
  isError = signal(false);
  selectedQuantity = signal(1);
  inputValue = signal('1');
  inputError = signal('');
  cartItems: CartItem[] = [];
  
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private marketplaceService: MarketplaceService,
    public translation: TranslationService,
    private authService: AuthService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.cartService.cart$.subscribe(cart => {
        this.cartItems = cart;
        this.syncQuantityFromCart();
      })
    );

    this.subscriptions.add(
      this.route.params.subscribe(params => {
        const itemName = decodeURIComponent(params['itemName']);
        this.loadItem(itemName);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadItem(itemName: string): void {
    this.isLoading.set(true);
    this.isError.set(false);
    
    const user = this.authService.getUser();
    const fromMarketPlace = localStorage.getItem('fromMarketPlace') === 'true';
    const role = (fromMarketPlace && user?.role === 'customer') || (fromMarketPlace && !user) 
      ? 'buyer' 
      : user?.role;

    this.subscriptions.add(
      this.marketplaceService.getItemByName(itemName, role, this.translation.getLocale()).subscribe({
        next: (item) => {
          this.item.set(item);
          this.syncQuantityFromCart();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load item:', error);
          this.isError.set(true);
          this.isLoading.set(false);
        }
      })
    );
  }

  private syncQuantityFromCart(): void {
    const item = this.item();
    if (!item) return;

    const existing = this.cartItems.find(ci => ci._id === item._id);
    if (existing) {
      this.selectedQuantity.set(existing.quantity);
      this.inputValue.set(existing.quantity.toString());
    }
  }

  get fromMarketPlace(): boolean {
    return localStorage.getItem('fromMarketPlace') === 'true';
  }

  get user() {
    return this.authService.getUser();
  }

  get shouldShowStockInfo(): boolean {
    return this.user?.role !== 'customer' || this.fromMarketPlace;
  }

  get canAddToCart(): boolean {
    // Customers and buyers can add to cart, but not from marketplace view
    return !this.fromMarketPlace && (this.user?.role === 'buyer' || this.user?.role === 'customer');
  }

  get currentStock(): number {
    return this.item()?.quantity || 0;
  }

  get isOutOfStock(): boolean {
    // Only show out of stock if we should show stock info
    // Customers not from marketplace are never out of stock
    return this.shouldShowStockInfo && this.currentStock <= 0;
  }

  get isLowStock(): boolean {
    return this.shouldShowStockInfo && this.currentStock <= 5;
  }

  get isInCart(): boolean {
    return this.cartItems.some(ci => ci._id === this.item()?._id);
  }

  get locale(): string {
    return this.translation.getLocale();
  }

  get itemName(): string {
    const item = this.item();
    if (!item) return '';
    return typeof item.name === 'string' 
      ? item.name 
      : (this.locale === 'ar' ? item.name.ar : item.name.en);
  }

  get categoryName(): string {
    const item = this.item();
    if (!item) return '';
    return typeof item.categoryName === 'string'
      ? item.categoryName
      : (this.locale === 'ar' ? item.categoryName.ar : item.categoryName.en);
  }

  getMeasurementText(unit: 1 | 2): string {
    return unit === 1 
      ? this.translation.t('common.unitKg') 
      : this.translation.t('common.unitPiece');
  }

  get totalPrice(): number {
    const item = this.item();
    if (!item) return 0;
    // Backend already returns prices with markup for buyers, so use price as-is
    return item.price * this.selectedQuantity();
  }

  onQuantityChange(value: string): void {
    this.inputValue.set(value);
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue <= 0) {
      this.inputError.set(this.translation.t('common.invalidQuantity'));
      return;
    }

    const item = this.item();
    if (!item) return;

    const user = this.user;
    const isBuyer = user?.role === 'buyer';
    
    // For customers not from marketplace, don't limit by stock
    if (user?.role === 'customer' && !this.fromMarketPlace) {
      if (item.measurement_unit === 2 && !Number.isInteger(numValue)) {
        this.inputError.set(this.translation.t('common.wholeNumbersOnly'));
        return;
      }
      this.selectedQuantity.set(numValue);
      this.inputError.set('');
      return;
    }

    // For buyers, check stock including what's already in cart
    if (isBuyer) {
      const availableStock = this.currentStock;
      const existingCartItem = this.cartItems.find(ci => ci._id === item._id);
      const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
      const maxCanAdd = availableStock - currentCartQuantity;
      const maxQuantity = maxCanAdd > 0 ? maxCanAdd : 0;

      if (numValue > maxQuantity) {
        if (maxQuantity === 0) {
          this.inputError.set(this.translation.t('cart.maxStockReached') || `You already have ${currentCartQuantity} in cart. Maximum available: ${availableStock}`);
        } else {
          this.inputError.set(this.translation.t('cart.insufficientStock') || `Maximum you can add: ${maxQuantity} (${availableStock} total available, ${currentCartQuantity} already in cart)`);
        }
        return;
      }
    } else {
      // For marketplace customers, limit by stock
      const maxQuantity = this.currentStock;
      if (numValue > maxQuantity) {
        this.inputError.set(`Maximum available: ${maxQuantity}`);
        return;
      }
    }

    if (item.measurement_unit === 2 && !Number.isInteger(numValue)) {
      this.inputError.set(this.translation.t('common.wholeNumbersOnly'));
      return;
    }

    this.selectedQuantity.set(numValue);
    this.inputError.set('');
  }

  onQuantityBlur(): void {
    const item = this.item();
    if (!item) return;

    const value = parseFloat(this.inputValue());
    const user = this.user;
    const isBuyer = user?.role === 'buyer';
    
    // Validate quantity
    if (isNaN(value) || value <= 0) {
      this.inputValue.set('1');
      this.selectedQuantity.set(1);
      this.inputError.set('');
      return;
    }

    // For customers not from marketplace, don't limit by stock
    if (user?.role === 'customer' && !this.fromMarketPlace) {
      if (item.measurement_unit === 2 && !Number.isInteger(value)) {
        const validValue = Math.floor(value);
        this.selectedQuantity.set(validValue);
        this.inputValue.set(validValue.toString());
        this.inputError.set(this.translation.t('common.wholeNumbersOnly'));
      } else {
        this.selectedQuantity.set(value);
        this.inputValue.set(value.toString());
        this.inputError.set('');
      }
      return;
    }

    // For buyers, check stock including what's already in cart
    if (isBuyer) {
      const availableStock = item.quantity;
      const existingCartItem = this.cartItems.find(ci => ci._id === item._id);
      const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
      const maxCanAdd = availableStock - currentCartQuantity;
      const maxQuantity = maxCanAdd > 0 ? maxCanAdd : 0;

      if (value > maxQuantity) {
        // Auto-correct to valid value
        const validValue = maxQuantity > 0 ? maxQuantity : 1;
        this.selectedQuantity.set(validValue);
        this.inputValue.set(validValue.toString());
        if (maxQuantity === 0) {
          this.inputError.set(this.translation.t('cart.maxStockReached') || `You already have ${currentCartQuantity} in cart. Maximum available: ${availableStock}`);
        } else {
          this.inputError.set(this.translation.t('cart.insufficientStock') || `Maximum you can add: ${maxQuantity}`);
        }
      } else {
        this.selectedQuantity.set(value);
        this.inputValue.set(value.toString());
        this.inputError.set('');
      }
    } else {
      // For marketplace customers, limit by stock
      const maxQuantity = item.quantity;
      if (value > maxQuantity) {
        const validValue = maxQuantity;
        this.selectedQuantity.set(validValue);
        this.inputValue.set(validValue.toString());
        this.inputError.set(`Maximum available: ${maxQuantity}`);
      } else {
        this.selectedQuantity.set(value);
        this.inputValue.set(value.toString());
        this.inputError.set('');
      }
    }
  }

  adjustQuantity(change: number): void {
    const item = this.item();
    if (!item) return;

    const step = item.measurement_unit === 1 ? 0.25 : 1;
    const newQuantity = this.selectedQuantity() + (change * step);
    const user = this.user;
    const isBuyer = user?.role === 'buyer';
    
    if (newQuantity <= 0) return;

    // For customers not from marketplace, don't limit by stock
    if (user?.role === 'customer' && !this.fromMarketPlace) {
      if (item.measurement_unit === 2 && !Number.isInteger(newQuantity)) {
        return;
      }
      this.selectedQuantity.set(newQuantity);
      this.inputValue.set(newQuantity.toString());
      this.inputError.set('');
      return;
    }

    // For buyers, check stock including what's already in cart
    if (isBuyer) {
      const availableStock = this.currentStock;
      const existingCartItem = this.cartItems.find(ci => ci._id === item._id);
      const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
      const maxCanAdd = availableStock - currentCartQuantity;
      const maxQuantity = maxCanAdd > 0 ? maxCanAdd : 0;

      if (newQuantity > maxQuantity) {
        if (maxQuantity > 0) {
          // Auto-correct to max available
          const validQuantity = item.measurement_unit === 2 ? Math.floor(maxQuantity) : maxQuantity;
          this.selectedQuantity.set(validQuantity);
          this.inputValue.set(validQuantity.toString());
          this.inputError.set(this.translation.t('cart.insufficientStock') || `Maximum you can add: ${maxQuantity}`);
        } else {
          this.inputError.set(this.translation.t('cart.maxStockReached') || `You already have ${currentCartQuantity} in cart. Maximum available: ${availableStock}`);
        }
        return;
      }
    } else {
      // For marketplace customers, limit by stock
      const maxQuantity = this.currentStock;
      if (newQuantity > maxQuantity) return;
    }

    if (item.measurement_unit === 2 && !Number.isInteger(newQuantity)) {
      return;
    }

    this.selectedQuantity.set(newQuantity);
    this.inputValue.set(newQuantity.toString());
    this.inputError.set('');
  }

  async toggleCart(): Promise<void> {
    const item = this.item();
    if (!item) return;

    const user = this.user;
    
    // Prevent adding to cart from marketplace view
    if (this.fromMarketPlace) {
      alert(this.translation.t('common.cannotAddFromMarketplace') || 'Items cannot be added to cart from marketplace view.');
      return;
    }
    
    // Check if user can add to cart
    if (!this.canAddToCart && user) {
      alert(this.translation.t('common.onlyBuyersCustomers') || 'Only buyers and customers can add items to the cart.');
      return;
    }
    
    if (!user) {
      const loginRequiredMsg = this.translation.t('auth.login.required');
      alert(loginRequiredMsg !== 'auth.login.required' ? loginRequiredMsg : 'You must be logged in to add items to the cart.');
      return;
    }

    if (this.isInCart) {
      const existing = this.cartItems.find(ci => ci._id === item._id);
      if (existing) {
        await this.cartService.removeFromCart(existing);
        this.selectedQuantity.set(1);
        this.inputValue.set('1');
      }
    } else {
      // For customers not from marketplace, allow adding regardless of stock
      // For buyers, check stock availability and quantity limits
      if (user.role === 'customer' && !this.fromMarketPlace) {
        // Customers can add regardless of stock
        const cartItem: CartItem = {
          _id: item._id,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          name: item.name,
          image: item.image,
          points: item.points,
          price: item.price,
          measurement_unit: item.measurement_unit,
          quantity: this.selectedQuantity()
        };
        await this.cartService.addToCart(cartItem);
      } else if (user.role === 'buyer') {
        // Buyers must check stock
        if (this.isOutOfStock) {
          alert(this.translation.t('common.outOfStock') || 'This item is out of stock.');
          return;
        }
        
        const requestedQuantity = this.selectedQuantity();
        const availableStock = this.currentStock;
        
        // Check if item is already in cart
        const existingCartItem = this.cartItems.find(ci => ci._id === item._id);
        const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
        const totalQuantityAfterAdd = currentCartQuantity + requestedQuantity;
        
        // For buyers, total quantity in cart cannot exceed available stock
        if (totalQuantityAfterAdd > availableStock) {
          const maxCanAdd = availableStock - currentCartQuantity;
          if (maxCanAdd <= 0) {
            alert(this.translation.t('cart.maxStockReached') || `You already have ${currentCartQuantity} in cart. Maximum available stock: ${availableStock}`);
          } else {
            alert(this.translation.t('cart.insufficientStock') || `Only ${availableStock} available in stock. You can add up to ${maxCanAdd} more.`);
            this.selectedQuantity.set(maxCanAdd);
            this.inputValue.set(maxCanAdd.toString());
          }
          return;
        }
        
        // Backend already returns prices with markup for buyers, so use price as-is
        const cartItem: CartItem = {
          _id: item._id,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          name: item.name,
          image: item.image,
          points: item.points,
          price: item.price, // Backend already applies markup for buyers
          measurement_unit: item.measurement_unit,
          quantity: requestedQuantity
        };
        await this.cartService.addToCart(cartItem);
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/marketplace']);
  }
}

