import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarketplaceItem, MarketplaceService } from '../../../../core/services/marketplace.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { CartService, CartItem } from '../../../../core/services/cart.service';
import { AuthService } from '../../../../core/services/auth.service';

// Global cache to track loaded images across component recreations
const loadedImagesCache = new Set<string>();

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './item-card.html',
  styleUrl: './item-card.scss'
})
export class ItemCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() item!: MarketplaceItem;
  @Input() index: number = 0;
  @Input() isFetching: boolean = false;
  @Input() user: any = null;

  imageLoaded = signal(false);
  imageError = signal(false);
  isInView = signal(true); // Always true - images always visible
  isInCart = signal(false);
  cartItems: CartItem[] = [];
  private cartSubscription?: any;
  private currentImageUrl = '';

  constructor(
    private marketplaceService: MarketplaceService,
    public translation: TranslationService,
    private cartService: CartService,
    private authService: AuthService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // If item changed, check if image was already loaded
    if (changes['item']) {
      const imageUrl = this.getOptimizedImageUrl();
      
      // Check global cache to see if this image was already loaded
      if (loadedImagesCache.has(imageUrl)) {
        this.imageLoaded.set(true);
        this.imageError.set(false);
      } else {
        // Reset state for new/unloaded images
        if (!changes['item'].firstChange) {
          const previousItem = changes['item'].previousValue;
          const currentItem = changes['item'].currentValue;
          
          // Only reset if it's a different item
          if (!previousItem || !currentItem || previousItem._id !== currentItem._id) {
            this.imageLoaded.set(false);
            this.imageError.set(false);
          }
        }
      }
      this.currentImageUrl = imageUrl;
    }
  }

  ngOnInit(): void {
    // Always show images - let browser handle lazy loading natively
    this.isInView.set(true);
    
    const imageUrl = this.getOptimizedImageUrl();
    
    // Debug: log image URL to help diagnose issues
    if (!imageUrl) {
      console.warn('Item has no image URL:', this.item._id, this.item.name);
    }
    
    // Check if image was already loaded (from cache)
    if (imageUrl && loadedImagesCache.has(imageUrl)) {
      this.imageLoaded.set(true);
      this.imageError.set(false);
    } else if (imageUrl) {
      // If we have an image URL, assume it will load (set loaded to true initially)
      // The error handler will set it to false if it fails
      this.imageLoaded.set(false);
      this.imageError.set(false);
    } else {
      // No image URL, show error state
      this.imageError.set(true);
      this.imageLoaded.set(false);
    }

    // Subscribe to cart changes
    this.cartSubscription = this.cartService.cart$.subscribe(cart => {
      this.cartItems = cart;
      this.isInCart.set(cart.some(ci => ci._id === this.item._id));
    });
  }


  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
  }

  getOptimizedImageUrl(): string {
    if (!this.item?.image) {
      return ''; // Return empty string if no image
    }
    return this.marketplaceService.getOptimizedImageUrl(this.item.image, 280);
  }

  getMeasurementText(unit: 1 | 2): string {
    return unit === 1 
      ? this.translation.t('itemsModal.perKg') 
      : this.translation.t('itemsModal.perItem');
  }

  onImageLoad(): void {
    const imageUrl = this.getOptimizedImageUrl();
    // Add to global cache so it persists across component recreations
    loadedImagesCache.add(imageUrl);
    this.imageLoaded.set(true);
    this.imageError.set(false);
  }

  onImageError(): void {
    this.imageError.set(true);
    this.imageLoaded.set(false);
  }

  markFromMarketplace(): void {
    // Check if we're coming from category page (has category filter)
    // If coming from category, customer should be able to add to cart
    const urlParams = new URLSearchParams(window.location.search);
    const hasCategoryFilter = urlParams.has('category') && urlParams.get('category') !== 'all';
    
    // Only set fromMarketPlace flag for customers when viewing marketplace without category filter
    // When coming from category page, remove the flag so customer can add to cart
    if (this.user?.role === 'customer') {
      if (hasCategoryFilter) {
        // Coming from category page - remove flag to allow adding to cart
        localStorage.removeItem('fromMarketPlace');
      } else {
        // Pure marketplace view - set flag to prevent adding to cart
        localStorage.setItem('fromMarketPlace', 'true');
      }
    } else if (this.user?.role === 'buyer') {
      // Buyers should always be able to add to cart, so remove the flag
      localStorage.removeItem('fromMarketPlace');
    } else {
      localStorage.removeItem('fromMarketPlace');
    }
  }

  async addToCart(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const user = this.authService.getUser();
    
    // Check if user can add to cart
    if (!this.canAddToCart && user) {
      alert(this.translation.t('common.cannotAddFromMarketplace') || 'Items cannot be added to cart from marketplace view.');
      return;
    }
    
    // Allow adding to cart without login (guest cart)
    // But check role if user is logged in
    if (user && user.role !== 'buyer' && user.role !== 'customer') {
      alert(this.translation.t('common.onlyBuyersCustomers') || 'Only buyers and customers can add items to the cart.');
      return;
    }

    // Check if item is in stock (only for logged-in buyers)
    if (user?.role === 'buyer') {
      if (this.item.quantity === 0) {
        alert(this.translation.t('common.outOfStock') || 'This item is out of stock.');
        return;
      }
      
      // Check if already in cart and if adding would exceed stock
      const existing = this.cartItems.find(ci => ci._id === this.item._id);
      if (existing) {
        // If already in cart, check if current quantity + 1 would exceed stock
        const totalAfterAdd = existing.quantity + 1;
        if (totalAfterAdd > this.item.quantity) {
          const maxCanAdd = this.item.quantity - existing.quantity;
          if (maxCanAdd <= 0) {
            alert(this.translation.t('cart.maxStockReached') || `You already have ${existing.quantity} in cart. Maximum available stock: ${this.item.quantity}`);
          } else {
            alert(this.translation.t('cart.insufficientStock') || `Only ${this.item.quantity} available in stock. You can add up to ${maxCanAdd} more.`);
          }
          return;
        }
      } else {
        // Not in cart yet, but check if adding 1 would exceed stock
        if (1 > this.item.quantity) {
          alert(this.translation.t('cart.insufficientStock') || `Only ${this.item.quantity} available in stock.`);
          return;
        }
      }
    }

    // Check if already in cart
    if (this.isInCart()) {
      const existing = this.cartItems.find(ci => ci._id === this.item._id);
      if (existing) {
        await this.cartService.removeFromCart(existing);
        return;
      }
    }

    // Add to cart
    // Backend already returns prices with markup for buyers, so use price as-is
    const cartItem: CartItem = {
      _id: this.item._id,
      categoryId: this.item.categoryId || '',
      categoryName: this.item.categoryName,
      name: this.item.name,
      image: this.item.image,
      points: this.item.points || 0,
      price: this.item.price, // Backend already applies markup for buyers
      measurement_unit: this.item.measurement_unit,
      quantity: 1
    };

    try {
      await this.cartService.addToCart(cartItem);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert(this.translation.t('common.addToCartFailed') || 'Failed to add item to cart.');
    }
  }

  get locale(): string {
    return this.translation.getLocale();
  }

  get itemName(): string {
    return typeof this.item.name === 'string' 
      ? this.item.name 
      : (this.locale === 'ar' ? this.item.name.ar : this.item.name.en);
  }

  get itemRoute(): string {
    const name = typeof this.item.name === 'string' 
      ? this.item.name 
      : this.item.name.en;
    return `/marketplace/${encodeURIComponent(name)}`;
  }

  get shouldShowStockInfo(): boolean {
    const user = this.authService.getUser();
    const fromMarketPlace = localStorage.getItem('fromMarketPlace') === 'true';
    // Check if we have category filter (coming from category page)
    const urlParams = new URLSearchParams(window.location.search);
    const hasCategoryFilter = urlParams.has('category') && urlParams.get('category') !== 'all';
    
    // Don't show stock for customers unless they're viewing pure marketplace (without category filter)
    // When coming from category page, don't show stock for customers
    if (user?.role === 'customer') {
      return fromMarketPlace && !hasCategoryFilter;
    }
    // For buyers, always show stock
    return true;
  }

  get canAddToCart(): boolean {
    const user = this.authService.getUser();
    if (!user) return false;
    
    const fromMarketPlace = localStorage.getItem('fromMarketPlace') === 'true';
    // Check if we have category filter (coming from category page)
    const urlParams = new URLSearchParams(window.location.search);
    const hasCategoryFilter = urlParams.has('category') && urlParams.get('category') !== 'all';
    
    // Customers can add to cart when:
    // 1. Not from marketplace view (fromMarketPlace = false)
    // 2. Or when coming from category page (hasCategoryFilter = true)
    if (user.role === 'customer') {
      return !fromMarketPlace || hasCategoryFilter;
    }
    // Buyers can always add to cart
    return user.role === 'buyer';
  }

}
