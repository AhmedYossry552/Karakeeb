import { Injectable, signal } from '@angular/core';

export type Role = 'customer' | 'delivery' | 'buyer' | 'none';
export type AuthMode = 'login' | 'signup' | 'forgot-password' | 'role-select' | 'complete-signup';

export interface GoogleUser {
  name: string;
  email: string;
  image: string;
  provider: string;
  idToken?: string; // Store idToken for new users
}

@Injectable({
  providedIn: 'root'
})
export class AuthenticationContextService {
  mode = signal<AuthMode>('login');
  selectedRole = signal<Role>('none');
  step = signal<number>(1);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  loading = signal<boolean>(false);
  googleUser = signal<GoogleUser | null>(null);

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
  }

  setSelectedRole(role: Role): void {
    this.selectedRole.set(role);
  }

  setStep(step: number): void {
    this.step.set(step);
  }

  setShowPassword(show: boolean): void {
    this.showPassword.set(show);
  }

  setShowConfirmPassword(show: boolean): void {
    this.showConfirmPassword.set(show);
  }

  setLoading(loading: boolean): void {
    this.loading.set(loading);
  }

  setGoogleUser(user: GoogleUser | null): void {
    this.googleUser.set(user);
  }

  resetState(): void {
    this.mode.set('login');
    this.selectedRole.set('customer');
    this.step.set(1);
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
    this.loading.set(false);
    this.googleUser.set(null);
  }
}

