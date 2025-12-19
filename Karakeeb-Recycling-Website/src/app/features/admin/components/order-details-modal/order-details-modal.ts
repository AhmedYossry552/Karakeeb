import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';
import { OrderItem, OrdersService } from '../../../../core/services/orders.service';
import { Order } from '../../../../core/services/admin.service';

@Component({
  selector: 'app-order-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-details-modal.html',
  styleUrls: ['./order-details-modal.scss']
})
export class OrderDetailsModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() order: Order | null = null;
  @Output() onClose = new EventEmitter<void>();

  items = signal<OrderItem[]>([]);
  isLoading = signal(false);
  orderStatus = signal<string>('');

  constructor(
    public translation: TranslationService,
    private ordersService: OrdersService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.order) {
      this.loadOrderDetails();
    }
  }

  loadOrderDetails(): void {
    if (!this.order || !this.order._id) return;

    // Check if items are already in the order object
    if (this.order.items && Array.isArray(this.order.items) && this.order.items.length > 0) {
      this.processItems(this.order.items);
      this.orderStatus.set(this.order.status || '');
      return;
    }

    // If items are not in the order, fetch full order details using regular orders endpoint
    this.isLoading.set(true);
    this.ordersService.getOrderById(this.order._id).subscribe({
      next: (response) => {
        console.log('📦 Full order response:', response);
        // Handle response structure: { success: boolean; data: Order }
        const orderData = response.success && response.data ? response.data : (response as any);
        if (orderData && orderData.items) {
          this.processItems(orderData.items);
        }
        if (orderData && orderData.status) {
          this.orderStatus.set(orderData.status);
        } else {
          this.orderStatus.set(this.order.status || '');
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading order details:', error);
        this.isLoading.set(false);
        // Show empty state if we can't load items
        this.items.set([]);
      }
    });
  }

  processItems(orderItems: any[]): void {
    if (!orderItems || orderItems.length === 0) {
      this.items.set([]);
      return;
    }

    // Transform items if needed (handle different API response formats)
    const processedItems = orderItems.map((item: any) => {
      // Handle different property names
      return {
        _id: item._id || item.id,
        name: item.name || item.itemName || item.displayName || 'Unknown Item',
        image: item.image || item.imageUrl || '',
        quantity: item.quantity || 0,
        price: item.price || 0,
        points: item.points || item.totalPoints || 0,
        categoryId: item.categoryId,
        categoryName: item.categoryName || item.category || '',
        measurement_unit: item.measurement_unit || item.measurementUnit || 2
      };
    });
    
    console.log('📦 Processed items:', processedItems);
    this.items.set(processedItems);
  }

  handleClose(): void {
    this.onClose.emit();
  }

  getItemName(item: OrderItem): string {
    if (typeof item.name === 'string') return item.name;
    const locale = this.translation.getLocale();
    return locale === 'ar' ? item.name?.ar || '' : item.name?.en || '';
  }

  getCategoryName(item: OrderItem): string {
    if (!item.categoryName) return '';
    if (typeof item.categoryName === 'string') return item.categoryName;
    const locale = this.translation.getLocale();
    return locale === 'ar' ? item.categoryName.ar || '' : item.categoryName.en || '';
  }

  getTotalQuantity(): number {
    return this.items().reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  getTotalPrice(): number {
    return this.items().reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  }

  getTotalPoints(): number {
    return this.items().reduce((sum, item) => sum + (item.points || 0) * (item.quantity || 0), 0);
  }

  getMeasurementUnit(item: OrderItem): string {
    return item.measurement_unit === 1 ? 'KG' : 'piece';
  }
}

