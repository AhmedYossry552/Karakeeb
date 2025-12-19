import { Component, OnInit, OnDestroy, signal, effect, EffectRef } from '@angular/core';
// Signup Form Component
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationContextService } from '../../../../core/services/authentication-context.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { FloatingInputComponent } from '../../../../shared/components/floating-input/floating-input';

declare var google: any;

@Component({
  selector: 'app-signup-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FloatingInputComponent
  ],
  templateUrl: './signup-form.html',
  styleUrls: ['./signup-form.scss']
})
export class SignUpFormComponent implements OnInit, OnDestroy {
  // Component initialized
  signupForm!: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);
  googleLoading = signal(false);
  private roleEffect?: EffectRef;

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
    // Watch for role changes and initialize form
    this.roleEffect = effect(() => {
      const role = this.authContext.selectedRole();
      if (role !== 'none' && role !== 'delivery') {
        if (!this.signupForm) {
          this.initForm();
        }
      }
    });
    
    // Initialize form immediately if role is already selected
    const role = this.authContext.selectedRole();
    if (role !== 'none' && role !== 'delivery') {
      this.initForm();
    }

    this.loadGoogleScript();
    
    // Initialize Google Sign-In after a delay
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.initializeGoogleSignIn();
      }, 1000);
    }
  }

  private loadGoogleScript(): void {
    if (typeof window !== 'undefined' && typeof (window as any).google === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  private initializeGoogleSignIn(): void {
    if (typeof (window as any).google !== 'undefined') {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: 'YOUR_GOOGLE_CLIENT_ID', // TODO: Replace with actual Google Client ID
          callback: (response: any) => this.handleGoogleSuccess(response)
        });

        const signupButton = document.getElementById('google-signin-button-signup');
        if (signupButton) {
          (window as any).google.accounts.id.renderButton(signupButton, {
            theme: 'outline',
            size: 'large',
            text: 'signup_with',
            shape: 'rectangular',
            width: 300
          });
        }
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
      }
    }
  }

  handleGoogleSuccess(credentialResponse: any): void {
    this.googleLoading.set(true);
    const idToken = credentialResponse.credential;

    this.authApi.googleAuth(idToken).subscribe({
      next: (res) => {
        if (res.exists) {
          // Existing user - login
          if (res.accessToken && res.user) {
            this.authService.setUser(res.user);
            this.authService.setToken(res.accessToken);
            const loginMsg = this.translation.t('auth.login.loginSuccess');
            const successTitle = this.translation.t('auth.login.success');
            this.toastr.success(
              loginMsg !== 'auth.login.loginSuccess' ? loginMsg : 'Welcome back!',
              successTitle !== 'auth.login.success' ? successTitle : 'Success'
            );
            this.navigateAfterSignup(res.user);
          }
        } else {
          // New user - store Google user data and continue with signup
          this.authContext.setGoogleUser({
            name: res.user.name,
            email: res.user.email,
            image: res.user.imgUrl || '',
            provider: 'google'
          });
          // Pre-fill form with Google data
          if (this.signupForm) {
            this.signupForm.patchValue({
              name: res.user.name || '',
              email: res.user.email || ''
            });
          }
        }
      },
      error: (error) => {
        console.error('Google signup error:', error);
        this.toastr.error(
          (() => {
            const msg = this.translation.t('auth.errors.googleLoginFailed');
            return msg !== 'auth.errors.googleLoginFailed' ? msg : 'Google signup failed. Please try again.';
          })(),
          (() => {
            const title = this.translation.t('auth.errors.error');
            return title !== 'auth.errors.error' ? title : 'Error';
          })()
        );
        this.googleLoading.set(false);
      },
      complete: () => {
        this.googleLoading.set(false);
      }
    });
  }

  initForm(): void {
    const googleUser = this.authContext.googleUser();
    const role = this.authContext.selectedRole();

    // Only create form for customer/buyer roles
    if (role === 'delivery' || role === 'none') {
      return;
    }

    // Don't recreate form if it already exists
    if (this.signupForm) {
      // Just update values if form exists
      if (googleUser) {
        this.signupForm.patchValue({
          name: googleUser.name || '',
          email: googleUser.email || ''
        });
      }
      return;
    }

    this.signupForm = this.fb.group({
      name: [googleUser?.name || '', [Validators.required, Validators.maxLength(30)]],
      email: [googleUser?.email || '', [Validators.required, Validators.email, Validators.maxLength(30)]],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{10,11}$/),
        Validators.maxLength(11)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(20),
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/)
      ]],
      confirmPassword: ['', [Validators.required]],
      address: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });

    // Pre-fill from Google user if available
    if (googleUser) {
      this.signupForm.patchValue({
        name: googleUser.name || '',
        email: googleUser.email || ''
      });
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    
    if (confirmPassword && confirmPassword.hasError('mismatch') && password?.value === confirmPassword.value) {
      confirmPassword.setErrors(null);
    }
    
    return null;
  }

  get name(): FormControl {
    return this.signupForm?.get('name') as FormControl;
  }

  get email(): FormControl {
    return this.signupForm?.get('email') as FormControl;
  }

  get phoneNumber(): FormControl {
    return this.signupForm?.get('phoneNumber') as FormControl;
  }

  get password(): FormControl {
    return this.signupForm?.get('password') as FormControl;
  }

  get confirmPassword(): FormControl {
    return this.signupForm?.get('confirmPassword') as FormControl;
  }

  get address(): FormControl {
    return this.signupForm?.get('address') as FormControl;
  }

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const googleUser = this.authContext.googleUser();
    const role = this.authContext.selectedRole();
    const formValue = this.signupForm.value;

    // For delivery role, use registerDelivery endpoint
    if (role === 'delivery') {
      this.toastr.error('Please use the delivery registration form');
      this.isLoading.set(false);
      return;
    }

    const registrationData = {
      name: googleUser?.name || formValue.name,
      email: googleUser?.email || formValue.email,
      password: formValue.password,
      phoneNumber: formValue.phoneNumber,
      role: role || 'customer',
      attachments: {
        address: formValue.address
      }
    };

    this.authApi.register(registrationData).subscribe({
      next: (res) => {
        const registerMsg = this.translation.t('auth.register.success');
        const successTitle = this.translation.t('auth.login.success');
        this.toastr.success(
          registerMsg !== 'auth.register.success' ? registerMsg : 'Registration successful!',
          successTitle !== 'auth.login.success' ? successTitle : 'Success'
        );
        this.authService.setUser(res.user);
        this.authService.setToken(res.accessToken);
        this.navigateAfterSignup(res.user);
      },
      error: (err) => {
        console.error('Registration error:', err);
        const registerFailMsg = this.translation.t('auth.register.fail');
        const errorMessage = err?.error?.message || (registerFailMsg !== 'auth.register.fail' ? registerFailMsg : 'Registration failed. Please try again.');
        this.toastr.error(errorMessage);
        this.isLoading.set(false);
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  navigateAfterSignup(user: any): void {
    if (user.role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (user.role === 'buyer') {
      this.router.navigate(['/buyer-dashboard']);
    } else {
      this.router.navigate(['/profile']);
    }
  }

  navigateToLogin(): void {
    this.authContext.setMode('login');
  }

  t(key: string): string {
    return this.translation.t(key);
  }

  ngOnDestroy(): void {
    if (this.roleEffect) {
      this.roleEffect.destroy();
    }
  }
}

