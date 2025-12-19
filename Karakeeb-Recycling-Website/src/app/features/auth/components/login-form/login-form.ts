import { Component, OnInit, AfterViewInit, signal } from '@angular/core';
// Login Form Component
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthenticationContextService } from '../../../../core/services/authentication-context.service';
import { ToastrService } from 'ngx-toastr';
import { FloatingInputComponent } from '../../../../shared/components/floating-input/floating-input';

declare var google: any;

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FloatingInputComponent],
  templateUrl: './login-form.html',
  styleUrls: ['./login-form.scss']
})
export class LoginFormComponent implements OnInit, AfterViewInit {
  // Component initialized
  loginForm!: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  loginError = signal('');
  googleLoading = signal(false);

  private returnUrl: string = '/';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public translation: TranslationService,
    private router: Router,
    private route: ActivatedRoute,
    private authApi: AuthApiService,
    public authContext: AuthenticationContextService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/';
    });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.loadGoogleScript();
  }

  ngAfterViewInit(): void {
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

        const loginButton = document.getElementById('google-signin-button-login');
        if (loginButton) {
          (window as any).google.accounts.id.renderButton(loginButton, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
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
            this.navigateAfterLogin(res.user);
          }
        } else {
          // New user - go to role selection
          this.authContext.setGoogleUser({
            name: res.user.name,
            email: res.user.email,
            image: res.user.imgUrl || '',
            provider: 'google'
          });
          this.authContext.setMode('role-select');
          this.authContext.setSelectedRole('none');
          this.router.navigate(['/auth'], { queryParams: { mode: 'role-select' } });
        }
      },
      error: (error) => {
        console.error('Google login error:', error);
        this.toastr.error(
          (() => {
            const msg = this.translation.t('auth.errors.googleLoginFailed');
            return msg !== 'auth.errors.googleLoginFailed' ? msg : 'Google login failed. Please try again.';
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

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.loginError.set('');

    const { email, password } = this.loginForm.value;

    this.authApi.login({ email, password }).subscribe({
      next: (res) => {
        this.authService.setUser(res.user);
        this.authService.setToken(res.accessToken);
        const loginMsg = this.translation.t('auth.login.loginSuccess');
        const successTitle = this.translation.t('auth.login.success');
        this.toastr.success(
          loginMsg !== 'auth.login.loginSuccess' ? loginMsg : 'Welcome back!',
          successTitle !== 'auth.login.success' ? successTitle : 'Success'
        );
        this.navigateAfterLogin(res.user);
      },
      error: (err) => {
        console.error('Login error:', err);
        const loginFailedMsg = this.translation.t('auth.login.loginFailed');
        this.loginError.set(
          err?.error?.message ||
          (loginFailedMsg !== 'auth.login.loginFailed' ? loginFailedMsg : 'Login failed. Please check your credentials.')
        );
        this.isLoading.set(false);
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  navigateToForgot(): void {
    this.authContext.setMode('forgot-password');
  }

  navigateToSignUp(): void {
    this.authContext.setMode('role-select');
    this.authContext.setSelectedRole('none');
    this.authContext.setGoogleUser(null);
  }

  private navigateAfterLogin(user: any): void {
    if (user.role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (user.role === 'buyer') {
      this.router.navigate(['/buyer-dashboard']);
    } else if (user.role === 'delivery') {
      if (this.authService.isApprovedDelivery) {
        this.router.navigate(['/deliverydashboard']);
      } else {
        this.router.navigate(['/waiting-for-approval']);
      }
    } else {
      this.router.navigate([this.returnUrl || '/profile']);
    }
  }

  t(key: string): string {
    return this.translation.t(key);
  }
}

