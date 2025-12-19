import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';

export interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  address: OrderAddress;
  status: OrderStatus;
  paymentMethod?: string;
  totalPrice: number;
  deliveryFee?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  _id: string;
  name: { en: string; ar: string } | string;
  image: string;
  quantity: number;
  price: number;
  points?: number;
  categoryId?: string;
  categoryName?: { en: string; ar: string } | string;
  measurement_unit?: 1 | 2;
}

export interface OrderAddress {
  _id?: string;
  city: string;
  area: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  landmark?: string;
  notes?: string;
}

export type OrderStatus = 'pending' | 'assigntocourier' | 'completed' | 'cancelled' | 'collected';

export interface OrdersResponse {
  success: boolean;
  data: Order[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    hasNextPage: boolean;
  };
}

export interface Payment {
  _id: string;
  amount: number;
  status: string;
  created: number;
  receipt_url?: string;
  paymentMethod?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  constructor(private api: ApiService) {}

  getOrders(params?: { page?: number; limit?: number; status?: string }): Observable<OrdersResponse> {
    return this.api.get<OrdersResponse>('/orders', { params });
  }

  getOrderById(orderId: string): Observable<{ success: boolean; data: Order }> {
    return this.api.get<{ success: boolean; data: Order }>(`/orders/${orderId}`);
  }

  cancelOrder(orderId: string, reason?: string): Observable<any> {
    // Backend expects CancelOrderRequest with Reason (capital R) and Notes properties
    // Always use PATCH /cancel endpoint for consistency
    const cancelRequest = {
      Reason: reason || 'Order cancelled by user',
      Notes: reason || 'Order cancelled by user'
    };
    return this.api.patch(`/orders/${orderId}/cancel`, cancelRequest);
  }

  deleteOrder(orderId: string): Observable<any> {
    return this.api.delete(`/orders/${orderId}`);
  }

  getUserPayments(userId: string): Observable<Payment[]> {
    return this.api.get<Payment[]>(`/users/${userId}/payments`);
  }
}

