import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { ApiService } from './api';
import { StorageService } from './storage.service';

export interface User {
  _id: string;
  email: string;
  name?: string;
  role: 'admin' | 'customer' | 'buyer' | 'delivery';
  isApproved?: boolean;
  deliveryStatus?: string;
  declineReason?: string;
  declinedAt?: string;
  attachments?: any;
  [key: string]: any;
}

export interface UserRewards {
  points: number;
  tier: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private deliveryStatusSubject = new BehaviorSubject<string | null>(null);
  private userRewardsSubject = new BehaviorSubject<UserRewards | null>(null);

  // Public observables
  user$ = this.userSubject.asObservable();
  token$ = this.tokenSubject.asObservable();
  isLoading$ = this.loadingSubject.asObservable();
  deliveryStatus$ = this.deliveryStatusSubject.asObservable();
  userRewards$ = this.userRewardsSubject.asObservable();

  // Computed observables
  isAdmin$ = this.user$.pipe(map(user => user?.role === 'admin'));
  isDelivery$ = this.user$.pipe(map(user => user?.role === 'delivery'));
  isBuyer$ = this.user$.pipe(map(user => user?.role === 'buyer'));
  isCustomer$ = this.user$.pipe(map(user => user?.role === 'customer'));
  isApprovedDelivery$ = this.user$.pipe(
    map(user => user?.role === 'delivery' && (user?.isApproved === true || user?.deliveryStatus === 'accepted'))
  );
  isPendingOrDeclinedDelivery$ = this.user$.pipe(
    map(user => user?.role === 'delivery' && 
           (user?.isApproved === false || 
            user?.deliveryStatus === 'pending' || 
            user?.deliveryStatus === 'declined'))
  );

  // Helper getters for synchronous access
  get isAdmin(): boolean {
    return this.userSubject.value?.role === 'admin';
  }

  get isDelivery(): boolean {
    return this.userSubject.value?.role === 'delivery';
  }

  get isBuyer(): boolean {
    return this.userSubject.value?.role === 'buyer';
  }

  get isCustomer(): boolean {
    return this.userSubject.value?.role === 'customer';
  }

  get isApprovedDelivery(): boolean {
    const user = this.userSubject.value;
    return user?.role === 'delivery' && (user?.isApproved === true || user?.deliveryStatus === 'accepted');
  }

  get isPendingOrDeclinedDelivery(): boolean {
    const user = this.userSubject.value;
    return user?.role === 'delivery' && 
           (user?.isApproved === false || 
            user?.deliveryStatus === 'pending' || 
            user?.deliveryStatus === 'declined');
  }

  constructor(
    private api: ApiService,
    private storage: StorageService
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const storedUser = this.storage.getItem<User>('user');
    // Get token as plain string from localStorage
    let storedToken: string | null = null;
    if (typeof window !== 'undefined') {
      storedToken = localStorage.getItem('token');
      if (storedToken) {
        console.log('🔑 Initializing auth: Token found in localStorage:', storedToken.substring(0, 20) + '...');
      }
      // Removed warning - it's expected that there might not be a token for unauthenticated users
    }

    if (storedUser && storedToken) {
      this.userSubject.next(storedUser);
      this.tokenSubject.next(storedToken);
      this.determineDeliveryStatus(storedUser);
      console.log('✅ Auth initialized: User and token loaded');
    }
    // Removed warning - it's expected that there might not be user/token for unauthenticated users

    this.loadingSubject.next(false);
  }

  setUser(user: User | null): void {
    if (user) {
      this.storage.setItem('user', user);
    } else {
      this.storage.removeItem('user');
    }
    this.userSubject.next(user);
    if (user) {
      this.determineDeliveryStatus(user);
    } else {
      this.deliveryStatusSubject.next(null);
    }
  }

  setToken(token: string | null): void {
    if (token) {
      // Store token as plain string, not JSON
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        console.log('✅ Token stored in localStorage:', token.substring(0, 20) + '...');
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      this.storage.removeItem('token');
    }
    this.tokenSubject.next(token);
  }

  getUser(): User | null {
    return this.userSubject.value;
  }

  getToken(): string | null {
    // Always get fresh token from localStorage to ensure it's up to date
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && token !== this.tokenSubject.value) {
        this.tokenSubject.next(token);
      }
      // Removed warning - it's expected that there might not be a token for unauthenticated users
      return token;
    }
    return this.tokenSubject.value;
  }

  logout(): void {
    // Best-effort server-side logout (revokes refresh token + clears HttpOnly cookie).
    // Do this before clearing localStorage so the request can still include Bearer token if needed.
    try {
      this.api.post('/auth/logout', {}).subscribe({
        next: () => {},
        error: () => {}
      });
    } catch {
      // Ignore logout network errors; local logout still proceeds.
    }

    // Always clear local auth state.
    this.setUser(null);
    this.setToken(null);
    this.storage.removeItem('user');
    this.storage.removeItem('token');
    this.storage.removeItem('freshLogin');
  }

  private determineDeliveryStatus(user: User): void {
    if (user.role !== 'delivery') {
      this.deliveryStatusSubject.next(null);
      return;
    }

    const attachments = user.attachments;
    const declineReason = user.declineReason || attachments?.declineReason;
    const revokeReason = attachments?.revokeReason;
    const declinedAt = user.declinedAt || attachments?.declinedAt;
    const revokedAt = attachments?.revokedAt;
    const approvedAt = attachments?.approvedAt;

    const declineTimestamp = declinedAt ? new Date(declinedAt).getTime() : 0;
    const revokeTimestamp = revokedAt ? new Date(revokedAt).getTime() : 0;
    const approveTimestamp = approvedAt ? new Date(approvedAt).getTime() : 0;

    const mostRecentTimestamp = Math.max(declineTimestamp, revokeTimestamp, approveTimestamp);

    if (mostRecentTimestamp === revokeTimestamp && revokeReason) {
      this.deliveryStatusSubject.next('revoked');
    } else if (mostRecentTimestamp === declineTimestamp && declineReason) {
      this.deliveryStatusSubject.next('declined');
    } else if (user.isApproved === true && (mostRecentTimestamp === approveTimestamp || approveTimestamp > 0)) {
      this.deliveryStatusSubject.next('approved');
    } else {
      this.deliveryStatusSubject.next('pending');
    }
  }

  setUserRewards(rewards: UserRewards | null): void {
    this.userRewardsSubject.next(rewards);
  }

  getUserRewards(): UserRewards | null {
    return this.userRewardsSubject.value;
  }

  refreshAccessToken(): Observable<any> {
    // .NET backend uses /api/auth/refresh (POST) with refresh token in cookie
    // The cookie is sent automatically, so we just need to call the endpoint
    return this.api.post('/auth/refresh', {});
  }

  refreshDeliveryStatus(): Observable<any> {
    const user = this.getUser();
    if (!user || user.role !== 'delivery') {
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }
    // .NET doesn't have delivery status endpoint - use user's isApproved flag
    return new Observable(observer => {
      observer.next({
        status: user.isApproved ? 'approved' : 'pending',
        isApproved: user.isApproved
      });
      observer.complete();
    });
  }

  checkPublicDeliveryStatus(email: string): Observable<any> {
    // .NET doesn't have public delivery status endpoint
    // Return pending status as default
    return new Observable(observer => {
      observer.next({
        status: 'pending',
        isApproved: false
      });
      observer.complete();
    });
  }
}

