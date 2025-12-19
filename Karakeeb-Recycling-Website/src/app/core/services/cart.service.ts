import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { ApiService } from './api';
import { AuthService } from './auth.service';
import { getPriceWithMarkup } from '../utils/price.utils';

export interface CartItem {
  _id: string; // ItemId from backend
  cartItemId?: number; // CartItemId from backend (for update/delete operations)
  categoryId: string;
  categoryName: string | { en: string; ar: string };
  name: string | { en: string; ar: string };
  image: string;
  points: number;
  price: number;
  measurement_unit: number;
  quantity: number;
  paymentMethod?: string;
  deliveryFee?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadingItemIdSubject = new BehaviorSubject<string | null>(null);
  private isSaving = false;

  cart$ = this.cartSubject.asObservable();
  isLoading$ = this.loadingSubject.asObservable();
  loadingItemId$ = this.loadingItemIdSubject.asObservable();

  constructor(
    private api: ApiService,
    private authService: AuthService
  ) {
    this.loadCart();
  }

  get cart(): CartItem[] {
    return this.cartSubject.value;
  }

  get totalItems(): number {
    return this.cartSubject.value.length;
  }

  get userRole(): 'customer' | 'buyer' {
    const user = this.authService.getUser();
    return user?.role === 'buyer' ? 'buyer' : 'customer';
  }

  private get isLoggedIn(): boolean {
    return !!this.authService.getUser();
  }

