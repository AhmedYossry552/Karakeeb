import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Payment } from '../../../../core/services/admin.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, Subject, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-transactions.html',
  styleUrl: './admin-transactions.scss'
})
export class AdminTransactionsComponent implements OnInit {
  payments = signal<Payment[]>([]);
  isLoading = signal(false);
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalPages = signal(1);
  totalItems = signal(0);
  searchTerm = signal('');
  selectedStatus: string = '';
  selectedCurrency: string = '';
  startDate: string = '';
  endDate: string = '';
  private searchSubject = new Subject<string>();
  selectedPayment: Payment | null = null;
  showRefundModal = signal(false);
  refundAmount = signal(0);
  refundReason = signal('');
  paymentStats = signal<any | null>(null);
  walletSummary = signal<{
    totalCashback: number;
    totalWithdrawals: number;
    buyerCashTotal: number;
    totalCustomerPoints?: number;
    remainingPointsValue?: number;
  } | null>(null);

  totalIn = signal(0);
  totalOut = signal(0);
  profit = signal(0);
  rewardsCost = signal(0);
  remainingPointsValue = signal(0);

  cashbackTransactions = signal<any[]>([]);
  cashbackPage = signal(1);
  cashbackTotalPages = signal(1);

  buyerCashOrders = signal<any[]>([]);
  buyerCashOrdersPage = signal(1);
  buyerCashOrdersTotalPages = signal(1);
  buyerCashOrdersLoading = signal(false);

