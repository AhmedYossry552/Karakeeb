import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ExtractedMaterial } from '../../../../core/services/material-extraction.service';
import { CartService, CartItem } from '../../../../core/services/cart.service';
import { ApiService } from '../../../../core/services/api';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';

interface EnrichedItem extends ExtractedMaterial {
  _id?: string;
  name?: { en: string; ar: string };
  image?: string;
  points?: number;
  price?: number;
  measurement_unit?: 1 | 2;
  categoryId?: string;
  categoryName?: { en: string; ar: string };
  found: boolean;
}

@Component({
  selector: 'app-items-display-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './items-display-card.html',
  styleUrl: './items-display-card.scss'
})
export class ItemsDisplayCardComponent implements OnInit {
  @Input() items!: ExtractedMaterial[];
  @Output() close = new EventEmitter<void>();

  localItems = signal<EnrichedItem[]>([]);
  isLoading = signal(true);
  showSuccess = signal(false);
  isAddingToCart = signal(false);

  // Computed properties for template
  get itemsInCatalog() {
    return this.localItems().filter(item => item.found);
  }

  get itemsNotInCatalog() {
    return this.localItems().filter(item => !item.found);
  }

  get hasItemsNotInCatalog() {
    return this.itemsNotInCatalog.length > 0;
  }

  get itemsInCatalogCount() {
    return this.itemsInCatalog.length;
  }

  get totalQuantity() {
    return this.itemsInCatalog.reduce((sum, item) => sum + item.quantity, 0);
  }

  get totalPoints() {
    return this.itemsInCatalog.reduce((sum, item) => sum + Math.floor(item.quantity * (item.points || 0)), 0);
  }

  get totalPrice() {
    return this.itemsInCatalog.reduce((sum, item) => sum + item.quantity * (item.price || 0), 0);
  }

  get canCheckout() {
    return this.itemsInCatalogCount === 0 || this.isAddingToCart();
  }

  get totalPriceFormatted() {
    return this.totalPrice.toFixed(2);
  }

  constructor(
    private cartService: CartService,
    private api: ApiService,
    private authService: AuthService,
    public translation: TranslationService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.enrichItems();
  }

  get isLoggedIn(): boolean {
    return !!this.authService.getUser()?._id;
  }

  getDisplayName(nameField: string | { en: string; ar: string } | undefined): string {
    if (!nameField) return '';
    if (typeof nameField === 'string') return nameField;
    const locale = this.translation.getLocale();
    return nameField[locale] || nameField.en || '';
  }

  private async enrichItems(): Promise<void> {
    this.isLoading.set(true);
    console.log('🚀 Starting item enrichment process...');

    try {
      const user = this.authService.getUser();
      const userRole = user?.role === 'buyer' ? 'buyer' : 'customer';
      
      // Fetch all items from database
      const response = await firstValueFrom(
        this.api.get<{ success: boolean; items?: any[] }>('/categories/get-items', {
          params: { all: 'true', role: userRole }
        })
      );

      const allDatabaseItems = response.items || [];
      console.log(`✅ Retrieved ${allDatabaseItems.length} items from database`);

      const mergedItems = new Map<string, EnrichedItem>();

      for (const item of this.items) {
        console.log(`🔍 Processing item: ${item.material}`);

        const dbItem = this.findMatchingItem(item.material, allDatabaseItems);

        if (dbItem) {
          console.log(`✅ Found in database: ${item.material}`);

          const enrichedItem: EnrichedItem = {
            ...item,
            material: this.getDisplayName(dbItem.name),
            _id: dbItem._id,
            name: dbItem.name,
            image: dbItem.image,
            points: dbItem.points,
            price: dbItem.price,
            measurement_unit: dbItem.measurement_unit,
            categoryId: dbItem.categoryId,
            categoryName: dbItem.categoryName,
            found: true,
          };

          if (mergedItems.has(dbItem._id)) {
            const existingItem = mergedItems.get(dbItem._id)!;
            existingItem.quantity += item.quantity;
            console.log(`🔄 Merged duplicate item: ${item.material}`);
          } else {
            mergedItems.set(dbItem._id, enrichedItem);
          }
        } else {
          console.log(`❌ Not found in database: ${item.material}`);
          const defaultItem: EnrichedItem = {
            ...item,
            points: item.unit === 'KG' ? 5 : 2,
            price: item.unit === 'KG' ? 1.5 : 0.5,
            measurement_unit: item.unit === 'KG' ? 1 : 2,
            image: '/placeholder-item.jpg',
            categoryName: { en: item.material, ar: item.material },
            found: false,
          };
          mergedItems.set(`default_${item.material}`, defaultItem);
        }
      }

      const finalEnrichedItems = Array.from(mergedItems.values());
      console.log(`✅ Enrichment complete. Found ${finalEnrichedItems.filter(i => i.found).length}/${finalEnrichedItems.length} unique items in database`);

      this.localItems.set(finalEnrichedItems);
    } catch (error) {
      console.error('❌ Error during enrichment:', error);
      this.toastr.error('Failed to load item details');
    } finally {
      this.isLoading.set(false);
    }
  }

