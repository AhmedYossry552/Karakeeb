import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-card.html',
  styleUrls: ['./payment-card.scss']
})
export class PaymentCardComponent {
  @Input() payment: any;

  formatDate(timestamp: number): string {
    if (!timestamp) return 'Unknown Date';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatAmount(amount: number): string {
    return (amount / 100).toFixed(2);
  }

  getPaymentId(paymentId: string): string {
    return paymentId?.slice(-8) || 'N/A';
  }
}

