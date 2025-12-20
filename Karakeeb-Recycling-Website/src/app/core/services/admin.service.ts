import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Category {
  _id: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  image: string;
  items?: any[];
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: 'admin' | 'customer' | 'buyer' | 'delivery';
  imgUrl?: string;
  lastActiveAt?: string;
  attachments?: any;
}

export interface Order {
  _id: string;
  orderId?: string;
  status: string;
  createdAt: string;
  // Admin orders return flat structure
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  paymentMethod?: string;
  totalAmount?: number;
  // Regular orders return nested structure
  user?: {
    userName?: string;
    name?: string;
    email: string;
    role: string;
    phoneNumber?: string;
    imageUrl?: string;
  };
  items?: any[];
  address?: any;
  courier?: any;
  deliveryProof?: {
    photoUrl?: string;
    notes?: string;
  };
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  billing_details?: {
    email?: string;
    name?: string;
  };
  refunded?: boolean;
  disputed?: boolean;
  failure_code?: string;
  amount_captured?: number;
  amount_refunded?: number;
}

export interface CashbackTransaction {
  transactionId: number;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  date: string;
  type: string;
  gateway?: string | null;
}

export interface DeliveryUser {
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  currentStatus: 'pending' | 'approved' | 'declined' | 'revoked';
  attachments?: any;
  rating?: number;
  totalReviews?: number;
  canReapply?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5000; // 5 seconds cache

  constructor(private http: HttpClient) {}

  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Categories
  getCategories(page: number = 1, limit: number = 10, search?: string, language: string = 'en'): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('language', language);
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<any>(`${this.apiUrl}/categories`, { params });
  }

  createCategory(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/categories`, formData);
  }

  updateCategory(categoryName: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/categories/${encodeURIComponent(categoryName)}`, data);
  }

  getCategoryByName(categoryName: string, language: string = 'en'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categories/get-items/${encodeURIComponent(categoryName)}`, {
      params: { language }
    });
  }

  deleteCategory(categoryName: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categories/${encodeURIComponent(categoryName)}`);
  }

  // Users
  getUsers(page: number = 1, limit: number = 10, role?: string, search?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (role) {
      params = params.set('role', role);
    }
    if (search) {
      params = params.set('search', search);
    }

    const cacheKey = this.getCacheKey('users', { page, limit, role, search });
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return of(cached);
    }

    return this.http.get<any>(`${this.apiUrl}/users`, { params }).pipe(
      map(response => {
        this.setCache(cacheKey, response);
        return response;
      }),
      shareReplay(1),
      catchError(error => {
        const cached = this.getCached<any>(cacheKey);
        if (cached) {
          return of(cached);
        }
        throw error;
      })
    );
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}`, { role });
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`);
  }

  // Orders
  getOrders(page: number = 1, limit: number = 10, userRole?: string, status?: string, date?: string, search?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (userRole) params = params.set('userRole', userRole);
    if (status) params = params.set('status', status);
    if (date) params = params.set('date', date);
    if (search) params = params.set('search', search);

    const cacheKey = this.getCacheKey('admin/orders', { page, limit, userRole, status, date, search });
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return of(cached);
    }

    return this.http.get<any>(`${this.apiUrl}/admin/orders`, { params }).pipe(
      map(response => {
        this.setCache(cacheKey, response);
        return response;
      }),
      shareReplay(1),
      catchError(error => {
        // Return cached data on error if available
        const cached = this.getCached<any>(cacheKey);
        if (cached) {
          return of(cached);
        }
        throw error;
      })
    );
  }

  updateOrderStatus(orderId: string, status: string, reason?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/orders/${orderId}/status`, { 
      status, 
      reason: reason || null,
      notes: null
    });
  }

  deleteOrder(orderId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/orders/${orderId}`);
  }

  getOrderById(orderId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/orders/${orderId}`);
  }

  assignCourier(orderId: string, courierId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/assign-courier`, { 
      courierId: courierId, 
      status: 'assignToCourier' 
    });
  }

  autoAssignCourier(orderId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/auto-assign-courier`, {}, {
      observe: 'response'
    }).pipe(
      map(response => {
        // 204 NoContent means success - courier was assigned
        // Return the status code so we can verify assignment
        return { status: response.status, success: response.status === 204 };
      }),
      catchError(error => {
        // Handle 400 BadRequest (no courier found) and other errors
        if (error.status === 400) {
          let errorMessage = 'No suitable courier found for this order';
          // Try to extract error message from different possible formats
          if (error.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.error?.error) {
              errorMessage = error.error.error;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          throw { status: 400, error: { message: errorMessage }, originalError: error };
        }
        throw error;
      })
    );
  }

  getCouriers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users`, { params: { role: 'delivery', limit: '100' } });
  }

  // Transactions
  getPayments(page: number = 1, limit: number = 10, filters?: any): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.currency) params = params.set('currency', filters.currency);
    if (filters?.country) params = params.set('country', filters.country);

    return this.http.get<any>(`${this.apiUrl}/payment`, { params }).pipe(
      map((response: any) => {
        if (response.success && response.data && Array.isArray(response.data)) {
          return {
            success: true,
            data: response.data,
            pagination: {
              page: response.pagination?.page || page,
              limit: response.pagination?.limit || limit,
              total: response.pagination?.total || response.data.length,
              totalPages: response.pagination?.totalPages || Math.ceil((response.pagination?.total || response.data.length) / limit)
            },
            stats: response.stats || null,
            filters: response.filters || null
          };
        }
        return response;
      })
    );
  }

  getWalletSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/wallet/admin/summary`);
  }

  getCashbackTransactions(page: number = 1, limit: number = 10): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/wallet/admin/cashbacks`, { params });
  }

  refundPayment(paymentId: string, amount: number, reason: string, customerEmail?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/${paymentId}/refund`, {
      amount,
      reason,
      customerEmail
    });
  }

  // Delivery Approvals
  getDeliveryAttachments(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/delivery-attachments`).pipe(
      map((response: any) => {
        if (response.data) {
          return response;
        }
        return { success: true, data: response };
      })
    );
  }

  approveDelivery(userId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/delivery/${userId}/approve`, { isApproved: true });
  }

  declineDelivery(userId: string, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/delivery/${userId}/approve`, { isApproved: false });
  }

  revokeDelivery(userId: string, reason: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/delivery/${userId}/approve`, { isApproved: false });
  }
}

