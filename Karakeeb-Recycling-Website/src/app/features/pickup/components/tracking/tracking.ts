import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { OrdersService, Order } from '../../../../core/services/orders.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { CancelOrderDialogComponent } from '../../../../shared/components/cancel-order-dialog/cancel-order-dialog';
import { SafetyDialogComponent } from '../../../../shared/components/safety-dialog/safety-dialog';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../../core/services/auth.service';
import { getPriceWithMarkup } from '../../../../core/utils/price.utils';

interface TrackingStep {
  id: string;
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CancelOrderDialogComponent,
    SafetyDialogComponent
  ],
  templateUrl: './tracking.html',
  styleUrls: ['./tracking.scss']
})
export class TrackingComponent implements OnInit, OnDestroy {
  orderId: string | null = null;
  order = signal<Order | null>(null);
  loading = signal(true);
  showCancelDialog = signal(false);
  showSafetyDialog = signal(false);

  private subscription?: Subscription;

  trackingSteps: TrackingStep[] = [
    {
      id: 'pending',
      label: 'Order Confirmed',
      description: 'Your order has been confirmed',
      icon: '✓'
    },
    {
      id: 'assigntocourier',
      label: 'Driver Assigned',
      description: 'A driver has been assigned to your order',
      icon: '👤'
    },
    {
      id: 'collected',
      label: 'Items Collected',
      description: 'Your items have been collected',
      icon: '📦'
    },
    {
      id: 'completed',
      label: 'Complete',
      description: 'Your order has been completed',
      icon: '✅'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ordersService: OrdersService,
    public translation: TranslationService,
    private toastr: ToastrService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.params['id'];
    if (this.orderId) {
      this.loadOrder();
      this.startPolling();
    } else {
      this.router.navigate(['/buyer-orders']);
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadOrder(): void {
    if (!this.orderId) return;

    this.ordersService.getOrderById(this.orderId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.order.set(response.data);
          // Stop polling if order is completed or cancelled
          if (['completed', 'cancelled'].includes(response.data.status)) {
            this.stopPolling();
          }
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load order:', error);
        this.loading.set(false);
      }
    });
  }

  startPolling(): void {
    // Poll every 5 seconds for active orders
    this.subscription = interval(5000).subscribe(() => {
      const order = this.order();
      if (order && !['completed', 'cancelled'].includes(order.status)) {
        this.loadOrder();
      }
    });
  }

  stopPolling(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getCurrentStepIndex(): number {
    const order = this.order();
    if (!order) return 0;
    const index = this.trackingSteps.findIndex(step => step.id === order.status);
    return index >= 0 ? index : 0;
  }

  isStepCompleted(stepIndex: number): boolean {
    return stepIndex < this.getCurrentStepIndex();
  }

  isStepActive(stepIndex: number): boolean {
    return stepIndex === this.getCurrentStepIndex();
  }

  onCancelOrder(reason: string): void {
    if (!this.orderId) return;

    this.ordersService.cancelOrder(this.orderId, reason).subscribe({
      next: () => {
        this.toastr.success(this.translation.t('pickup.orderCancelled') !== 'pickup.orderCancelled' ? this.translation.t('pickup.orderCancelled') : 'Order cancelled successfully');
        this.showCancelDialog.set(false);
        this.loadOrder();
      },
      error: (error) => {
        console.error('Failed to cancel order:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error
        });
        
        let errorMessage = this.translation.t('pickup.cancelError') !== 'pickup.cancelError' ? this.translation.t('pickup.cancelError') : 'Failed to cancel order';
        
        if (error.status === 404) {
          const order = this.order();
          if (order?.status === 'assigntocourier') {
            errorMessage = this.translation.t('pickup.cancelNotAllowedAssigned') !== 'pickup.cancelNotAllowedAssigned' ? this.translation.t('pickup.cancelNotAllowedAssigned') : 'This order cannot be cancelled because it has been assigned to a courier';
          } else {
            errorMessage = this.translation.t('pickup.orderNotFound') !== 'pickup.orderNotFound' ? this.translation.t('pickup.orderNotFound') : 'Order not found or cannot be cancelled';
          }
        } else if (error.status === 400) {
          errorMessage = this.translation.t('pickup.cancelNotAllowed') !== 'pickup.cancelNotAllowed' ? this.translation.t('pickup.cancelNotAllowed') : 'This order cannot be cancelled';
        } else if (error.status === 401) {
          errorMessage = this.translation.t('pickup.unauthorized') !== 'pickup.unauthorized' ? this.translation.t('pickup.unauthorized') : 'You are not authorized to cancel this order';
        }
        
        this.toastr.error(errorMessage);
      }
    });
  }

  getFormattedAddress(): string {
    const order = this.order();
    if (!order || !order.address) return 'Address not available';
    
    const addr = order.address;
    const parts: string[] = [];
    
    if (addr.street) parts.push(addr.street);
    if (addr.building) parts.push(`Bldg ${addr.building}`);
    if (addr.floor) parts.push(`Floor ${addr.floor}`);
    if (addr.apartment) parts.push(`Apartment ${addr.apartment}`);
    if (addr.area) parts.push(addr.area);
    if (addr.city) parts.push(addr.city);
    
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  }

  getAddressParts(): { label: string; value: string }[] {
    const order = this.order();
    if (!order || !order.address) return [];
    
    const addr = order.address;
    const parts: { label: string; value: string }[] = [];
    
    if (addr.street) {
      parts.push({ label: 'Street', value: addr.street });
    }
    if (addr.building) {
      parts.push({ label: 'Building', value: addr.building });
    }
    if (addr.floor) {
      parts.push({ label: 'Floor', value: addr.floor });
    }
    if (addr.apartment) {
      parts.push({ label: 'Apartment', value: addr.apartment });
    }
    if (addr.area) {
      parts.push({ label: 'Area', value: addr.area });
    }
    if (addr.city) {
      parts.push({ label: 'City', value: addr.city });
    }
    if (addr.landmark) {
      parts.push({ label: 'Landmark', value: addr.landmark });
    }
    
    return parts;
  }

  getItemPrice(item: any): number {
    // Apply markup for buyers to match marketplace prices
    const user = this.authService.getUser();
    return getPriceWithMarkup(item.price || 0, user?.role);
  }

  getTotalPrice(): number {
    const order = this.order();
    if (!order) return 0;
    
    // Calculate from items with markup applied for buyers
    if (order.items && order.items.length > 0) {
      const itemsTotal = order.items.reduce((sum, item) => {
        const itemPrice = this.getItemPrice(item);
        return sum + (itemPrice * (item.quantity || 0));
      }, 0);
      
      // Add delivery fee if available
      const deliveryFee = order.deliveryFee || 0;
      return itemsTotal + deliveryFee;
    }
    
    // If no items, try to use totalPrice (but it might be base price, so prefer calculated)
    if (order.totalPrice && order.totalPrice > 0) {
      // For buyers, we need to recalculate with markup
      const user = this.authService.getUser();
      if (user?.role === 'buyer' && order.items && order.items.length > 0) {
        // Already calculated above, return it
        const itemsTotal = order.items.reduce((sum, item) => {
          const itemPrice = this.getItemPrice(item);
          return sum + (itemPrice * (item.quantity || 0));
        }, 0);
        return itemsTotal + (order.deliveryFee || 0);
      }
      return order.totalPrice;
    }
    
    return 0;
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': this.translation.t('profile.orders.status.pending') || 'Pending',
      'assigntocourier': this.translation.t('profile.orders.status.inTransit') || 'In Transit',
      'collected': this.translation.t('profile.orders.status.collected') || 'Collected',
      'completed': this.translation.t('profile.orders.status.completed') || 'Completed',
      'cancelled': this.translation.t('profile.orders.status.cancelled') || 'Cancelled'
    };
    return statusMap[status] || status;
  }
}

