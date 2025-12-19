import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EWalletService } from '../../../../core/services/ewallet.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';

interface PaymentGateway {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-withdraw-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './withdraw-modal.html',
  styleUrls: ['./withdraw-modal.scss']
})
export class WithdrawModalComponent {
  @Input() show = false;
  @Input() balance = 0;
  @Input() gateways: PaymentGateway[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  withdrawAmount = signal('');
  selectedGateway = signal('');
  paymentStep = signal(1);
  isProcessing = signal(false);
  processedAmount = signal('');

  constructor(
    private ewalletService: EWalletService,
    private authService: AuthService,
    public translation: TranslationService,
    private toastr: ToastrService
  ) {}

  onWithdraw(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('onWithdraw called, amount:', this.withdrawAmount(), 'balance:', this.balance);
    
    const amountStr = this.withdrawAmount().trim();
    if (!amountStr) {
      this.toastr.error(this.translation.t('Please enter a withdrawal amount') || 'Please enter a withdrawal amount');
      return;
    }

    const amount = parseFloat(amountStr);
    
    if (isNaN(amount)) {
      this.toastr.error(this.translation.t('Invalid amount. Please enter a valid number.') || 'Invalid amount. Please enter a valid number.');
      return;
    }

    if (amount <= 0) {
      this.toastr.error(this.translation.t('Amount must be greater than zero') || 'Amount must be greater than zero');
      return;
    }

    if (amount < 10) {
      this.toastr.error(this.translation.t('Minimum withdrawal is 10.00 EGP') || 'Minimum withdrawal is 10.00 EGP');
      return;
    }

    if (amount > this.balance) {
      this.toastr.error(this.translation.t('You cannot withdraw more than your balance') || 'You cannot withdraw more than your balance');
      return;
    }

    // Check if gateways are available
    if (!this.gateways || this.gateways.length === 0) {
      console.error('No payment gateways available');
      this.toastr.error(this.translation.t('Payment gateways not available. Please try again later.') || 'Payment gateways not available. Please try again later.');
      return;
    }

    // All validations passed, proceed to payment gateway selection
    console.log('Moving to step 2, gateways:', this.gateways);
    this.paymentStep.set(2);
  }

  async processPayment(): Promise<void> {
    if (!this.selectedGateway() || !this.withdrawAmount()) return;

    const user = this.authService.getUser();
    if (!user?._id) return;

    this.isProcessing.set(true);
    this.paymentStep.set(2);

    try {
      const amount = parseFloat(this.withdrawAmount());
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        this.toastr.error(this.translation.t('Invalid amount') || 'Invalid amount');
        this.paymentStep.set(1);
        return;
      }
      
      if (amount > this.balance) {
        this.toastr.error(this.translation.t('Insufficient balance') || 'Insufficient balance');
        this.paymentStep.set(1);
        return;
      }
      
      if (amount < 10) {
        this.toastr.error(this.translation.t('Minimum withdrawal is 10.00 EGP') || 'Minimum withdrawal is 10.00 EGP');
        this.paymentStep.set(1);
        return;
      }
      
      const response = await firstValueFrom(this.ewalletService.withdraw(user._id, amount, this.selectedGateway()));
      console.log('Withdrawal response:', response);
      
      this.processedAmount.set(this.withdrawAmount());
      this.paymentStep.set(3);

      setTimeout(() => {
        this.closeModal();
        this.success.emit();
        this.toastr.success(this.translation.t('ewallet.withdrawSuccess') !== 'ewallet.withdrawSuccess' ? this.translation.t('ewallet.withdrawSuccess') : 'Withdrawal processed successfully!');
      }, 1000);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      let errorMessage = this.translation.t('ewallet.withdrawError') !== 'ewallet.withdrawError' ? this.translation.t('ewallet.withdrawError') : 'Failed to process payment';
      
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.status === 400) {
        errorMessage = this.translation.t('Invalid request. Please check your balance and try again.') || 'Invalid request. Please check your balance and try again.';
      } else if (error?.status === 401) {
        errorMessage = this.translation.t('Please login to continue') || 'Please login to continue';
      }
      
      this.toastr.error(errorMessage);
      this.paymentStep.set(1);
    } finally {
      this.isProcessing.set(false);
    }
  }

  closeModal(): void {
    this.withdrawAmount.set('');
    this.selectedGateway.set('');
    this.paymentStep.set(1);
    this.processedAmount.set('');
    this.close.emit();
  }

  canWithdraw(): boolean {
    const amount = this.getAmountValue();
    return amount >= 10 && amount <= this.balance && amount > 0;
  }

  get minWithdraw(): number {
    return 10;
  }

  getAmountValue(): number {
    const amountStr = this.withdrawAmount().trim();
    if (!amountStr) return 0;
    const amount = parseFloat(amountStr);
    return isNaN(amount) ? 0 : amount;
  }
}
