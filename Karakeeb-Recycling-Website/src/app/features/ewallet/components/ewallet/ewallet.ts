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
      if (user) {
        // Get user ID - try multiple possible field names
        const userId = user._id || user.id || (user as any).userId;
        if (userId) {
          this.loadData();
        }
      }
    });
  }

  loadData(): void {
    const user = this.user();
    if (!user) {
      console.log('⚠️ No user found for loading wallet data');
      this.balance.set(0);
      this.transactions.set([]);
      this.recentTransactions.set([]);
      this.loading.set(false);
      return;
    }

    // Get user ID - try multiple possible field names
    const userId = user._id || user.id || (user as any).userId;
    if (!userId) {
      console.error('❌ User ID not found for loading wallet data. User object:', JSON.stringify(user, null, 2));
      this.balance.set(0);
      this.transactions.set([]);
      this.recentTransactions.set([]);
      this.loading.set(false);
      return;
    }

    // Only load wallet for customers
    if (user.role !== 'customer') {
      console.log('⚠️ Wallet is only available for customers. Current role:', user.role);
      this.balance.set(0);
      this.transactions.set([]);
      this.recentTransactions.set([]);
      this.loading.set(false);
      return;
    }

    console.log('🔄 Loading wallet data for user:', userId);
    this.loading.set(true);
    
    // Load balance
    this.ewalletService.getBalance(userId).subscribe({
      next: (response: any) => {
        const balance = response.balance || 0;
        console.log('✅ Wallet balance loaded:', balance);
        this.balance.set(balance);
      },
      error: (error) => {
        console.error('❌ Failed to load balance from wallet endpoint:', error);
        // Try fallback to user endpoint
        this.ewalletService.getBalanceFromUser(userId).subscribe({
          next: (userData: any) => {
            const balance = userData.balance || 0;
            console.log('✅ Wallet balance loaded from fallback:', balance);
            this.balance.set(balance);
          },
          error: (fallbackError) => {
            console.error('❌ Fallback wallet balance load also failed:', fallbackError);
            this.balance.set(0);
          }
        });
      }
    });

    // Load transactions
    this.ewalletService.getTransactions(userId).subscribe({
      next: (response: any) => {
        console.log('📥 Raw transactions response:', response);
        const raw = response.transactions || response || [];
        const transactionsArray = Array.isArray(raw) ? raw : [];
        
        // Map and format transactions
        const formatted = transactionsArray.map((t: any) => ({
          _id: t._id || t.Id || t.id || '',
          type: (t.type || t.Type || 'cashback').toLowerCase(),
          amount: t.amount || t.Amount || 0,
          date: t.date || t.Date || t.transactionDate || t.TransactionDate || new Date().toISOString(),
          description: t.description || t.Description || t.reason || t.Reason || '',
          status: t.status || t.Status || 'completed',
          gateway: t.gateway || t.Gateway || ''
        }));
        
        // Sort by date (newest first)
        const sorted = formatted.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        console.log('✅ Formatted transactions:', sorted.length, 'entries');
        this.transactions.set(sorted);
        this.recentTransactions.set(sorted.slice(0, 5));
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Failed to load transactions:', error);
        this.transactions.set([]);
        this.recentTransactions.set([]);
        this.loading.set(false);
      }
    });
  }

  onWithdrawSuccess(): void {
    console.log('🔄 Refreshing wallet data after successful withdrawal...');
    // Add a small delay to ensure backend has processed the transaction
    setTimeout(() => {
      this.loadData();
    }, 500);
    // Modal will be closed by withdraw component after showing success
  }

  onRedeemSuccess(): void {
    console.log('🔄 Refreshing wallet data after successful redemption...');
    // Add a small delay to ensure backend has processed the transaction
    setTimeout(() => {
      this.loadData();
    }, 500);
    // Don't close modal immediately - let user see success message
    // Modal will be closed by redeem component after showing success
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
