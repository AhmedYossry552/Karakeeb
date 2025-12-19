import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DashboardData {
  totalOrders: number;
  orderStatus: { [key: string]: number };
  ordersPerDay: number[];
  topUsers: any[];
  userGrowth: { label: string; count: number }[];
  topMaterials: any[];
  citiesData: { labels: string[]; datasets: any[] } | null;
  categories: any[];
}

export interface LoadingState {
  analytics: boolean;
  users: boolean;
  materials: boolean;
  userStats: boolean;
  cities: boolean;
  categories: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  fetchAllDashboardData(): Observable<DashboardData> {
    return forkJoin({
      analytics: this.http.get<any>(`${this.apiUrl}/orders/analytics`).pipe(
        catchError(() => of({ success: false, data: null }))
      ),
      users: this.http.get<any>(`${this.apiUrl}/points/leaderboard`).pipe(
        catchError(() => of({ success: false, data: [] }))
      ),
      materials: this.http.get<any>(`${this.apiUrl}/top-materials-recycled`).pipe(
        catchError(() => of([]))
      ),
      stats: this.http.get<any>(`${this.apiUrl}/stats`).pipe(
        catchError(() => of({ success: false, data: [] }))
      ),
      cities: this.http.get<any>(`${this.apiUrl}/orders/analytics/top-cities`).pipe(
        catchError(() => of({ success: false, data: [] }))
      ),
      categories: this.http.get<any>(`${this.apiUrl}/categories`).pipe(
        catchError(() => of([]))
      ),
      orders: this.http.get<any>(`${this.apiUrl}/admin/orders?limit=1000`).pipe(
        catchError(() => of({ success: false, data: [] }))
      )
    }).pipe(
      map((results) => {
        // Process analytics
        let totalOrders = 0;
        let orderStatus: { [key: string]: number } = {};
        let ordersPerDay: number[] = [];
        
        if (results.analytics?.success && results.analytics?.data) {
          totalOrders = results.analytics.data.totalOrders || 0;
          orderStatus = results.analytics.data.statusCounts || {};
          ordersPerDay = results.analytics.data.dailyOrders || [];
        }

        // Process users
        let topUsers = results.users?.success ? (results.users.data || []) : [];

        // Calculate order counts per user
        if (results.orders?.success && results.orders.data?.data) {
          const orders = results.orders.data.data;
          const orderCounts: { [userId: string]: number } = {};
          
          orders.forEach((order: any) => {
            const userId = order.userId || order.user?._id || order.user?.id;
            if (userId) {
              orderCounts[userId] = (orderCounts[userId] || 0) + 1;
            }
          });

          // Merge order counts into topUsers
          topUsers = topUsers.map((user: any) => ({
            ...user,
            orderCount: orderCounts[user._id || user.id || user.userId] || 0
          }));
        }

        // Process materials
        const topMaterials = Array.isArray(results.materials) ? results.materials : [];

        // Process user stats
        const userGrowth = results.stats?.success ? (results.stats.data || []) : [];

        // Process cities
        let citiesData: { labels: string[]; datasets: any[] } | null = null;
        if (results.cities?.success && results.cities.data?.length > 0) {
          const cities = results.cities.data;
          citiesData = {
            labels: cities.map((c: any) => c.city),
            datasets: [{
              label: 'Orders',
              data: cities.map((c: any) => c.totalOrders),
              backgroundColor: 'rgba(34, 197, 94, 0.6)',
              borderColor: 'rgba(34, 197, 94, 1)',
              borderWidth: 1
            }]
          };
        }

        // Process categories
        const categories = Array.isArray(results.categories) ? results.categories : [];

        return {
          totalOrders,
          orderStatus,
          ordersPerDay,
          topUsers,
          userGrowth,
          topMaterials,
          citiesData,
          categories
        };
      })
    );
  }
}

