import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrdersService, Order, Payment } from '../../../../core/services/orders.service';
import { AuthService, User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ApiService } from '../../../../core/services/api';
import { PointsService } from '../../../../core/services/points.service';
import { OrderCardComponent } from '../order-card/order-card';
import { PointsActivityComponent } from '../points-activity/points-activity';
import { MembershipTierComponent } from '../membership-tier/membership-tier';
import { ItemsModalComponent } from '../items-modal/items-modal';
import { StatBoxComponent } from '../stat-box/stat-box';
import { ToastrService } from 'ngx-toastr';

type TabType = 'incoming' | 'completed' | 'cancelled' | 'payments';

@Component({
  selector: 'app-buyer-orders',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    OrderCardComponent,
    PointsActivityComponent,
    MembershipTierComponent,
    ItemsModalComponent,
    StatBoxComponent
  ],
  templateUrl: './buyer-orders.html',
  styleUrls: ['./buyer-orders.scss']
})
export class BuyerOrdersComponent implements OnInit, OnDestroy {
  user = signal<User | null>(null);
  allOrders = signal<Order[]>([]);
  payments = signal<Payment[]>([]);
  loading = signal(true);
  paymentsLoading = signal(false);
  activeTab = signal<TabType>('incoming');
  isItemsModalOpen = signal(false);
  selectedOrderItems = signal<any[]>([]);
  userPoints = signal<any>(null);
  pointsLoading = signal(false);

  private subscriptions = new Subscription();

  tabs: TabType[] = ['incoming', 'completed', 'cancelled', 'payments'];

  constructor(
    private ordersService: OrdersService,
    private authService: AuthService,
    public translation: TranslationService,
    private api: ApiService,
    private pointsService: PointsService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.authService.user$.subscribe(user => {
        this.user.set(user);
        if (user) {
          this.loadOrders();
          this.loadUserPoints();
          if (this.activeTab() === 'payments') {
            this.loadPayments();
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Helper method to check if an order is completed (handles both 'completed' and 'collected' statuses)
  private isOrderCompleted(status: string | undefined): boolean {
    if (!status) return false;
    const normalized = status.toLowerCase().trim();
    return normalized === 'completed' || normalized === 'collected';
  }

  filteredOrders = computed(() => {
    const orders = this.allOrders();
    const user = this.user();
    const tab = this.activeTab();

    return orders.filter(order => {
      const status = order.status?.toLowerCase() || order.status;
      if (user?.role === 'buyer' && status === 'cancelled') return false;
      if (tab === 'incoming') return ['pending', 'assigntocourier'].includes(status);
      if (tab === 'completed') return this.isOrderCompleted(order.status);
      if (tab === 'cancelled') return status === 'cancelled';
      return true;
    });
  });

  stats = computed(() => {
    const orders = this.allOrders();
    const points = this.userPoints();
    return {
      totalRecycles: orders.filter(o => this.isOrderCompleted(o.status)).length,
      points: points?.totalPoints || 0
    };
  });

  visibleTabs = computed(() => {
    const user = this.user();
    return this.tabs.filter(tab => !(tab === 'cancelled' && user?.role === 'buyer'));
  });

  loadOrders(): void {
    this.loading.set(true);
    this.ordersService.getOrders().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allOrders.set(response.data);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load orders:', error);
        this.loading.set(false);
      }
    });
  }

  loadPayments(): void {
    const user = this.user();
    if (!user?._id) return;

    this.paymentsLoading.set(true);
    this.ordersService.getUserPayments(user._id).subscribe({
      next: (payments) => {
        this.payments.set(payments);
        this.paymentsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load payments:', error);
        this.paymentsLoading.set(false);
      }
    });
  }

  loadUserPoints(): void {
    const user = this.user();
    if (!user?._id) return;

    // Only load points for customers - admins, delivery, and buyers don't have points
    if (user.role !== 'customer') {
      console.log('ℹ️ Points are only available for customers. Current role:', user.role);
      this.userPoints.set({
        totalPoints: 0,
        pointsHistory: []
      });
      this.pointsLoading.set(false);
      return;
    }

    this.pointsLoading.set(true);
    this.pointsService.getUserPoints().subscribe({
      next: (response) => {
        this.userPoints.set({
          totalPoints: response.totalPoints,
          pointsHistory: response.pointsHistory || []
        });
        this.pointsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load user points:', error);
        this.pointsLoading.set(false);
      }
    });
  }

  setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
    if (tab === 'payments') {
      this.loadPayments();
    }
  }

  openItemsModal(items: any[]): void {
    this.selectedOrderItems.set(items);
    this.isItemsModalOpen.set(true);
  }

  closeItemsModal(): void {
    this.selectedOrderItems.set([]);
    this.isItemsModalOpen.set(false);
  }

  onCancelOrder(orderId: string): void {
    this.ordersService.cancelOrder(orderId, 'Order cancelled by buyer').subscribe({
      next: () => {
        this.toastr.success(this.translation.t('Order cancelled successfully') || 'Order cancelled successfully');
        this.loadOrders(); // Reload orders to update the list
      },
      error: (error) => {
        console.error('Failed to cancel order:', error);
        let errorMessage = this.translation.t('Failed to cancel order') || 'Failed to cancel order';
        if (error.status === 404) {
          errorMessage = this.translation.t('Order not found or cannot be cancelled') || 'Order not found or cannot be cancelled';
        } else if (error.status === 400) {
          errorMessage = this.translation.t('This order cannot be cancelled') || 'This order cannot be cancelled';
        }
        this.toastr.error(errorMessage);
      }
    });
  }

  onDeleteOrder(orderId: string): void {
    this.ordersService.deleteOrder(orderId).subscribe({
      next: () => {
        this.toastr.success(this.translation.t('Order deleted successfully') || 'Order deleted successfully');
        this.loadOrders(); // Reload orders to update the list
      },
      error: (error) => {
        console.error('Failed to delete order:', error);
        let errorMessage = this.translation.t('Failed to delete order') || 'Failed to delete order';
        if (error.status === 404) {
          errorMessage = this.translation.t('Order not found') || 'Order not found';
        } else if (error.status === 403) {
          errorMessage = this.translation.t('You are not authorized to delete this order') || 'You are not authorized to delete this order';
        }
        this.toastr.error(errorMessage);
      }
    });
  }
}

