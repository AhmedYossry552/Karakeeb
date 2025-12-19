import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, User } from '../../../../core/services/auth.service';
import { EWalletService, Transaction } from '../../../../core/services/ewallet.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../../core/services/api';
import { WithdrawModalComponent } from '../withdraw-modal/withdraw-modal';
import { TransactionsModalComponent } from '../transactions-modal/transactions-modal';
import { RedeemPointsComponent } from '../redeem-points/redeem-points';

const paymentGateways = [
  { id: 'paypal', name: 'PayPal', icon: '💳' },
  { id: 'stripe', name: 'Stripe', icon: '💳' },
  { id: 'bank', name: 'Bank Transfer', icon: '🏦' },
  { id: 'venmo', name: 'Venmo', icon: '📱' },
  { id: 'cashapp', name: 'Cash App', icon: '💵' },
  { id: 'wise', name: 'Wise', icon: '🌍' }
];

@Component({
  selector: 'app-ewallet',
  standalone: true,
  imports: [CommonModule, RouterLink, WithdrawModalComponent, TransactionsModalComponent, RedeemPointsComponent],
  templateUrl: './ewallet.html',
  styleUrls: ['./ewallet.scss']
})
export class EWalletComponent implements OnInit {
  user = signal<User | null>(null);
  balance = signal(0);
  transactions = signal<Transaction[]>([]);
  loading = signal(true);
  showWithdrawModal = signal(false);
  showTransactionsModal = signal(false);
  showRedeemPointsModal = signal(false);
  recentTransactions = signal<Transaction[]>([]);

  gateways = paymentGateways;

  constructor(
    private authService: AuthService,
    private ewalletService: EWalletService,
    public translation: TranslationService,
    private toastr: ToastrService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user.set(user);
      if (user?._id) {
        this.loadData();
      }
    });
  }

  loadData(): void {
    const user = this.user();
    if (!user?._id) return;

    this.loading.set(true);
    
    // Load balance
    this.ewalletService.getBalance(user._id).subscribe({
      next: (response: any) => {
        this.balance.set(response.balance || 0);
      },
      error: (error) => {
        console.error('Failed to load balance from wallet endpoint:', error);
        // Try fallback to user endpoint
        this.ewalletService.getBalanceFromUser(user._id).subscribe({
          next: (userData: any) => {
            this.balance.set(userData.balance || 0);
          },
          error: () => {
            this.balance.set(0);
          }
        });
      }
    });

    // Load transactions
    this.ewalletService.getTransactions(user._id).subscribe({
      next: (response: any) => {
        const raw = response.transactions || response || [];
        const transactionsArray = Array.isArray(raw) ? raw : [];
        // Sort by date (newest first)
        const sorted = transactionsArray.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        this.transactions.set(sorted);
        this.recentTransactions.set(sorted.slice(0, 5));
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load transactions:', error);
        this.loading.set(false);
      }
    });
  }

  onWithdrawSuccess(): void {
    this.loadData();
    this.showWithdrawModal.set(false);
  }

  onRedeemSuccess(): void {
    this.loadData();
    this.showRedeemPointsModal.set(false);
  }

  getTransactionTypeLabel(type: string): string {
    const key = `ewallet.transactions.types.${type}`;
    return this.translation.t(key) || type;
  }

  getTransactionIcon(type: string): string {
    const icons: Record<string, string> = {
      cashback: '💰',
      withdrawal: '📤',
      deposit: '📥',
      recycle: '♻️',
      redeem: '🎁',
      purchase: '🛒'
    };
    return icons[type] || '💳';
  }
}
