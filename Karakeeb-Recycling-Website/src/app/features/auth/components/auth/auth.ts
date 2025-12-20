import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthenticationContextService } from '../../../../core/services/authentication-context.service';
import { AddressService } from '../../../../core/services/address.service';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { RoleSelectionComponent } from '../role-selection/role-selection';
// Import login and signup components
import { LoginFormComponent } from '../login-form/login-form';
import { SignUpFormComponent } from '../signup-form/signup-form';

declare var google: any;

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RoleSelectionComponent, SignUpFormComponent, LoginFormComponent],
  templateUrl: './auth.html',
  styleUrls: ['./auth.scss']
})
export class AuthComponent implements OnInit, AfterViewInit {
  isLoginMode = true;
  showPassword = false;
  isLoading = false;
  loginError = '';
  registerError = '';
  private lastGoogleIdToken: string | null = null;
  showOtpStep = false;
  otpEmail = '';
  otpError = '';
  otpResendTimer = 0;
  otpResendDisabled = false;
  
  // File uploads for delivery
  deliveryImageFile: File | null = null;
  vehicleImageFile: File | null = null;
  criminalRecordFile: File | null = null;

  // Forgot password state
  isForgotMode = false;
  forgotStage: 'email' | 'reset' = 'email';
  forgotLoading = false;

  loginForm!: FormGroup;
  registerForm!: FormGroup;
  forgotEmailForm!: FormGroup;
  resetForm!: FormGroup;
  otpForm!: FormGroup;

  private returnUrl: string = '/';

