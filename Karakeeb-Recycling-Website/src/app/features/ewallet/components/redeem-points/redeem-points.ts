import { Component, OnInit, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, User } from '../../../../core/services/auth.service';
import { PointsService, UserPoints } from '../../../../core/services/points.service';
import { ApiService } from '../../../../core/services/api';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { EWalletService } from '../../../../core/services/ewallet.service';

const POINTS_TO_CURRENCY_RATIO = 19; // 19 points = 1 EGP

const VOUCHERS = [
  { id: '1', name: 'Talabat Mart', value: '50 EGP', points: 500 },
  { id: '2', name: 'Breadfast', value: '30 EGP', points: 300 },
  { id: '3', name: 'Seoudi', value: '20 EGP', points: 250 }
];

@Component({
  selector: 'app-redeem-points',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './redeem-points.html',
  styleUrls: ['./redeem-points.scss']
})
export class RedeemPointsComponent implements OnInit {
  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  user = signal<User | null>(null);
  userPoints = signal<{ totalPoints: number; pointsHistory: any[] } | null>(null);
  pointsLoading = signal(false);
  isProcessing = signal(false);
  
  activeOption: 'money' | 'voucher' | null = null;
  selectedVoucher: string | null = null;
  qrVisible = signal(false);
  qrValue = signal('');
  redeemedVouchers = signal<Set<string>>(new Set());
  
  redeemForm!: FormGroup;
  vouchers = VOUCHERS;
  amountValue = signal<number>(0);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private pointsService: PointsService,
    private api: ApiService,
    public translation: TranslationService,
    private toastr: ToastrService,
    private ewalletService: EWalletService
  ) {
    this.redeemForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]]
    });

    // Track form value changes
    this.redeemForm.get('amount')?.valueChanges.subscribe(value => {
      const numValue = value ? (typeof value === 'string' ? parseFloat(value) : Number(value)) : 0;
      this.amountValue.set(isNaN(numValue) ? 0 : numValue);
    });
  }

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user.set(user);
      if (user?._id) {
        this.loadUserPoints();
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
    // Use /points/me endpoint which is authorized for the current user
    // This ensures we get the latest points including points from completed orders
    this.pointsService.getUserPoints().subscribe({
      next: (response) => {
        const total = response.totalPoints || 0;
        const history = response.pointsHistory || [];

        this.userPoints.set({
          totalPoints: total,
          pointsHistory: history
        });

 
        this.pointsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load user points:', error);
        // Fallback: try direct API call
        this.pointsLoading.set(false);
      }
    });
  }

  get totalPoints(): number {
    return this.userPoints()?.totalPoints || 0;
  }

  calculations = computed(() => {
    const amount = this.amountValue();
    const requiredPoints = Math.ceil(amount * POINTS_TO_CURRENCY_RATIO);
    const remainingPoints = this.totalPoints - requiredPoints;
    const maxAvailable = Math.floor(this.totalPoints / POINTS_TO_CURRENCY_RATIO);

    return {
      requiredPoints,
      remainingPoints,
      maxAvailable,
      isValidAmount: amount > 0 && !isNaN(amount) && requiredPoints <= this.totalPoints && requiredPoints > 0
    };
  });

  voucherStates = computed(() => {
    return this.vouchers.map(voucher => {
      const isRedeemed = this.redeemedVouchers().has(voucher.id);
      const canRedeem = this.totalPoints >= voucher.points && !isRedeemed;
      const isSelected = this.selectedVoucher === voucher.id;

      return {
        ...voucher,
        isRedeemed,
        canRedeem,
        isSelected,
        needsMorePoints: voucher.points - this.totalPoints
      };
    });
  });

  setActiveOption(option: 'money' | 'voucher'): void {
    this.activeOption = option;
    if (option === 'money') {
      this.selectedVoucher = null;
      this.qrVisible.set(false);
    } else {
      this.redeemForm.get('amount')?.setValue('');
    }
  }

  selectVoucher(voucherId: string): void {
    if (this.redeemedVouchers().has(voucherId)) return;
    this.selectedVoucher = this.selectedVoucher === voucherId ? null : voucherId;
  }

  async handleRedeem(): Promise<void> {
    if (!this.activeOption || this.isProcessing()) return;

    const user = this.user();
    if (!user?._id) return;

    this.isProcessing.set(true);

    try {
      if (this.activeOption === 'money') {
        const calc = this.calculations();
        if (!calc.isValidAmount) {
          this.toastr.error(
            this.translation.t('ewallet.notEnoughPoints') || 'You don\'t have enough points',
            this.translation.t('ewallet.invalidAmount') || 'Invalid Amount'
          );
          this.isProcessing.set(false);
          return;
        }

        const amount = parseFloat(this.redeemForm.get('amount')?.value);

        // Use backend endpoint to convert points to wallet cashback in a single atomic operation
        const response: any = await firstValueFrom(
          this.api.post(`/users/${user._id}/points/convert`, {
            amount
          })
        );

        const cashAdded = response?.data?.cashAdded ?? amount;

        this.toastr.success(
          `${cashAdded} EGP has been added to your wallet!`,
          this.translation.t('ewallet.success') || 'Success'
        );
        
        // Reload points to show updated balance
        this.loadUserPoints();
        this.redeemForm.reset();
        this.qrVisible.set(false);
        this.activeOption = null;
        this.success.emit(); // Emit success to parent to refresh points in profile
      } else if (this.activeOption === 'voucher') {
        const voucher = this.vouchers.find(v => v.id === this.selectedVoucher);
        if (!voucher) {
          this.toastr.warning(
            this.translation.t('ewallet.selectVoucher') || 'Please select a voucher',
            this.translation.t('ewallet.warning') || 'Warning'
          );
          this.isProcessing.set(false);
          return;
        }

        if (this.redeemedVouchers().has(voucher.id) || this.totalPoints < voucher.points) {
          this.isProcessing.set(false);
          return;
        }

        await firstValueFrom(this.pointsService.deductPoints(user._id, {
          points: voucher.points,
          reason: `Voucher redeemed: ${voucher.name}`
        }));

        const qrText = `${this.translation.t('ewallet.voucher') || 'Voucher'}: ${voucher.name} - ${this.translation.t('ewallet.value') || 'Value'}: ${voucher.value}`;
        this.qrValue.set(qrText);
        this.qrVisible.set(true);
        this.redeemedVouchers.update(prev => new Set([...prev, voucher.id]));
        this.selectedVoucher = null;

        this.toastr.success(
          this.translation.t('ewallet.voucherReady') || 'Voucher ready!',
          this.translation.t('ewallet.success') || 'Success'
        );

        // Reload points to show updated balance
        this.loadUserPoints();
        this.success.emit(); // Emit success to parent to refresh points in profile
      }
    } catch (error: any) {
      console.error('Redemption failed:', error);
      this.toastr.error(
        error?.error?.message || this.translation.t('ewallet.couldNotDeductPoints') || 'Could not deduct points',
        this.translation.t('ewallet.error') || 'Error'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  closeModal(): void {
    this.activeOption = null;
    this.selectedVoucher = null;
    this.qrVisible.set(false);
    this.redeemForm.reset();
    this.close.emit();
  }

  downloadQR(): void {
    // QR download functionality can be added later
    this.toastr.info('QR code download feature coming soon');
  }

}