  private findMatchingItem(itemName: string, allItems: any[]): any | null {
    const normalizedSearchName = itemName.toLowerCase().trim();

    // Try exact match
    let found = allItems.find(item => {
      const nameEn = typeof item.name === 'object' ? item.name.en?.toLowerCase() : item.name?.toLowerCase();
      const nameAr = typeof item.name === 'object' ? item.name.ar?.toLowerCase() : '';
      return nameEn === normalizedSearchName || nameAr === normalizedSearchName;
    });

    if (found) return found;

    // Try fuzzy matching (simplified)
    found = allItems.find(item => {
      const nameEn = typeof item.name === 'object' ? item.name.en?.toLowerCase() : item.name?.toLowerCase();
      const nameAr = typeof item.name === 'object' ? item.name.ar?.toLowerCase() : '';
      return nameEn?.includes(normalizedSearchName) || nameAr?.includes(normalizedSearchName) ||
             normalizedSearchName.includes(nameEn || '') || normalizedSearchName.includes(nameAr || '');
    });

    return found || null;
  }

  increaseQuantity(index: number): void {
    this.localItems.update(items =>
      items.map((item, i) => {
        if (i === index) {
          const increment = item.unit === 'pieces' ? 1 : 0.25;
          return { ...item, quantity: item.quantity + increment };
        }
        return item;
      })
    );
  }

  decreaseQuantity(index: number): void {
    this.localItems.update(items =>
      items.map((item, i) => {
        if (i === index) {
          const isPiece = item.unit === 'pieces';
          const decrement = isPiece ? 1 : 0.25;
          const minValue = isPiece ? 1 : 0.25;
          return {
            ...item,
            quantity: Math.max(item.quantity - decrement, minValue),
          };
        }
        return item;
      })
    );
  }

  removeItem(index: number): void {
    this.localItems.update(items => items.filter((_, i) => i !== index));
  }

  handleQuantityChange(index: number, value: string): void {
    const item = this.localItems()[index];

    if (value === '') {
      this.localItems.update(items =>
        items.map((it, i) => (i === index ? { ...it, quantity: 0 } : it))
      );
      return;
    }

    if (item.unit === 'pieces') {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue > 0) {
        this.localItems.update(items =>
          items.map((it, i) => (i === index ? { ...it, quantity: numValue } : it))
        );
      }
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 0) {
        this.localItems.update(items =>
          items.map((it, i) => (i === index ? { ...it, quantity: numValue } : it))
        );
      }
    }
  }

  handleQuantityBlur(index: number): void {
    const item = this.localItems()[index];
    const isKG = item.unit === 'KG';

    if (isKG) {
      const rounded = Math.round(item.quantity * 4) / 4;
      const minValue = 0.25;
      const finalValue = Math.max(rounded, minValue);
      this.localItems.update(items =>
        items.map((it, i) => (i === index ? { ...it, quantity: finalValue } : it))
      );
    } else {
      const minValue = 1;
      const finalValue = Math.max(Math.round(item.quantity || 0), minValue);
      this.localItems.update(items =>
        items.map((it, i) => (i === index ? { ...it, quantity: finalValue } : it))
      );
    }
  }

  private validateQuantityForCart(quantity: number, unit: string): boolean {
    if (unit === 'KG') {
      const multiplied = Math.round(quantity * 4);
      return multiplied >= 1 && Math.abs(quantity * 4 - multiplied) < 0.0001;
    } else {
      return Number.isInteger(quantity) && quantity >= 1;
    }
  }

  async addAllToCart(): Promise<void> {
    console.log('🛒 Starting cart addition...');
    this.isAddingToCart.set(true);

    try {
      const itemsInCatalog = this.localItems().filter(item => item.found);

      if (itemsInCatalog.length === 0) {
        this.toastr.error('No items in catalog to add to cart');
        return;
      }

      // Validate all items first
      const validItems = [];
      for (const item of itemsInCatalog) {
        if (!item.found || !item._id) {
          continue;
        }

        if (!this.validateQuantityForCart(item.quantity, item.unit)) {
          const message = item.unit === 'KG'
            ? `${item.material}: For KG items, quantity must be in 0.25 increments`
            : `${item.material}: For Piece items, quantity must be whole numbers ≥ 1`;
          this.toastr.error(message);
          continue;
        }

        validItems.push(item);
      }

      if (validItems.length === 0) {
        this.toastr.error('No valid items to add to cart');
        return;
      }

      // Add items to cart one by one
      let addedCount = 0;
      for (const item of validItems) {
        try {
          const cartItem: CartItem = {
            _id: item._id!,
            categoryId: item.categoryId!,
            categoryName: item.categoryName!,
            name: item.name!,
            image: item.image!,
            points: item.points!,
            price: item.price!,
            measurement_unit: item.measurement_unit!,
            quantity: item.quantity,
            paymentMethod: 'cash',
            deliveryFee: 0,
          };

          await this.cartService.addToCart(cartItem);
          addedCount++;
        } catch (error) {
          console.error(`Failed to add ${item.material} to cart:`, error);
        }
      }

      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);

      this.toastr.success(`Added ${addedCount} items to cart!`);
    } catch (error) {
      console.error('❌ Error in addAllToCart:', error);
      this.toastr.error('Failed to add items to cart');
    } finally {
      this.isAddingToCart.set(false);
    }
  }

  async handleCheckout(): Promise<void> {
    try {
      await this.addAllToCart();
      this.router.navigate(['/cart']);
      this.close.emit();
    } catch (error) {
      console.error('❌ Error during checkout:', error);
      this.close.emit();
    }
  }

  async handleBrowseMore(): Promise<void> {
    try {
      await this.addAllToCart();
      this.router.navigate(['/category']);
      this.close.emit();
    } catch (error) {
      console.error('❌ Error during browse more:', error);
      this.close.emit();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  // Helper methods for template
  Math = Math;
  floor = Math.floor;
  max = Math.max;
}

