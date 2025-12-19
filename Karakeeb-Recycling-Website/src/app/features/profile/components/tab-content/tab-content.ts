import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStar, faReceipt, faMapPin } from '@fortawesome/free-solid-svg-icons';
import { User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { Order } from '../profile/profile';
import { PaymentHistoryComponent } from '../payment-history/payment-history';
import { ReviewsTabComponent, Review, ReviewableOrder } from '../reviews-tab/reviews-tab';
import { ItemsModalComponent } from '../../../buyer-orders/components/items-modal/items-modal';

@Component({
  selector: 'app-tab-content',
  standalone: true,
  imports: [CommonModule, RouterLink, FontAwesomeModule, PaymentHistoryComponent, ReviewsTabComponent, ItemsModalComponent],
  templateUrl: './tab-content.html',
  styleUrls: ['./tab-content.scss']
})
export class TabContentComponent {
  @Input() activeTab: string = 'incoming';
  @Input() isLoading: boolean = false;
  @Input() isReviewsLoading: boolean = false;
  @Input() filteredOrders: Order[] = [];
  @Input() user!: User;
  @Input() userReviews: Review[] = [];
  @Output() cancelOrder = new EventEmitter<string>();
  @Output() deleteOrder = new EventEmitter<string>();
  @Output() editReview = new EventEmitter<ReviewableOrder>();
  @Output() deleteReview = new EventEmitter<string>();

  // Icons
  faStar = faStar;
  faReceipt = faReceipt;
  faMapPin = faMapPin;

  // Modal state
  showItemsModal = signal(false);
  selectedOrderItems: any[] = [];
  selectedOrderStatus: string = '';

  constructor(
    public translation: TranslationService,
    private router: Router
  ) {}

  getStatusIcon(status: string): string {
    const normalized = this.normalizeStatus(status);
    if (['assigntocourier'].includes(normalized)) return 'truck';
    if (['pending'].includes(normalized)) return 'clock';
    if (this.isOrderCompleted(status)) return 'check';
    if (normalized === 'cancelled') return 'x';
    return 'clock';
  }

  getStatusColor(status: string): string {
    const normalized = this.normalizeStatus(status);
    if (['assigntocourier'].includes(normalized)) return 'yellow';
    if (['pending'].includes(normalized)) return 'yellow';
    if (this.isOrderCompleted(status)) return 'green';
    if (normalized === 'cancelled') return 'red';
    return 'gray';
  }

  getStatusLabel(status: string): string {
    const normalized = this.normalizeStatus(status);
    const statusMap: { [key: string]: string } = {
      'assigntocourier': 'profile.orders.status.inTransit',
      'pending': 'profile.orders.status.pending',
      'completed': 'profile.orders.status.completed',
      'collected': 'profile.orders.status.completed', // Treat 'collected' as completed
      'cancelled': 'profile.orders.status.cancelled'
    };
    return this.translation.t(statusMap[normalized] || 'profile.orders.status.pending') || normalized;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatAddress(address: Order['address']): string {
    if (!address) return '';
    return `${address.street}, Bldg ${address.building}, Floor ${address.floor}, ${address.area}, ${address.city}`;
  }

  onCancelClick(orderId: string): void {
    // Emit cancel order event - parent component will handle confirmation
    this.cancelOrder.emit(orderId);
  }

  onCardClick(order: Order): void {
    if (this.canTrack(order)) {
      this.router.navigate(['/pickup/tracking', order._id]);
    }
  }

  onViewDetails(event: Event, order: Order): void {
    event.stopPropagation();
    this.selectedOrderItems = order.items || [];
    this.selectedOrderStatus = order.status;
    this.showItemsModal.set(true);
  }

  onCloseItemsModal(): void {
    this.showItemsModal.set(false);
    this.selectedOrderItems = [];
  }

  onRateOrder(order: Order): void {
    // Create a mock order object for the review modal
    const reviewableOrder: ReviewableOrder = {
      _id: order._id,
      items: order.items || [],
      status: order.status,
      createdAt: order.createdAt,
      address: order.address
    };
    this.editReview.emit(reviewableOrder);
  }

  hasExistingReview(orderId: string): boolean {
    return this.userReviews.some(review => review.orderId === orderId);
  }

  // Helper method to normalize status (case-insensitive)
  private normalizeStatus(status: string | undefined): string {
    if (!status) return '';
    return status.toLowerCase().trim();
  }

  // Helper method to check if an order is completed (handles both 'completed' and 'collected' statuses)
  private isOrderCompleted(status: string | undefined): boolean {
    const normalized = this.normalizeStatus(status);
    return normalized === 'completed' || normalized === 'collected';
  }

  canRate(order: Order): boolean {
    return this.isOrderCompleted(order.status) && 
           (this.user?.role === 'customer' || this.user?.role === 'buyer');
  }

  canCancel(order: Order): boolean {
    // Both customers and buyers can cancel pending orders (not assigned to courier)
    const status = this.normalizeStatus(order.status);
    return status === 'pending' && (this.user?.role === 'customer' || this.user?.role === 'buyer');
  }

  canDelete(order: Order): boolean {
    // Buyers can delete cancelled or completed orders
    if (this.user?.role !== 'buyer') return false;
    const status = this.normalizeStatus(order.status);
    return status === 'cancelled' || status === 'completed' || status === 'collected';
  }

  onDeleteClick(event: Event, orderId: string): void {
    event.stopPropagation();
    this.deleteOrder.emit(orderId);
  }

  canTrack(order: Order): boolean {
    const status = this.normalizeStatus(order.status);
    return ['assigntocourier', 'pending', 'arrived', 'collected'].includes(status);
  }

  showReceipt(order: Order): boolean {
    const status = this.normalizeStatus(order.status);
    return ['collected', 'completed'].includes(status);
  }
}

