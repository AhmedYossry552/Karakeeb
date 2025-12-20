import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api';

export interface Transaction {
  _id: string;
  type: 'cashback' | 'withdrawal' | 'deposit' | 'recycle' | 'redeem' | 'purchase';
  amount: number;
  date: string;
  description?: string;
  status?: string;
  gateway?: string;
}

export interface EWalletBalance {
  balance: number;
}

@Injectable({
  providedIn: 'root'
})
export class EWalletService {
  constructor(private api: ApiService) {}

  getBalance(userId: string): Observable<EWalletBalance> {
    // .NET backend: GET /api/wallet
    return this.api.get<any>(`/wallet`).pipe(
      map(response => {
        // Handle different response formats
        if (response?.success && response.data) {
          return { balance: response.data.balance || 0 };
        } else if (response?.balance !== undefined) {
          return { balance: response.balance };
        } else if (response?.data?.balance !== undefined) {
          return { balance: response.data.balance };
        }
        // Fallback: try user endpoint
        return { balance: 0 };
      })
    );
  }

  getBalanceFromUser(userId: string): Observable<EWalletBalance> {
    // Fallback: GET /api/users/{userId}
    return this.api.get<any>(`/users/${userId}`).pipe(
      map(user => ({
        balance: user.attachments?.balance || 0
      }))
    );
  }

  getTransactions(userId: string): Observable<Transaction[]> {
    // .NET backend: GET /api/wallet/transactions
    return this.api.get<any>(`/wallet/transactions`).pipe(
      map(response => {
        let transactions: any[] = [];
        
        if (response?.success && response.data) {
          transactions = response.data.transactions || response.data || [];
        } else if (Array.isArray(response)) {
          transactions = response;
        } else if (response?.transactions) {
          transactions = response.transactions;
        }
        
        // Map backend format to frontend format
        return transactions.map((t: any) => ({
          _id: t._id || t.Id || t.id || '',
          type: (t.type || t.Type || 'cashback').toLowerCase(),
          amount: t.amount || t.Amount || 0,
          date: t.date || t.Date || t.transactionDate || t.TransactionDate || new Date().toISOString(),
          description: t.description || t.Description || t.reason || t.Reason || '',
          status: t.status || t.Status || 'completed',
          gateway: t.gateway || t.Gateway || ''
        }));
      })
    );
  }

  withdraw(userId: string, amount: number, gateway: string): Observable<any> {
    // .NET backend: POST /api/wallet/transactions
    // Backend expects: Gateway, Amount, Type (case-insensitive, but using exact case for clarity)
    return this.api.post(`/wallet/transactions`, {
      Gateway: gateway,
      Amount: amount,
      Type: 'withdrawal'
    });
  }

  deposit(userId: string, amount: number, description?: string): Observable<any> {
    // Use wallet endpoint with type 'cashback' to add money to wallet
    return this.api.post(`/wallet/transactions`, {
      amount,
      type: 'cashback',
      gateway: description || 'points_conversion'
    });
  }
}