  constructor(
    private adminService: AdminService,
    public translation: TranslationService,
    private toastr: ToastrService
  ) {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.currentPage.set(1);
      this.loadPayments();
    });
  }

  ngOnInit(): void {
    // Load all data in parallel for better performance
    this.isLoading.set(true);
    forkJoin({
      payments: this.loadPaymentsObservable(),
      walletSummary: this.loadWalletSummaryObservable(),
      cashbacks: this.loadCashbacksObservable(),
      buyerCashOrders: this.loadBuyerCashOrdersObservable()
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading transactions data:', error);
        this.isLoading.set(false);
      }
    });
  }

  // Observable versions for parallel loading
  private loadPaymentsObservable() {
    const filters: any = {};
    if (this.selectedStatus) filters.status = this.selectedStatus;
    if (this.startDate) filters.startDate = this.startDate;
    if (this.endDate) filters.endDate = this.endDate;
    if (this.selectedCurrency) filters.currency = this.selectedCurrency;
    if (this.searchTerm()) filters.search = this.searchTerm();

    return this.adminService.getPayments(this.currentPage(), this.itemsPerPage(), filters).pipe(
      map((response) => {
        if (response.success && response.data) {
          this.payments.set(response.data);
          this.paymentStats.set(response.stats || null);
          if (response.pagination) {
            this.totalPages.set(response.pagination.totalPages || 1);
            this.totalItems.set(response.pagination.total || 0);
          } else {
            this.totalPages.set(1);
            this.totalItems.set(response.data.length || 0);
          }
        } else {
          this.payments.set([]);
          this.paymentStats.set(null);
        }
        this.recalculateTotals();
        return response;
      })
    );
  }

  private loadWalletSummaryObservable() {
    return this.adminService.getWalletSummary().pipe(
      map((response) => {
        const data = response?.data || response || {};
        this.walletSummary.set({
          totalCashback: data.totalCashback || 0,
          totalWithdrawals: data.totalWithdrawals || 0,
          buyerCashTotal: data.buyerCashTotal || 0,
          totalCustomerPoints: data.totalCustomerPoints || 0,
          remainingPointsValue: data.remainingPointsValue || 0
        });
        return response;
      })
    );
  }

  private loadCashbacksObservable() {
    return this.adminService.getCashbackTransactions(this.cashbackPage(), 10).pipe(
      map((response) => {
        if (response?.success && Array.isArray(response.data)) {
          this.cashbackTransactions.set(response.data);
          const pagination = response.pagination || {};
          this.cashbackTotalPages.set(pagination.totalPages || 1);
        } else {
          this.cashbackTransactions.set([]);
          this.cashbackTotalPages.set(1);
        }
        return response;
      })
    );
  }

  private loadBuyerCashOrdersObservable() {
    this.buyerCashOrdersLoading.set(true);
    return this.adminService.getOrders(this.buyerCashOrdersPage(), 10, 'buyer').pipe(
      map((response) => {
        const data = response?.data || response || [];
        const orders = Array.isArray(data) ? data : [];
        const cashOrders = orders.filter((o: any) =>
          (o.paymentMethod || '').toLowerCase() === 'cash'
        );
        this.buyerCashOrders.set(cashOrders);
        this.buyerCashOrdersTotalPages.set(response?.totalPages || 1);
        this.buyerCashOrdersLoading.set(false);
        return response;
      })
    );
  }

  loadPayments(): void {
    this.isLoading.set(true);
    
    const filters: any = {};
    if (this.selectedStatus) filters.status = this.selectedStatus;
    if (this.startDate) filters.startDate = this.startDate;
    if (this.endDate) filters.endDate = this.endDate;
    if (this.selectedCurrency) filters.currency = this.selectedCurrency;
    if (this.searchTerm()) filters.search = this.searchTerm();

    this.adminService.getPayments(this.currentPage(), this.itemsPerPage(), filters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.payments.set(response.data);
          this.paymentStats.set(response.stats || null);
          if (response.pagination) {
            this.totalPages.set(response.pagination.totalPages || 1);
            this.totalItems.set(response.pagination.total || 0);
          } else {
            this.totalPages.set(1);
            this.totalItems.set(response.data.length || 0);
          }
        } else {
          this.payments.set([]);
          this.paymentStats.set(null);
        }
        this.isLoading.set(false);
        this.recalculateTotals();
      },
      error: (error) => {
        console.error('Error loading payments:', error);
        this.toastr.error('Failed to load transactions');
        this.isLoading.set(false);
        this.paymentStats.set(null);
        this.recalculateTotals();
      }
    });
  }

  loadCashbacks(): void {
    this.adminService.getCashbackTransactions(this.cashbackPage(), 10).subscribe({
      next: (response) => {
        if (response?.success && Array.isArray(response.data)) {
          this.cashbackTransactions.set(response.data);
          const pagination = response.pagination || {};
          this.cashbackTotalPages.set(pagination.totalPages || 1);
        } else {
          this.cashbackTransactions.set([]);
          this.cashbackTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('Error loading cashback transactions:', error);
        this.cashbackTransactions.set([]);
      }
    });
  }

  onCashbackPageChange(page: number): void {
    if (page < 1 || page > this.cashbackTotalPages()) return;
    this.cashbackPage.set(page);
    this.loadCashbacks();
  }

  loadBuyerCashOrders(): void {
    this.buyerCashOrdersLoading.set(true);
    const page = this.buyerCashOrdersPage();

    this.adminService.getOrders(page, 10, 'buyer').subscribe({
      next: (response) => {
        const data = response?.data || response || [];
        const orders = Array.isArray(data) ? data : [];

        const cashOrders = orders.filter((o: any) =>
          (o.paymentMethod || '').toLowerCase() === 'cash'
        );

        this.buyerCashOrders.set(cashOrders);
        this.buyerCashOrdersTotalPages.set(response?.totalPages || 1);
        this.buyerCashOrdersLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading buyer cash orders:', error);
        this.buyerCashOrders.set([]);
        this.buyerCashOrdersTotalPages.set(1);
        this.buyerCashOrdersLoading.set(false);
      }
    });
  }

  onBuyerCashOrdersPageChange(page: number): void {
    if (page < 1 || page > this.buyerCashOrdersTotalPages()) return;
    this.buyerCashOrdersPage.set(page);
    this.loadBuyerCashOrders();
  }

  loadWalletSummary(): void {
    this.adminService.getWalletSummary().subscribe({
      next: (response) => {
        const data = response?.data || response || {};
        this.walletSummary.set({
          totalCashback: data.totalCashback || 0,
          totalWithdrawals: data.totalWithdrawals || 0,
          buyerCashTotal: data.buyerCashTotal || 0,
          totalCustomerPoints: data.totalCustomerPoints || 0,
          remainingPointsValue: data.remainingPointsValue || 0
        });
        this.recalculateTotals();
      },
      error: (error) => {
        console.error('Error loading wallet summary:', error);
      }
    });
  }

  getPaymentStatus(payment: Payment): string {
    if (payment.refunded || (payment.amount_refunded || 0) > 0) return 'refunded';
    if (payment.disputed) return 'disputed';
    if (payment.failure_code) return 'failed';
    if ((payment.amount_captured || 0) === payment.amount) return 'succeeded';
    if ((payment.amount_captured || 0) > 0) return 'partially_captured';
    return payment.status || 'pending';
  }

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPayments();
  }

  onItemsPerPageChange(items: number): void {
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
    this.loadPayments();
  }

  onRefund(payment: Payment): void {
    this.selectedPayment = payment;
    this.refundAmount.set(payment.amount - (payment.amount_refunded || 0));
    this.showRefundModal.set(true);
  }

  processRefund(): void {
    if (!this.selectedPayment) return;
    if (!this.refundReason().trim()) {
      this.toastr.error('Please provide a refund reason');
      return;
    }

    this.adminService.refundPayment(
      this.selectedPayment.id,
      this.refundAmount(),
      this.refundReason(),
      this.selectedPayment.billing_details?.email
    ).subscribe({
      next: () => {
        this.toastr.success('Refund processed successfully');
        this.showRefundModal.set(false);
        this.selectedPayment = null;
        this.refundAmount.set(0);
        this.refundReason.set('');
        this.loadPayments();
      },
      error: (error) => {
        console.error('Error processing refund:', error);
        this.toastr.error('Failed to process refund');
      }
    });
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.currentPage.set(1);
    this.loadPayments();
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadPayments();
  }

  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedCurrency = '';
    this.startDate = '';
    this.endDate = '';
    this.searchTerm.set('');
    this.currentPage.set(1);
    this.loadPayments();
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      succeeded: 'status-succeeded',
      pending: 'status-pending',
      failed: 'status-failed',
      refunded: 'status-refunded',
      disputed: 'status-disputed',
      partially_captured: 'status-partial'
    };
    return classes[status] || 'status-pending';
  }

  formatAmount(amount: number, currency: string = 'egp'): string {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }

  formatDate(timestamp?: number): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private recalculateTotals(): void {
    const stats = this.paymentStats();
    const wallet = this.walletSummary();

    let totalInStripe = 0;
    if (stats) {
      const totalRevenue = (stats.totalRevenue ?? stats.totalAmount ?? 0) as number;
      totalInStripe = (totalRevenue || 0) / 100; // Stripe amounts are in cents
    }

    const cashIn = wallet?.buyerCashTotal || 0;
    const totalIn = totalInStripe + cashIn;

    const cashback = wallet?.totalCashback || 0;
    const remainingValue = wallet?.remainingPointsValue || 0;
    const totalOut = cashback + remainingValue;

    this.totalIn.set(totalIn);
    this.totalOut.set(totalOut);
    this.profit.set(totalIn - totalOut);
    this.rewardsCost.set(cashback);
    this.remainingPointsValue.set(remainingValue);
  }
}