  async loadCart(): Promise<void> {
    this.loadingSubject.next(true);
    try {
      if (!this.isLoggedIn) {
        console.log('User not logged in, cart is empty');
        this.cartSubject.next([]);
        return;
      }

      console.log('Loading cart from backend...');
      const response = await firstValueFrom(this.api.get<any>('/cart'));
      console.log('GetCart response:', JSON.stringify(response, null, 2));
      // Backend returns { items: [...] } where each item has _id = ItemId and id/cartItemId = CartItemId
      // Cart API returns base prices, so we need to apply markup for buyers
      const items = response?.items || [];
      console.log('Items from response:', items, 'count:', items.length);
      
      const user = this.authService.getUser();
      const isBuyer = user?.role === 'buyer';
      
      const cartItems: CartItem[] = items.map((item: any) => {
        const basePrice = item.price || item.Price || 0;
        // Apply markup for buyers to match marketplace prices
        const finalPrice = isBuyer ? getPriceWithMarkup(basePrice, 'buyer') : basePrice;
        
        return {
          _id: item._id || item.itemId || item.ItemId,
          cartItemId: item.cartItemId || item.id || item.Id, // CartItemId from backend
          categoryId: item.categoryId || item._id || item.itemId || item.ItemId,
          categoryName: item.categoryName || { en: item.categoryNameEn || item.CategoryNameEn, ar: item.categoryNameAr || item.CategoryNameAr },
          name: item.name || { en: item.nameEn || item.NameEn, ar: item.nameAr || item.NameAr },
          image: item.image || item.Image || '',
          points: item.points || item.Points || 0,
          price: finalPrice, // Apply markup for buyers
          measurement_unit: item.measurement_unit || item.measurementUnit || item.MeasurementUnit || 1,
          quantity: item.quantity || item.Quantity || 0
        };
      });
      console.log('Cart loaded from backend, items count:', cartItems.length, 'items:', cartItems);
      this.cartSubject.next(cartItems);
    } catch (error: any) {
      console.error('Failed to load cart from backend:', error);
      if (error?.status === 401) {
        console.log('User not authenticated, cart is empty');
      }
      this.cartSubject.next([]);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async addToCart(item: CartItem): Promise<void> {
    if (!this.isLoggedIn) {
      throw new Error('Please login to add items to cart');
    }

    this.loadingItemIdSubject.next(item._id);
    try {
      // Backend only needs ItemId and Quantity - it fetches item details from database
      const request = {
        itemId: item._id,
        quantity: item.quantity
      };

      // Backend returns CartDto directly
      const cartDto = await firstValueFrom(this.api.post<any>('/cart', request));
      // Backend returns CartDto with Items (capital I) property
      // Cart API returns base prices, so we need to apply markup for buyers
      const items = cartDto?.Items || cartDto?.items || [];
      
      const user = this.authService.getUser();
      const isBuyer = user?.role === 'buyer';
      
      // Transform CartItemDto[] to CartItem[]
      const cartItems: CartItem[] = items.map((item: any) => {
        const basePrice = item.Price || item.price || 0;
        const finalPrice = isBuyer ? getPriceWithMarkup(basePrice, 'buyer') : basePrice;
        
        return {
        _id: item.ItemId || item.itemId || item._id,
        cartItemId: item.Id || item.id, // Store CartItemId for update/delete
        categoryId: item.categoryId || item.ItemId || item.itemId,
        categoryName: item.categoryName || { en: item.CategoryNameEn || item.categoryNameEn, ar: item.CategoryNameAr || item.categoryNameAr },
        name: item.name || { en: item.NameEn || item.nameEn, ar: item.NameAr || item.nameAr },
        image: item.Image || item.image || '',
        points: item.Points || item.points || 0,
        price: finalPrice, // Apply markup for buyers
        measurement_unit: item.MeasurementUnit || item.measurementUnit || item.measurement_unit || 1,
        quantity: item.Quantity || item.quantity || 0
        };
      });
      this.cartSubject.next(cartItems);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    } finally {
      this.loadingItemIdSubject.next(null);
    }
  }

  async removeFromCart(item: CartItem): Promise<void> {
    if (!this.isLoggedIn) {
      throw new Error('Please login to remove items from cart');
    }

    this.loadingItemIdSubject.next(item._id);
    try {
      // Backend expects CartItemId (int), not ItemId
      const currentCart = this.cartSubject.value;
      const cartItem = currentCart.find(ci => ci._id === item._id);
      if (!cartItem || !cartItem.cartItemId) {
        // If cartItemId not available, reload cart first to get it
        await this.loadCart();
        const updatedCart = this.cartSubject.value;
        const updatedItem = updatedCart.find(ci => ci._id === item._id);
        if (!updatedItem || !updatedItem.cartItemId) {
          throw new Error('Cart item not found or cartItemId missing');
        }
        item = updatedItem;
      }
      
      console.log('Deleting cart item with cartItemId:', item.cartItemId);
      const cartDto = await firstValueFrom(this.api.delete<any>(`/cart/${item.cartItemId}`));
      console.log('Delete response:', JSON.stringify(cartDto, null, 2));
      
      // Backend returns CartDto directly (not wrapped in object)
      // CartDto has: { id, items, totalAmount, totalPoints }
      // JSON serialization in .NET converts PascalCase to camelCase: { id, items, totalAmount, totalPoints }
      // Cart API returns base prices, so we need to apply markup for buyers
      const items = cartDto?.items || cartDto?.Items || [];
      console.log('Items after delete (raw):', items, 'count:', items.length);
      
      const user = this.authService.getUser();
      const isBuyer = user?.role === 'buyer';
      
      // Transform CartItemDto[] to CartItem[]
      const cartItems: CartItem[] = items.map((item: any) => {
        const basePrice = item.Price || item.price || 0;
        const finalPrice = isBuyer ? getPriceWithMarkup(basePrice, 'buyer') : basePrice;
        
        return {
        _id: item.ItemId || item.itemId || item._id,
        cartItemId: item.Id || item.id,
        categoryId: item.categoryId || item.ItemId || item.itemId,
        categoryName: item.categoryName || { en: item.CategoryNameEn || item.categoryNameEn, ar: item.CategoryNameAr || item.categoryNameAr },
        name: item.name || { en: item.NameEn || item.nameEn, ar: item.NameAr || item.nameAr },
        image: item.Image || item.image || '',
        points: item.Points || item.points || 0,
          price: finalPrice, // Apply markup for buyers
          measurement_unit: item.MeasurementUnit || item.measurementUnit || item.measurement_unit || 1,
          quantity: item.Quantity || item.quantity || 0
        };
      });
      
      console.log('Cart items after transformation:', cartItems, 'count:', cartItems.length);
      this.cartSubject.next(cartItems);
      
      // Verify deletion by reloading cart after a short delay
      // This is necessary because backend may not persist the deletion immediately
      setTimeout(async () => {
        console.log('Verifying deletion by reloading cart...');
        await this.loadCart();
        const verifiedCart = this.cartSubject.value;
        console.log('Verified cart after reload:', verifiedCart.length, 'items');
        
        // If item still exists after reload, it means backend didn't persist the deletion
        const stillExists = verifiedCart.some(ci => ci._id === item._id);
        if (stillExists) {
          console.warn('Item still exists after deletion! Backend may not have persisted the change.');
          console.warn('Attempting to remove again...');
          
          // Try to remove again with the cartItemId from the reloaded cart
          const existingItem = verifiedCart.find(ci => ci._id === item._id);
          if (existingItem && existingItem.cartItemId) {
            try {
              console.log('Retrying delete with cartItemId:', existingItem.cartItemId);
              const retryResponse = await firstValueFrom(this.api.delete<any>(`/cart/${existingItem.cartItemId}`));
              const retryItems = retryResponse?.items || retryResponse?.Items || [];
              // Cart API returns base prices, so we need to apply markup for buyers
              const user = this.authService.getUser();
              const isBuyer = user?.role === 'buyer';
              
              const retryCartItems: CartItem[] = retryItems.map((item: any) => {
                const basePrice = item.Price || item.price || 0;
                // Apply markup for buyers to match marketplace prices
                const finalPrice = isBuyer ? getPriceWithMarkup(basePrice, 'buyer') : basePrice;
                
                return {
                  _id: item.ItemId || item.itemId || item._id,
                  cartItemId: item.Id || item.id,
                  categoryId: item.categoryId || item.ItemId || item.itemId,
                  categoryName: item.categoryName || { en: item.CategoryNameEn || item.categoryNameEn, ar: item.CategoryNameAr || item.CategoryNameAr },
                  name: item.name || { en: item.NameEn || item.nameEn, ar: item.NameAr || item.nameAr },
                  image: item.Image || item.image || '',
                  points: item.Points || item.points || 0,
                  price: finalPrice, // Apply markup for buyers
                  measurement_unit: item.MeasurementUnit || item.measurementUnit || item.measurement_unit || 1,
                  quantity: item.Quantity || item.quantity || 0
                };
              });
              this.cartSubject.next(retryCartItems);
              console.log('Retry delete successful, cart now has', retryCartItems.length, 'items');
              
              // Reload one more time to verify
              setTimeout(async () => {
                await this.loadCart();
              }, 300);
            } catch (retryError) {
              console.error('Retry delete failed:', retryError);
            }
          }
        } else {
          console.log('Deletion verified successfully!');
        }
      }, 500);
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      throw error;
    } finally {
      this.loadingItemIdSubject.next(null);
    }
  }

  async updateQuantity(item: CartItem, quantity: number): Promise<void> {
    if (!this.isLoggedIn) {
      throw new Error('Please login to update cart');
    }

    if (quantity <= 0) {
      await this.removeFromCart(item);
      return;
    }

    this.loadingItemIdSubject.next(item._id);
    try {
      // Backend needs CartItemId (int) - this is the cart item ID from database
      const currentCart = this.cartSubject.value;
      const cartItem = currentCart.find(ci => ci._id === item._id);
      if (!cartItem || !cartItem.cartItemId) {
        // If cartItemId not available, reload cart first to get it
        await this.loadCart();
        const updatedCart = this.cartSubject.value;
        const updatedItem = updatedCart.find(ci => ci._id === item._id);
        if (!updatedItem || !updatedItem.cartItemId) {
          throw new Error('Cart item not found or cartItemId missing');
        }
        item = updatedItem;
      }
      
      const request = {
        cartItemId: item.cartItemId!,
        quantity: quantity
      };

      const cartDto = await firstValueFrom(this.api.put<any>('/cart', request));
      // Backend returns CartDto with Items (capital I) property
      const items = cartDto?.Items || cartDto?.items || [];
      
      // Cart API returns base prices, so we need to apply markup for buyers
      const user = this.authService.getUser();
      const isBuyer = user?.role === 'buyer';
      
      // Transform CartItemDto[] to CartItem[]
      const cartItems: CartItem[] = items.map((item: any) => {
        const basePrice = item.Price || item.price || 0;
        const finalPrice = isBuyer ? getPriceWithMarkup(basePrice, 'buyer') : basePrice;
        
        return {
          _id: item.ItemId || item.itemId || item._id,
          cartItemId: item.Id || item.id, // Store CartItemId for future operations
          categoryId: item.categoryId || item.ItemId || item.itemId,
          categoryName: item.categoryName || { en: item.CategoryNameEn || item.categoryNameEn, ar: item.CategoryNameAr || item.categoryNameAr },
          name: item.name || { en: item.NameEn || item.nameEn, ar: item.NameAr || item.nameAr },
          image: item.Image || item.image || '',
          points: item.Points || item.points || 0,
          price: finalPrice, // Apply markup for buyers
          measurement_unit: item.MeasurementUnit || item.measurementUnit || item.measurement_unit || 1,
          quantity: item.Quantity || item.quantity || 0
        };
      });
      this.cartSubject.next(cartItems);
    } catch (error) {
      console.error('Failed to update quantity:', error);
      throw error;
    } finally {
      this.loadingItemIdSubject.next(null);
    }
  }

  async clearCart(): Promise<void> {
    if (!this.isLoggedIn) {
      this.cartSubject.next([]);
      return;
    }

    this.loadingSubject.next(true);
    try {
      await firstValueFrom(this.api.delete('/cart'));
      this.cartSubject.next([]);
      console.log('Cart cleared from backend');
    } catch (error: any) {
      console.error('Failed to clear cart from backend:', error);
      if (error?.status !== 401) {
        throw error;
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

}

