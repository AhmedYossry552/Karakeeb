import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api';
import { AuthService } from './auth.service';

export interface PaymentIntent {
  clientSecret: string;
  id?: string;
}

export interface PaymentResponse {
  success: boolean;
  data?: {
    paymentIntentId: string;
    orderId?: string;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(
    private api: ApiService,
    private authService: AuthService
  ) {}

  createPaymentIntent(amount: number, currency: string = 'egp'): Observable<PaymentIntent> {
    const user = this.authService.getUser();
    if (!user?._id) {
      throw new Error('User must be logged in to create payment intent');
    }

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    // .NET backend uses /users/{id}/create-payment-intent
    // Backend expects Amount (capital A) as long
    // Returns { clientSecret } - we need to map it to { clientSecret, id }
    const amountInCents = Math.round(amount * 100);
    return this.api.post<{ clientSecret: string }>(`/users/${user._id}/create-payment-intent`, {
      Amount: amountInCents // Convert to cents, use capital A for .NET backend
    }).pipe(
      map(response => ({
        clientSecret: response.clientSecret,
        id: response.clientSecret.split('_secret_')[0] || '' // Extract payment intent ID from client secret
      }))
    );
  }

  confirmPayment(paymentIntentId: string, orderData: any): Observable<PaymentResponse> {
    // .NET doesn't have a confirm endpoint - payment is confirmed via Stripe.js on frontend
    // Just return success after order is created
    return new Observable(observer => {
      observer.next({
        success: true,
        data: {
          paymentIntentId,
          orderId: orderData.orderId
        }
      });
      observer.complete();
    });
  }

  getPaymentReceipt(paymentId: string): Observable<any> {
    // .NET uses /api/payment/{id} (admin only) or /api/users/{id}/payments
    // For now, return empty - implement if needed
    return new Observable(observer => {
      observer.next({});
      observer.complete();
    });
  }
}
