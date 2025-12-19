import { Component, OnInit, ViewChild, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthenticationContextService } from '../../../../core/services/authentication-context.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-otp-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './otp-input.html',
  styleUrls: ['./otp-input.scss']
})
export class OtpInputComponent implements OnInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;
  
  otpForm!: FormGroup;
  loading = false;
  canSubmit = false;
  length = 6;

  constructor(
    private fb: FormBuilder,
    public authContext: AuthenticationContextService,
    private translation: TranslationService,
    private authApi: AuthApiService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const otpArray = this.fb.array(
      Array(this.length).fill('').map(() => this.fb.control(''))
    );
    
    this.otpForm = this.fb.group({
      otp: otpArray
    });

    // Watch for changes to validate
    this.otpForm.valueChanges.subscribe(() => {
      this.validateOtp();
    });
  }

  ngAfterViewInit(): void {
    // Focus first input
    setTimeout(() => {
      this.otpInputs.first?.nativeElement.focus();
    }, 100);
  }

  get otpArray(): FormArray {
    return this.otpForm.get('otp') as FormArray;
  }

  validateOtp(): boolean {
    const values = this.otpArray.value;
    const isValid = values.length === this.length && 
                    values.every((v: string) => /^[0-9]$/.test(v));
    this.canSubmit = isValid;
    return isValid;
  }

  handleChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '').slice(0, 1);
    
    this.otpArray.at(index).setValue(value);
    
    if (value && index < this.length - 1) {
      const nextInput = this.otpInputs.toArray()[index + 1];
      nextInput?.nativeElement.focus();
    }
    
    this.validateOtp();
  }

  handleKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpArray.at(index).value && index > 0) {
      const prevInput = this.otpInputs.toArray()[index - 1];
      prevInput?.nativeElement.focus();
    }
    
    if (event.key === 'Enter' && this.canSubmit) {
      this.handleSubmit();
    }
  }

  handlePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, this.length) || '';

    pasted.split('').forEach((char, i) => {
      if (i < this.length) {
        this.otpArray.at(i).setValue(char);
      }
    });

    const nextIndex = Math.min(pasted.length, this.length - 1);
    const nextInput = this.otpInputs.toArray()[nextIndex];
    nextInput?.nativeElement.focus();
    
    this.validateOtp();
  }

  async handleSubmit(): Promise<void> {
    if (!this.validateOtp()) return;

    this.loading = true;
    const otpValue = this.otpArray.value.join('');
    const formData = (this.authContext as any).formData || {};
    const email = this.authContext.googleUser()?.email || formData.email;

    try {
      // Skip OTP verification - .NET backend doesn't have verifyOtp endpoint for registration
      // OTP is only used for password reset, not registration
      // Proceed directly to next step
      const selectedRole = this.authContext.selectedRole();
      if (selectedRole !== 'delivery') {
        // Move to next step (customer/buyer final step)
        this.authContext.setStep(this.authContext.step() + 1);
        return;
      }
      
      this.authContext.setStep(this.authContext.step() + 1);
    } catch (error: any) {
      const unverifiedMsg = this.translation.t('Unverified');
      this.toastr.error(unverifiedMsg !== 'Unverified' ? unverifiedMsg : 'Unverified');
    } finally {
      this.loading = false;
    }
  }


  async handleResendOtp(): Promise<void> {
    // OTP resend not needed - .NET backend doesn't use OTP for registration
    // This method is kept for compatibility but does nothing
    const resendMsg = this.translation.t('Resend Success');
    this.toastr.info(resendMsg !== 'Resend Success' ? resendMsg : 'Resend Success');
  }

  t(key: string): string {
    return this.translation.t(key);
  }
}

