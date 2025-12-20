import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthenticationContextService } from '../../../../core/services/authentication-context.service';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';

declare var google: any;

@Component({
  selector: 'app-social-buttons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-buttons.html',
  styleUrls: ['./social-buttons.scss']
})
export class SocialButtonsComponent implements OnInit, AfterViewInit {
  loading = false;

  constructor(
    private authContext: AuthenticationContextService,
    private authApi: AuthApiService,
    private authService: AuthService,
    private router: Router,
    private translation: TranslationService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Load Google Sign-In script if not already loaded
    if (typeof window !== 'undefined' && typeof (window as any).google === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  ngAfterViewInit(): void {
    // Initialize Google Sign-In button after view init
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.initializeGoogleSignIn();
      }, 1000);
    }
  }

  initializeGoogleSignIn(): void {
    if (typeof (window as any).google !== 'undefined') {
      (window as any).google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID', // Replace with actual client ID
        callback: (response: any) => this.handleGoogleSuccess(response)
      });

      (window as any).google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular' }
      );
    }
  }

  handleGoogleSuccess(credentialResponse: any): void {
    this.loading = true;
    const idToken = credentialResponse.credential;

    this.authApi.googleAuth(idToken).subscribe({
      next: (res) => {
        if (res.exists) {
          // Existing user
          const anyRes: any = res as any;
          const user = anyRes?.user || anyRes?.data?.user || anyRes?.data || null;
          const token = anyRes?.accessToken || anyRes?.data?.accessToken || anyRes?.token || anyRes?.data?.token || null;
          if (token && user) {
            this.authService.setUser(user);
            this.authService.setToken(token);
            this.router.navigate(['/']);
          } else {
            this.toastr.error('Google login failed');
          }
        } else {
          // First time login → go to role selection
          this.authContext.setGoogleUser({
            name: res.user.name,
            email: res.user.email,
            image: res.user.imgUrl || '',
            provider: 'google'
          });
          this.authContext.setMode('role-select');
        }
      },
      error: (error) => {
        console.error('Google login error:', error);
        this.toastr.error('Google login failed');
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}

