import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  constructor(private http: HttpClient) {}

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

    return this.http.get<any>(`${this.apiUrl}/users`, { params });
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

    return this.http.get<any>(`${this.apiUrl}/admin/orders`, { params });
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

