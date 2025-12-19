import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api';
import { TranslationService } from '../../../../core/services/translation.service';
import { PaymentCardComponent } from '../payment-card/payment-card';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, PaymentCardComponent],
  templateUrl: './payment-history.html',
  styleUrls: ['./payment-history.scss']
})
export class PaymentHistoryComponent implements OnInit {
  payments: any[] = [];
  loading = true;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    public translation: TranslationService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user?._id) {
      this.loadPayments(user._id);
    }
  }

  private loadPayments(userId: string): void {
    this.loading = true;
    this.api.get<any[]>(`/users/${userId}/payments`).subscribe({
      next: (response) => {
        this.payments = Array.isArray(response) ? response : [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load payment history', error);
        this.payments = [];
        this.loading = false;
      }
    });
  }
}

