import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdersService, Order } from '../../../../core/services/orders.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-pickup-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmation.html',
  styleUrls: ['./confirmation.scss']
})
export class PickupConfirmationComponent implements OnInit {
  orderId: string | null = null;
  order: Order | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ordersService: OrdersService,
    public translation: TranslationService
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.queryParams['orderId'];
    if (this.orderId) {
      this.loadOrder();
    } else {
      this.router.navigate(['/cart']);
    }
  }

  loadOrder(): void {
    if (!this.orderId) return;

    this.ordersService.getOrderById(this.orderId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.order = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load order:', error);
        this.loading = false;
      }
    });
  }

  getFormattedAddress(): string {
    if (!this.order) return '';
    const addr = this.order.address;
    return `${addr.street}, Bldg ${addr.building}, Floor ${addr.floor}, ${addr.area}, ${addr.city}`;
  }
}

