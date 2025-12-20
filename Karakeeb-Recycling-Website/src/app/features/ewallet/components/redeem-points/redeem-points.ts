import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, signal, computed } from '@angular/core';
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
export class RedeemPointsComponent implements OnInit, OnChanges {
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

  ngOnChanges(changes: SimpleChanges): void {
    // Reload points when modal is opened
    if (changes['show'] && changes['show'].currentValue === true && !changes['show'].previousValue) {
      console.log('🔄 Redeem modal opened - reloading points...');
      const user = this.user();
      if (user?._id || user?.id || (user as any)?.userId) {
        this.loadUserPoints();
      }
    }
  }

  loadUserPoints(): void {
    const user = this.user();
    if (!user) {
      console.log('⚠️ No user found for loading points');
      this.userPoints.set({
        totalPoints: 0,
        pointsHistory: []
      });
      this.pointsLoading.set(false);
      return;
    }

    // Get user ID - try multiple possible field names
    const userId = user._id || user.id || (user as any).userId;
    if (!userId) {
      console.error('❌ User ID not found for loading points. User object:', JSON.stringify(user, null, 2));
      this.userPoints.set({
        totalPoints: 0,
        pointsHistory: []
      });
      this.pointsLoading.set(false);
      return;
    }

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
    console.log('🔄 Loading points for user:', userId, 'role:', user.role, 'provider:', user.provider);
    
    // Try /points/me endpoint first (authorized for current user)
    this.pointsService.getUserPoints().subscribe({
      next: (response) => {
        console.log('✅ Points loaded successfully:', response);
        const total = response.totalPoints || 0;
        const history = response.pointsHistory || [];

        this.userPoints.set({
          totalPoints: total,
          pointsHistory: history
        });

        console.log('📊 Points set - Total:', total, 'History entries:', history.length);
        this.pointsLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Failed to load user points from /points/me:', error);
        // Fallback: try direct API call with user ID
        console.log('🔄 Trying fallback: /users/' + userId + '/points');
        this.api.get<any>(`/users/${userId}/points`, {
          params: { page: 1, limit: 100 }
        }).subscribe({
          next: (fallbackResponse) => {
            console.log('✅ Fallback points loaded:', fallbackResponse);
            if (fallbackResponse?.success && fallbackResponse?.data) {
              const total = fallbackResponse.data.totalPoints || 0;
              const history = fallbackResponse.data.pointsHistory || [];
              this.userPoints.set({
                totalPoints: total,
                pointsHistory: history
              });
            }
            this.pointsLoading.set(false);
          },
          error: (fallbackError) => {
            console.error('❌ Fallback also failed:', fallbackError);
            this.userPoints.set({
              totalPoints: 0,
              pointsHistory: []
            });
            this.pointsLoading.set(false);
          }
        });
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
    if (!user) {
      this.toastr.error(
        this.translation.t('ewallet.userNotFound') || 'User not found',
        this.translation.t('ewallet.error') || 'Error'
      );
      return;
    }

    // Get user ID - try multiple possible field names
    const userId = user._id || user.id || (user as any).userId;
    if (!userId) {
      console.error('❌ User ID not found for redemption. User object:', JSON.stringify(user, null, 2));
      this.toastr.error(
        this.translation.t('ewallet.userNotFound') || 'User ID not found',
        this.translation.t('ewallet.error') || 'Error'
      );
      return;
    }

    this.isProcessing.set(true);

    try {
      if (this.activeOption === 'money') {
        const calc = this.calculations();
        if (!calc.isValidAmount) {
          const errorMsg = calc.remainingPoints < 0
            ? (this.translation.t('ewallet.notEnoughPoints') || 'You don\'t have enough points')
            : (this.translation.t('ewallet.invalidAmount') || 'Invalid amount');
          this.toastr.error(
            errorMsg,
            this.translation.t('ewallet.error') || 'Error'
          );
          this.isProcessing.set(false);
          return;
        }

        const amount = parseFloat(this.redeemForm.get('amount')?.value);
        if (!amount || amount <= 0) {
          this.toastr.error(
            this.translation.t('ewallet.invalidAmount') || 'Please enter a valid amount',
            this.translation.t('ewallet.error') || 'Error'
          );
          this.isProcessing.set(false);
          return;
        }

        console.log('🔄 Converting points to wallet:', {
          userId,
          amount,
          requiredPoints: calc.requiredPoints,
          availablePoints: this.totalPoints
        });

        // Use backend endpoint to convert points to wallet cashback in a single atomic operation
        // Backend expects { Amount: number } or null
        const response: any = await firstValueFrom(
          this.api.post(`/users/${userId}/points/convert`, {
            Amount: amount
          })
        );

        console.log('✅ Points conversion response:', response);

        if (!response?.success) {
          throw new Error(response?.message || 'Points conversion failed');
        }

        const cashAdded = response?.data?.cashAdded ?? amount;
        const pointsUsed = response?.data?.pointsUsed ?? calc.requiredPoints;
        const remainingPoints = response?.data?.remainingPoints ?? (this.totalPoints - pointsUsed);
        const newBalance = response?.data?.newBalance;

        console.log('✅ Conversion successful:', {
          cashAdded,
          pointsUsed,
          remainingPoints,
          newBalance
        });

        this.toastr.success(
          `${cashAdded} EGP has been added to your wallet! ${pointsUsed} points deducted.`,
          this.translation.t('ewallet.success') || 'Success'
        );
        
        // Reload points to show updated balance
        this.loadUserPoints();
        
        // Reset form and close modal after a short delay to show success message
        setTimeout(() => {
          this.redeemForm.reset();
          this.qrVisible.set(false);
          this.activeOption = null;
          this.success.emit(); // Emit success to parent to refresh points and wallet in profile
        }, 1500);
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

        if (this.redeemedVouchers().has(voucher.id)) {
          this.toastr.warning(
            this.translation.t('ewallet.voucherAlreadyRedeemed') || 'This voucher has already been redeemed',
            this.translation.t('ewallet.warning') || 'Warning'
          );
          this.isProcessing.set(false);
          return;
        }

        if (this.totalPoints < voucher.points) {
          this.toastr.error(
            this.translation.t('ewallet.notEnoughPoints') || `You need ${voucher.points} points to redeem this voucher`,
            this.translation.t('ewallet.error') || 'Error'
          );
          this.isProcessing.set(false);
          return;
        }

        console.log('🔄 Redeeming voucher:', {
          userId,
          voucher: voucher.name,
          pointsRequired: voucher.points,
          availablePoints: this.totalPoints
        });

        const deductResponse = await firstValueFrom(this.pointsService.deductPoints(userId, {
          points: voucher.points,
          reason: `Voucher redeemed: ${voucher.name}`
        }));

        console.log('✅ Voucher redemption successful:', deductResponse);

        const qrText = `${this.translation.t('ewallet.voucher') || 'Voucher'}: ${voucher.name} - ${this.translation.t('ewallet.value') || 'Value'}: ${voucher.value}`;
        this.qrValue.set(qrText);
        this.qrVisible.set(true);
        this.redeemedVouchers.update(prev => new Set([...prev, voucher.id]));
        this.selectedVoucher = null;

        this.toastr.success(
          `${this.translation.t('ewallet.voucherReady') || 'Voucher ready!'} ${voucher.points} points deducted.`,
          this.translation.t('ewallet.success') || 'Success'
        );

        // Reload points to show updated balance
        this.loadUserPoints();
        
        // Emit success after a short delay
        setTimeout(() => {
          this.success.emit(); // Emit success to parent to refresh points in profile
        }, 1000);
      }
    } catch (error: any) {
      console.error('❌ Redemption failed:', error);
      console.error('❌ Error details:', {
        status: error?.status,
        statusText: error?.statusText,
        message: error?.message,
        error: error?.error
      });
      
      let errorMessage = this.translation.t('ewallet.couldNotDeductPoints') || 'Could not complete redemption';
      
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.status === 400) {
        errorMessage = this.translation.t('ewallet.invalidRequest') || 'Invalid request. Please check your input.';
      } else if (error?.status === 403) {
        errorMessage = this.translation.t('ewallet.unauthorized') || 'You are not authorized to perform this action.';
      } else if (error?.status === 404) {
        errorMessage = this.translation.t('ewallet.userNotFound') || 'User not found.';
      }
      
      this.toastr.error(
        errorMessage,
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

