import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OrdersService, Order } from '../../../../core/services/orders.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { getPriceWithMarkup } from '../../../../core/utils/price.utils';

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receipt.html',
  styleUrls: ['./receipt.scss']
})
export class ReceiptComponent implements OnInit {
  orderId: string | null = null;
  order = signal<Order | null>(null);
  loading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private ordersService: OrdersService,
    public translation: TranslationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.params['id'];
    if (this.orderId) {
      this.loadOrder();
    }
  }

  loadOrder(): void {
    if (!this.orderId) return;

    this.ordersService.getOrderById(this.orderId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.order.set(response.data);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load receipt:', error);
        this.loading.set(false);
      }
    });
  }

  getTotalPoints(): number {
    const order = this.order();
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + (item.points || 0) * (item.quantity || 0), 0);
  }

  getFormattedDate(): string {
    const order = this.order();
    if (!order) return '';
    return new Date(order.createdAt).toLocaleDateString();
  }

  getFormattedAddress(): string {
    const order = this.order();
    if (!order) return '';
    const addr = order.address;
    return `${addr.street}, Bldg ${addr.building}, Floor ${addr.floor}, ${addr.area}, ${addr.city}`;
  }

  getItemName(item: any): string {
    if (typeof item.name === 'string') return item.name;
    const locale = this.translation.getLocale();
    return locale === 'ar' ? item.name.ar : item.name.en;
  }

  getItemPrice(item: any): number {
    // Apply markup for buyers to match marketplace prices
    const user = this.authService.getUser();
    return getPriceWithMarkup(item.price || 0, user?.role);
  }

  getTotalPrice(): number {
    const order = this.order();
    if (!order) return 0;
    return order.items.reduce((sum, item) => {
      const itemPrice = this.getItemPrice(item);
      return sum + itemPrice * (item.quantity || 0);
    }, 0) + (order.deliveryFee || 0);
  }
}
