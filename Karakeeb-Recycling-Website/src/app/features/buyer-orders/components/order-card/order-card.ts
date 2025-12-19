import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Order, OrderItem } from '../../../../core/services/orders.service';
import { User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-order-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-card.html',
  styleUrls: ['./order-card.scss']
})
export class OrderCardComponent {
  @Input() order!: Order;
  @Input() user!: User;
  @Output() viewDetails = new EventEmitter<OrderItem[]>();
  @Output() deleteOrder = new EventEmitter<string>();
  @Output() cancelOrder = new EventEmitter<string>();

  showAddressDetails = signal(false);

  constructor(public translation: TranslationService) {}

  // Helper method to check if an order is completed (handles both 'completed' and 'collected' statuses)
  private isOrderCompleted(status: string | undefined): boolean {
    if (!status) return false;
    const normalized = status.toLowerCase().trim();
    return normalized === 'completed' || normalized === 'collected';
  }

  getStatusIcon(): string {
    const status = this.order.status;
    if (['assigntocourier'].includes(status)) return '🚚';
    if (['pending'].includes(status)) return '⏰';
    if (this.isOrderCompleted(status)) return '✅';
    if (status === 'cancelled') return '❌';
    return '📦';
  }

  getStatusText(): string {
    const status = this.order.status;
    if (['assigntocourier'].includes(status)) {
      return this.translation.t('In Transit') || 'In Transit';
    }
    if (['pending'].includes(status)) {
      return this.translation.t('Pending') || 'Pending';
    }
    if (this.isOrderCompleted(status)) {
        return this.translation.t('Completed') || 'Completed';
    }
    if (status === 'cancelled') {
      return this.translation.t('Cancelled') || 'Cancelled';
    }
    return status;
  }

  getStatusClass(): string {
    const status = this.order.status;
    if (['assigntocourier'].includes(status)) return 'status-yellow';
    if (['pending'].includes(status)) return 'status-yellow-light';
    if (this.isOrderCompleted(status)) return 'status-green';
    if (status === 'cancelled') return 'status-red';
    return 'status-gray';
  }

  onViewDetails(): void {
    this.viewDetails.emit(this.order.items);
  }

  getFormattedDate(): string {
    return new Date(this.order.createdAt).toLocaleDateString();
  }

  getFormattedAddress(): string {
    const addr = this.order.address;
    if (!addr) return '';
    const street = addr.street || '';
    const building = addr.building || '';
    const floor = addr.floor || '';
    const apartment = addr.apartment || '';
    const area = addr.area || '';
    const city = addr.city || '';
    
    let formatted = `${street}, Bldg ${building}`;
    if (floor) formatted += `, Floor ${floor}`;
    if (apartment) formatted += `, Apt ${apartment}`;
    formatted += `, ${area}, ${city}`;
    return formatted;
  }

  toggleAddressDetails(): void {
    this.showAddressDetails.set(!this.showAddressDetails());
  }

  getAddressField(field: string): string {
    const addr = this.order.address;
    if (!addr) return '-';
    const value = (addr as any)[field];
    return value || '-';
  }

  canDelete(): boolean {
    // Buyers can delete cancelled or completed orders
    if (this.user?.role !== 'buyer') return false;
    const status = this.order.status?.toLowerCase() || '';
    return status === 'cancelled' || status === 'completed' || status === 'collected';
  }

  canCancel(): boolean {
    // Buyers can cancel pending orders (not assigned to courier)
    if (this.user?.role !== 'buyer') return false;
    const status = this.order.status?.toLowerCase() || '';
    return status === 'pending';
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    if (confirm(this.translation.t('Are you sure you want to delete this order?') || 'Are you sure you want to delete this order?')) {
      this.deleteOrder.emit(this.order._id);
    }
  }

  onCancel(event: Event): void {
    event.stopPropagation();
    if (confirm(this.translation.t('Are you sure you want to cancel this order?') || 'Are you sure you want to cancel this order?')) {
      this.cancelOrder.emit(this.order._id);
    }
  }
}