  googleLoading = false;
  showCustomGoogleButton = false; // Show custom button only if embedded fails
  environment = environment; // Expose environment to template

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public translation: TranslationService,
    private router: Router,
    private route: ActivatedRoute,
    private authApi: AuthApiService,
    public authContext: AuthenticationContextService,
    private addressService: AddressService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Get returnUrl from query params
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/';
    });

    // Initialize auth context mode
    this.authContext.setMode(this.isLoginMode ? 'login' : 'role-select');

    // Initialize login form
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Initialize register form
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      role: ['customer', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Watch for role changes to add/remove delivery fields
    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      if (role === 'delivery') {
        this.addDeliveryFields();
      } else {
        this.removeDeliveryFields();
      }
    });

    // Forgot password forms
    this.forgotEmailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      otpCode: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Initialize OTP form
    this.otpForm = this.fb.group({
      otpCode: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]]
    });
  }

  ngAfterViewInit(): void {
    // Initialize Google Sign-In button after view init
    if (typeof window !== 'undefined') {
      console.log('🚀 ngAfterViewInit - Starting Google Sign-In initialization...');
      console.log('🔍 Current Client ID:', environment.googleClientId ? `Configured (${environment.googleClientId.substring(0, 20)}...)` : '❌ MISSING - Add it to environment.ts');
      
      // Wait for Google script to load, then initialize
      this.waitForGoogleAndInitialize();
      
      // Also try to initialize after a delay to catch any timing issues
      setTimeout(() => {
        console.log('🔄 Retrying Google Sign-In initialization...');
        this.waitForGoogleAndInitialize();
      }, 1000);
    }
  }

  private waitForGoogleAndInitialize(): void {
    const maxAttempts = 50; // Try for up to 5 seconds (50 * 100ms)
    let attempts = 0;

    const checkGoogle = () => {
      attempts++;
      if (typeof (window as any).google !== 'undefined' && 
          (window as any).google.accounts && 
          (window as any).google.accounts.id) {
        console.log('✅ Google Sign-In script loaded, initializing buttons...');
        // Wait a bit more to ensure DOM is fully ready
        setTimeout(() => {
          this.initializeGoogleSignIn();
        }, 200);
      } else if (attempts < maxAttempts) {
        setTimeout(checkGoogle, 100);
      } else {
        console.warn('⚠️ Google Sign-In script failed to load after', maxAttempts * 100, 'ms.');
        console.warn('   Please check:');
        console.warn('   1. Your internet connection');
        console.warn('   2. The script is loaded in index.html');
        if (!environment.googleClientId) {
          console.warn('   3. Google Client ID is not configured in environment.ts');
          console.warn('      Add your Client ID from Next.js: NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID');
        }
      }
    };

    checkGoogle();
  }

  private initializeGoogleSignIn(): void {
    try {
      const clientId = environment.googleClientId;
      
      // Log current origin for debugging
      if (typeof window !== 'undefined') {
        const currentOrigin = window.location.origin;
        const currentHost = window.location.host;
        const currentProtocol = window.location.protocol;
        console.log('🌐 Current Origin Information:');
        console.log('   Origin:', currentOrigin);
        console.log('   Host:', currentHost);
        console.log('   Protocol:', currentProtocol);
        console.log('   ⚠️ IMPORTANT: Add this EXACT origin to Google Cloud Console:');
        console.log('   👉', currentOrigin);
        console.log('   📋 Copy this value and add it to: https://console.cloud.google.com/apis/credentials');
      }
      
      console.log('🔍 Checking Google Client ID:', clientId ? 'Found' : 'MISSING');
      if (!clientId || clientId === '') {
        console.warn('⚠️ Google Client ID is not configured. Please add it to environment.ts');
        console.warn('   The Google Sign-In button will not appear until you add your Client ID.');
        console.warn('   Get it from your Next.js .env file: NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID');
        // Show a visible placeholder
        this.showGooglePlaceholder();
        return;
      }

      if (typeof (window as any).google === 'undefined' || !(window as any).google.accounts) {
        console.error('❌ Google Sign-In script is not loaded');
        return;
      }
      
      console.log('🔧 Initializing Google Sign-In with Client ID:', clientId.substring(0, 20) + '...');
      console.log('✅ Origins configured in Google Cloud Console:');
      console.log('   - http://localhost:4200');
      console.log('   - http://127.0.0.1:4200');
      console.log('⏳ If you see 403 errors, wait 2-5 minutes for Google to propagate changes.');
      console.log('💡 Try: Clear cache (Ctrl+Shift+Delete) or use Incognito mode.');
      console.log('ℹ️ Note: COOP warnings from Google are usually non-blocking - the button should still work.');
      
      // Suppress COOP and FedCM warnings in console (they're usually non-blocking)
      // Note: COOP meta tag in index.html and Angular dev server headers should prevent these
      const originalError = console.error;
      const originalWarn = console.warn;
      const warningPatterns = [
        /Cross-Origin-Opener-Policy/i, 
        /COOP/i,
        /FedCM/i, 
        /AbortError/i, 
        /signal is aborted/i,
        /window\.postMessage/i,
        /policy would block/i
      ];
      
      // Suppress in console.error
      console.error = function(...args: any[]) {
        const errorMessage = args.map(arg => String(arg)).join(' ');
        if (warningPatterns.some(pattern => pattern.test(errorMessage))) {
          // Suppress these warnings - they don't block functionality
          // COOP is set to unsafe-none in index.html and Angular dev server
          return;
        }
        originalError.apply(console, args);
      };
      
      // Also suppress in console.warn (some browsers use warn instead of error)
      console.warn = function(...args: any[]) {
        const warningMessage = args.map(arg => String(arg)).join(' ');
        if (warningPatterns.some(pattern => pattern.test(warningMessage))) {
          return;
        }
        originalWarn.apply(console, args);
      };
      
      try {
        // Initialize Google Sign-In (like Next.js - embedded button, not redirect)
        // COOP warnings are usually non-blocking - the button should still work
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => this.handleGoogleSuccess(response),
          auto_select: false,
          cancel_on_tap_outside: true
          // No ux_mode specified = uses default (popup/embedded button like Next.js)
        });
        console.log('✅ Google Sign-In initialized (embedded button mode - like Next.js)');
        console.log('ℹ️ COOP warnings may appear but are usually non-blocking');
      } catch (initError) {
        console.error('❌ Error during Google initialization:', initError);
        // Restore original console methods
        console.error = originalError;
        console.warn = originalWarn;
        throw initError;
      }
      
      // Keep COOP warnings suppressed permanently (they don't block functionality)
      // Don't restore console methods - keep them suppressed for the entire session

      // Render embedded buttons (like Next.js does)
      setTimeout(() => {
        this.renderGoogleButtons();
      }, 300);
    } catch (error) {
      console.error('❌ Error initializing Google Sign-In:', error);
    }
  }

  private showGoogleButtonPlaceholder(): void {
    // Show placeholder message if Google Client ID is not configured
    const loginButton = document.getElementById('google-signin-button-login');
    const registerButton = document.getElementById('google-signin-button-register');
    
    if (loginButton && !environment.googleClientId) {
      loginButton.innerHTML = '<div style="padding: 10px; text-align: center; color: #666; font-size: 14px;">Google Sign-In not configured</div>';
    }
    if (registerButton && !environment.googleClientId) {
      registerButton.innerHTML = '<div style="padding: 10px; text-align: center; color: #666; font-size: 14px;">Google Sign-In not configured</div>';
    }
  }

  private renderGoogleButtons(): void {
    console.log('🎨 Rendering Google Sign-In buttons (embedded like Next.js)...');
    
    // Render button for login
    const loginButton = document.getElementById('google-signin-button-login');
    if (loginButton) {
      loginButton.innerHTML = '';
      try {
        const currentLocale = this.translation.getLocale() || 'en';
        (window as any).google.accounts.id.renderButton(loginButton, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 'auto',
          locale: currentLocale === 'ar' ? 'ar' : 'en'
        });
        console.log('✅ Google Sign-In button rendered for login');
        this.showCustomGoogleButton = false; // Hide custom button if embedded works
      } catch (err) {
        console.warn('⚠️ Could not render embedded login button, showing custom button');
        this.showCustomGoogleButton = true;
      }
    }

    // Render button for register
    const registerButton = document.getElementById('google-signin-button-register');
    if (registerButton) {
      registerButton.innerHTML = '';
      try {
        const currentLocale = this.translation.getLocale() || 'en';
        (window as any).google.accounts.id.renderButton(registerButton, {
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          shape: 'rectangular',
          width: 'auto',
          locale: currentLocale === 'ar' ? 'ar' : 'en'
        });
        console.log('✅ Google Sign-In button rendered for register');
      } catch (err) {
        console.warn('⚠️ Could not render embedded register button');
      }
    }
  }

  triggerGoogleSignIn(): void {
    // This method is for the custom button fallback
    // If embedded button doesn't work, this triggers Google prompt (like Next.js)
    if (typeof (window as any).google !== 'undefined' && (window as any).google.accounts?.id) {
      try {
        this.googleLoading = true;
        console.log('🚀 Triggering Google Sign-In via prompt (fallback)...');
        (window as any).google.accounts.id.prompt((notification: any) => {
          this.googleLoading = false;
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.warn('⚠️ Google prompt not available');
          } else if (notification.isDismissedMoment()) {
            console.log('ℹ️ User dismissed Google Sign-In');
          }
        });
      } catch (err) {
        console.error('❌ Error triggering Google Sign-In:', err);
        this.googleLoading = false;
        this.toastr.error('Failed to start Google Sign-In');
      }
    } else {
      console.error('❌ Google Sign-In not available');
      this.googleLoading = false;
    }
  }

  private extractIdTokenFromHash(): string | null {
    // Google returns id_token in URL hash: #id_token=...&access_token=...
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const idToken = hashParams.get('id_token');
      if (idToken) {
        console.log('✅ Found id_token in URL hash');
        return idToken;
      }
    }
    
    // Also check query params (some flows use query params)
    const urlParams = new URLSearchParams(window.location.search);
    const idTokenFromQuery = urlParams.get('id_token');
    if (idTokenFromQuery) {
      console.log('✅ Found id_token in URL query params');
      return idTokenFromQuery;
    }
    
    return null;
  }

  private processGoogleOAuthCallback(idToken: string): void {
    this.googleLoading = true;
    console.log('🔄 Processing Google OAuth callback with id_token...');
    
    // Clear URL hash/params to clean up
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    // Use the same handler as embedded button
    this.handleGoogleSuccess({ credential: idToken });
  }

  handleGoogleSuccess(credentialResponse: any): void {
    this.googleLoading = true;
    const idToken = credentialResponse.credential;
    this.lastGoogleIdToken = idToken;

    this.authApi.googleAuth(idToken).subscribe({
      next: (res) => {
        if (res.exists) {
          // Existing user - login
          const anyRes: any = res as any;
          const user = anyRes?.user || anyRes?.data?.user || anyRes?.data || null;
          const token = anyRes?.accessToken || anyRes?.data?.accessToken || anyRes?.token || anyRes?.data?.token || null;
          if (token && user) {
            this.authService.setUser(user);
            this.authService.setToken(token);
            const loginMsg = this.translation.t('auth.login.loginSuccess');
            const successTitle = this.translation.t('auth.login.success');
            this.toastr.success(
              loginMsg !== 'auth.login.loginSuccess' ? loginMsg : 'Welcome back!',
              successTitle !== 'auth.login.success' ? successTitle : 'Success'
            );
            this.router.navigate([this.returnUrl]);
          } else {
            const googleErrorMsg = this.translation.t('auth.errors.googleLoginFailed');
            const errorTitle = this.translation.t('auth.errors.error');
            this.toastr.error(
              googleErrorMsg !== 'auth.errors.googleLoginFailed' ? googleErrorMsg : 'Google login failed. Please try again.',
              errorTitle !== 'auth.errors.error' ? errorTitle : 'Error'
            );
          }
        } else {
          // New user - store Google user data and go to signup flow
          this.authContext.setGoogleUser({
            name: res.user.name,
            email: res.user.email,
            image: res.user.image || res.user.imgUrl || '',
            provider: 'google'
          });

          // Switch UI to signup mode and pre-fill basic info
          this.isLoginMode = false;
          this.authContext.setMode('signup');

          if (this.registerForm) {
            this.registerForm.patchValue({
              name: res.user.name || '',
              email: res.user.email || '',
              role: this.registerForm.get('role')?.value || 'customer'
            });
            // Remove password validation for Google users
            const passwordControl = this.registerForm.get('password');
            const confirmPasswordControl = this.registerForm.get('confirmPassword');
            passwordControl?.clearValidators();
            confirmPasswordControl?.clearValidators();
            passwordControl?.updateValueAndValidity();
            confirmPasswordControl?.updateValueAndValidity();
          }

          const signupMsg = this.translation.t('auth.login.completeSignup');
          const infoTitle = this.translation.t('auth.login.info');
          this.toastr.info(
            signupMsg !== 'auth.login.completeSignup' ? signupMsg : 'Complete your registration to finish signing in with Google.',
            infoTitle !== 'auth.login.info' ? infoTitle : 'Almost there'
          );

          // Stay on /auth (current route) so the signup form is visible
          this.router.navigate(['/auth']);
        }
      },
      error: (error) => {
        console.error('Google login error:', error);
        
        // Handle connection errors
        if (error.status === 0 || error.message?.includes('ERR_CONNECTION_REFUSED')) {
          this.toastr.error('Cannot connect to server. Please check if the backend is running.');
        } else if (error.status === 403 || error.error?.message?.includes('client ID')) {
          this.toastr.error('Google Sign-In is not configured. Please add your Google Client ID to environment.ts');
        } else {
          const googleErrorMsg = this.translation.t('auth.errors.googleLoginFailed');
          const errorTitle = this.translation.t('auth.errors.error');
          this.toastr.error(
            googleErrorMsg !== 'auth.errors.googleLoginFailed' ? googleErrorMsg : 'Google login failed. Please try again.',
            errorTitle !== 'auth.errors.error' ? errorTitle : 'Error'
          );
        }
        this.googleLoading = false;
      },
      complete: () => {
        this.googleLoading = false;
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  addDeliveryFields(): void {
    // Add delivery-specific fields
    this.registerForm.addControl('licenseNumber', this.fb.control('', [Validators.required]));
    this.registerForm.addControl('vehicleType', this.fb.control('', [Validators.required]));
    this.registerForm.addControl('nationalId', this.fb.control(''));
    this.registerForm.addControl('emergencyContact', this.fb.control(''));
    
    // Add address fields
    this.registerForm.addControl('city', this.fb.control('', [Validators.required]));
    this.registerForm.addControl('area', this.fb.control('', [Validators.required]));
    this.registerForm.addControl('street', this.fb.control('', [Validators.required]));
    this.registerForm.addControl('building', this.fb.control(''));
    this.registerForm.addControl('floor', this.fb.control(''));
    this.registerForm.addControl('apartment', this.fb.control(''));
    this.registerForm.addControl('landmark', this.fb.control(''));
    this.registerForm.addControl('notes', this.fb.control(''));
  }

  removeDeliveryFields(): void {
    // Remove delivery-specific fields
    this.registerForm.removeControl('licenseNumber');
    this.registerForm.removeControl('vehicleType');
    this.registerForm.removeControl('nationalId');
    this.registerForm.removeControl('emergencyContact');
    
    // Remove address fields
    this.registerForm.removeControl('city');
    this.registerForm.removeControl('area');
    this.registerForm.removeControl('street');
    this.registerForm.removeControl('building');
    this.registerForm.removeControl('floor');
    this.registerForm.removeControl('apartment');
    this.registerForm.removeControl('landmark');
    this.registerForm.removeControl('notes');
    
    // Clear file uploads
    this.deliveryImageFile = null;
    this.vehicleImageFile = null;
    this.criminalRecordFile = null;
  }

  onDeliveryImageChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.deliveryImageFile = file;
    }
  }

  onVehicleImageChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.vehicleImageFile = file;
    }
  }

  onCriminalRecordChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.criminalRecordFile = file;
    }
  }

  async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  // === Forgot Password helpers ===
  openForgotPassword(): void {
    this.isForgotMode = true;
    this.forgotStage = 'email';
    this.loginError = '';
    this.registerError = '';

    const email = this.loginForm.get('email')?.value || '';
    this.forgotEmailForm.reset({ email });
  }

  backToLogin(): void {
    this.isForgotMode = false;
    this.forgotStage = 'email';
    this.forgotLoading = false;
  }

  onSendResetCode(): void {
    if (this.forgotEmailForm.invalid || this.forgotLoading) {
      this.forgotEmailForm.markAllAsTouched();
      return;
    }

    const email = this.forgotEmailForm.get('email')?.value;
    if (!email) return;

    this.forgotLoading = true;

    this.authApi.forgotPassword(email).subscribe({
      next: () => {
        this.toastr.success(
          this.translation.t('auth.login.submission_success') || 'OTP sent! Check your email to continue.'
        );
        this.forgotStage = 'reset';
        this.resetForm.patchValue({ email });
        this.forgotLoading = false;
      },
      error: (err) => {
        console.error('Forgot password error', err);
        const resetErrorMsg = this.translation.t('auth.login.loginFailed');
        this.toastr.error(
          resetErrorMsg !== 'auth.login.loginFailed' ? resetErrorMsg : 'Failed to send reset code. Please try again.'
        );
        this.forgotLoading = false;
      }
    });
  }

  onResetPassword(): void {
    if (this.resetForm.invalid || this.forgotLoading) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const email = this.resetForm.get('email')?.value;
    const otpCode = this.resetForm.get('otpCode')?.value;
    const password = this.resetForm.get('password')?.value;

    if (!email || !otpCode || !password) return;

    this.forgotLoading = true;

    this.authApi.resetPassword({ email, otpCode, newPassword: password }).subscribe({
      next: () => {
        const resetSuccessMsg = this.translation.t('auth.login.resetSuccess');
        this.toastr.success(
          resetSuccessMsg !== 'auth.login.resetSuccess' ? resetSuccessMsg : 'Password reset successfully'
        );
        // Return to login mode with email pre-filled
        this.isForgotMode = false;
        this.forgotStage = 'email';
        this.loginForm.patchValue({ email, password: '' });
        this.forgotLoading = false;
      },
      error: (err) => {
        console.error('Reset password error', err);
        this.toastr.error(
          this.translation.t('auth.login.loginFailed') || 'Reset failed. Please check your code and try again.'
        );
        this.forgotLoading = false;
      }
    });
  }

  setLoginMode(mode: boolean): void {
    this.isLoginMode = mode;
    this.loginError = '';
    this.registerError = '';
    this.loginForm.reset();
    this.registerForm.reset();

    // Keep auth context simple: only track login mode for other parts of the app
    if (mode) {
      this.authContext.setMode('login');
    } else {
      this.authContext.setMode('signup');
    }

    // Re-initialize Google buttons when switching modes
    console.log('🔄 Switching to', mode ? 'login' : 'signup', 'mode - re-initializing Google buttons...');
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        this.waitForGoogleAndInitialize();
      }
    }, 500);
  }

  private showGooglePlaceholder(): void {
    // Show placeholder message in the button containers
    const loginButton = document.getElementById('google-signin-button-login');
    const registerButton = document.getElementById('google-signin-button-register');
    
    if (loginButton) {
      loginButton.innerHTML = '<div style="padding: 12px; text-align: center; color: #999; font-size: 13px; border: 1px dashed #ddd; border-radius: 8px; background: #f9f9f9;">Google Sign-In requires Client ID</div>';
    }
    if (registerButton) {
      registerButton.innerHTML = '<div style="padding: 12px; text-align: center; color: #999; font-size: 13px; border: 1px dashed #ddd; border-radius: 8px; background: #f9f9f9;">Google Sign-In requires Client ID</div>';
    }
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.loginError = '';

    const { email, password } = this.loginForm.value;

    this.authApi.login({ email, password }).subscribe({
      next: (res) => {
        const user = res.user;
        const token = res.accessToken;

        this.authService.setUser(user);
        this.authService.setToken(token);

        // Role-based navigation after login
        if (user.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (user.role === 'buyer') {
          this.router.navigate(['/buyer-dashboard']);
        } else if (user.role === 'delivery') {
          if (this.authService.isApprovedDelivery) {
            this.router.navigate(['/deliverydashboard']);
          } else if (this.authService.isPendingOrDeclinedDelivery) {
            this.router.navigate(['/waiting-for-approval']);
          } else {
            this.router.navigate(['/waiting-for-approval']);
          }
        } else {
          this.router.navigate([this.returnUrl || '/profile']);
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Login error:', err);
        
        // Handle connection errors
        if (err.status === 0 || err.message?.includes('ERR_CONNECTION_REFUSED') || err.error?.message?.includes('ERR_CONNECTION_REFUSED')) {
          this.loginError = 'Cannot connect to server. Please make sure the backend is running on http://localhost:7163';
          this.toastr.error('Cannot connect to server. Please check if the backend is running.');
        } else {
          const loginFailedMsg = this.translation.t('auth.login.loginFailed');
          this.loginError =
            err?.error?.message ||
            (loginFailedMsg !== 'auth.login.loginFailed' ? loginFailedMsg : 'Login failed. Please check your credentials.');
        }
        this.isLoading = false;
      }
    });
  }

  async onRegister(): Promise<void> {
    const role = this.registerForm.get('role')?.value;
    const googleUser = this.authContext.googleUser();
    const isGoogleSignup = !!googleUser && !!this.lastGoogleIdToken;
    let otpCode: string | undefined;
    
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    
    // Validate delivery files if role is delivery
    if (role === 'delivery') {
      if (!this.deliveryImageFile || !this.vehicleImageFile || !this.criminalRecordFile) {
        this.registerError = 'Please upload all required files for delivery registration';
        return;
      }
    }

    this.isLoading = true;
    this.registerError = '';

    const { name, email, phoneNumber, password } = this.registerForm.value;

    // For normal email signup (non-Google, non-delivery), send OTP and ask for code
    if (!isGoogleSignup && role !== 'delivery') {
      try {
        await firstValueFrom(this.authApi.initiateSignup(email));
        const otpSuccessMsg = this.translation.t('auth.login.submission_success');
        this.toastr.success(
          otpSuccessMsg !== 'auth.login.submission_success' ? otpSuccessMsg : 'OTP sent! Check your email to continue.'
        );

        // Show OTP step instead of prompt
        this.otpEmail = email;
        this.showOtpStep = true;
        this.isLoading = false;
        this.startOtpResendTimer();
        return; // Wait for OTP input
      } catch (err: any) {
        console.error('Initiate signup error:', err);
        const otpFailedMsg = this.translation.t('auth.login.submission_failed');
        this.registerError =
          err?.error?.message ||
          (otpFailedMsg !== 'auth.login.submission_failed' ? otpFailedMsg : 'Failed to send OTP. Please try again.');
        this.isLoading = false;
        return;
      }
    }

    // If delivery, use registerDelivery endpoint
    if (role === 'delivery') {
      try {
        const { licenseNumber, vehicleType, nationalId, emergencyContact } = this.registerForm.value;
        
        // Convert files to base64
        const deliveryImage = await this.convertFileToBase64(this.deliveryImageFile!);
        const vehicleImage = await this.convertFileToBase64(this.vehicleImageFile!);
        const criminalRecord = await this.convertFileToBase64(this.criminalRecordFile!);

        this.authApi.registerDelivery({
          name,
          email,
          password,
          phoneNumber,
          provider: 'none',
          licenseNumber,
          vehicleType,
          nationalId: nationalId || undefined,
          emergencyContact: emergencyContact || undefined,
          deliveryImage,
          vehicleImage,
          criminalRecord
        }).subscribe({
          next: async (res) => {
            const user = res.user;
            const token = res.accessToken;

            this.authService.setUser(user);
            this.authService.setToken(token);

            // Create address for delivery user after successful registration
            const { city, area, street, building, floor, apartment, landmark, notes } = this.registerForm.value;
            if (city && area && street) {
              try {
                const addressData: any = {
                  city: city.trim(),
                  area: area.trim(),
                  street: street.trim()
                };
                
                if (building?.trim()) addressData.building = building.trim();
                if (floor?.trim()) addressData.floor = floor.trim();
                if (apartment?.trim()) addressData.apartment = apartment.trim();
                if (landmark?.trim()) addressData.landmark = landmark.trim();
                if (notes?.trim()) addressData.notes = notes.trim();
                
                await this.addressService.createAddress(addressData);
                console.log('✅ Delivery address created successfully');
              } catch (addressError) {
                console.error('⚠️ Error creating delivery address:', addressError);
                // Don't block registration if address creation fails
                this.toastr.warning('Registration successful, but address could not be saved. Please add your address in profile settings.');
              }
            }

            this.toastr.success('Delivery registration successful! Awaiting admin approval.');
            
            if (this.authService.isApprovedDelivery) {
              this.router.navigate(['/deliverydashboard']);
            } else {
              this.router.navigate(['/waiting-for-approval']);
            }

            this.isLoading = false;
          },
          error: (err) => {
            console.error('Delivery registration error:', err);
            this.registerError =
              err?.error?.message ||
              'Delivery registration failed. Please try again.';
            this.isLoading = false;
          }
        });
      } catch (error) {
        console.error('Error converting files:', error);
        this.registerError = 'Error processing files. Please try again.';
        this.isLoading = false;
      }
    } else {
      // Regular registration for customer/buyer
      const payload: any = {
        name,
        email,
        phoneNumber,
        role: role || 'customer'
      };

      if (isGoogleSignup && googleUser) {
        // Google users don't need password
        payload.provider = 'google';
        payload.imgUrl = googleUser.image;
        payload.idToken = this.lastGoogleIdToken;
      } else {
        // Regular users need password and OTP
        payload.password = password;
        if (otpCode) {
          payload.otpCode = otpCode;
        }
      }

      this.authApi.register(payload).subscribe({
        next: (res) => {
          const user = res.user;
          const token = res.accessToken;

          this.authService.setUser(user);
          this.authService.setToken(token);

          // Role-based navigation after register
          if (user.role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
          } else if (user.role === 'buyer') {
            this.router.navigate(['/buyer-dashboard']);
          } else {
            this.router.navigate([this.returnUrl || '/profile']);
          }

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Register error:', err);
          const duplicateEmailMsg = this.translation.t('auth.errors.duplicateEmail');
          this.registerError =
            err?.error?.message ||
            (duplicateEmailMsg !== 'auth.errors.duplicateEmail' ? duplicateEmailMsg : 'Registration failed. Please try again.');
          this.isLoading = false;
        }
      });
    }
  }

  private generateId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  onClose(): void {
    this.router.navigate(['/']);
  }

  // OTP Methods
  startOtpResendTimer(): void {
    this.otpResendTimer = 60;
    this.otpResendDisabled = true;
    const interval = setInterval(() => {
      this.otpResendTimer--;
      if (this.otpResendTimer <= 0) {
        clearInterval(interval);
        this.otpResendDisabled = false;
      }
    }, 1000);
  }

  async resendOtp(): Promise<void> {
    if (this.otpResendDisabled || !this.otpEmail) return;

    try {
      this.isLoading = true;
      this.otpError = '';
      await firstValueFrom(this.authApi.initiateSignup(this.otpEmail));
      this.toastr.success('OTP sent! Check your email.');
      this.startOtpResendTimer();
    } catch (err: any) {
      this.otpError = err?.error?.message || 'Failed to resend OTP. Please try again.';
      this.toastr.error(this.otpError);
    } finally {
      this.isLoading = false;
    }
  }

  async verifyOtpAndRegister(): Promise<void> {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    const otpCode = this.otpForm.get('otpCode')?.value;
    if (!otpCode) {
      this.otpError = 'OTP code is required';
      return;
    }

    this.isLoading = true;
    this.otpError = '';

    const role = this.registerForm.get('role')?.value;
    const { name, email, phoneNumber, password } = this.registerForm.value;

    const payload: any = {
      name,
      email,
      phoneNumber,
      role: role || 'customer',
      password,
      otpCode
    };

    this.authApi.register(payload).subscribe({
      next: (res) => {
        const user = res.user;
        const token = res.accessToken;

        this.authService.setUser(user);
        this.authService.setToken(token);
        this.showOtpStep = false;
        this.otpForm.reset();

        // Role-based navigation after register
        if (user.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (user.role === 'buyer') {
          this.router.navigate(['/buyer-dashboard']);
        } else {
          this.router.navigate([this.returnUrl || '/profile']);
        }

        this.isLoading = false;
        const registerMsg = this.translation.t('auth.register.success');
        this.toastr.success(
          registerMsg !== 'auth.register.success' ? registerMsg : 'Registration successful!'
        );
        this.authContext.resetState();
      },
      error: (err) => {
        console.error('Register error:', err);
        const duplicateEmailErrorMsg = this.translation.t('auth.errors.duplicateEmail');
        this.otpError =
          err?.error?.message ||
          (duplicateEmailErrorMsg !== 'auth.errors.duplicateEmail' ? duplicateEmailErrorMsg : 'Registration failed. Please try again.');
        this.isLoading = false;
      }
    });
  }

  goBackToRegister(): void {
    this.showOtpStep = false;
    this.otpForm.reset();
    this.otpError = '';
    this.otpResendTimer = 0;
    this.otpResendDisabled = false;
  }
}
