import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { AuthService, User } from './auth.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterUserRequest {
  name: string;
  email: string;
  phoneNumber: string;
  role: 'none' | 'customer' | 'buyer' | 'delivery';
  password?: string;
  provider?: string;
  imgUrl?: string;
  attachments?: Record<string, any>;
  idToken?: string;
  otpCode?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  deliveryStatus?: string;
  declineReason?: string;
  declinedAt?: string;
  canReapply?: boolean;
  message?: string;
}

export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
}

export interface RegisterDeliveryRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  provider?: string;
  licenseNumber: string;
  vehicleType: string;
  nationalId?: string;
  emergencyContact?: string;
  deliveryImage?: string; // base64 string
  vehicleImage?: string; // base64 string
  criminalRecord?: string; // base64 string
}

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  constructor(private api: ApiService) {}

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', data);
  }

  register(data: RegisterUserRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', data);
  }

  registerDelivery(data: RegisterDeliveryRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/registerDelivery', data);
  }

  initiateSignup(email: string): Observable<any> {
    return this.api.post('/auth/initiateSignup', { email });
  }

  verifyOtp(data: VerifyOtpRequest): Observable<{ message: string }> {
    return this.api.post('/auth/verifyOtp', data);
  }

  forgotPassword(email: string): Observable<any> {
    return this.api.post('/auth/forgotPassword', { email });
  }

  resetPassword(data: { email: string; otpCode: string; newPassword: string }): Observable<any> {
    return this.api.post('/auth/resetPassword', data);
  }

  googleAuth(idToken: string): Observable<{ exists: boolean; user: User; accessToken?: string }> {
    return this.api.post('/auth/provider/google', { idToken });
  }
}

