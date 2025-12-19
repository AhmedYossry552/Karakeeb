import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api';

export interface UserPoints {
  totalPoints: number;
  pointsHistory: PointsHistoryItem[];
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface PointsHistoryItem {
  _id: string;
  points: number;
  reason: string;
  orderId?: string;
  createdAt: string;
  type: 'earned' | 'deducted';
}

export interface DeductPointsRequest {
  points: number;
  reason: string;
}

export interface DeductPointsResponse {
  success: boolean;
  message: string;
  data: {
    totalPoints: number;
    pointsDeducted: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PointsService {
  constructor(private api: ApiService) {}

  getUserPoints(userId?: string, page: number = 1, limit: number = 10): Observable<UserPoints> {
    // If no userId provided, use /api/points/me (recommended - works for current user)
    if (!userId) {
      return this.api.get<any>('/points/me', {
        params: { page, limit }
      }).pipe(
        map(response => {
          // Backend returns UserPointsSummaryDto directly from /points/me
          if (response) {
            const data = response.data || response; // Handle both wrapped and unwrapped responses
            return {
              totalPoints: data.totalPoints || 0,
              pointsHistory: (data.history || []).map((h: any) => ({
                _id: h.orderId || h._id || '',
                points: h.points,
                reason: h.reason,
                orderId: h.orderId,
                createdAt: h.timestamp || h.createdAt || new Date().toISOString(),
                type: h.type === 'earned' ? 'earned' : 'deducted'
              })),
              pagination: data.pagination ? {
                page: data.pagination.currentPage || page,
                limit: data.pagination.itemsPerPage || limit,
                totalPages: data.pagination.totalPages || 1,
                hasMore: data.pagination.hasNextPage || false
              } : undefined
            };
          }
          return {
            totalPoints: 0,
            pointsHistory: []
          };
        })
      );
    }

    // Use /api/users/{userId}/points (existing endpoint from UsersController)
    return this.api.get<any>(`/users/${userId}/points`, {
      params: { page, limit }
    }).pipe(
      map(response => {
        console.log('🔍 Raw points API response:', response);
        
        // Backend returns { success: true, data: {...} }
        if (response?.success && response.data) {
          const totalPoints = response.data.totalPoints || 0;
          const pointsHistory = response.data.pointsHistory || [];
          
          console.log('📊 Parsed totalPoints:', totalPoints);
          console.log('📜 Parsed pointsHistory length:', pointsHistory.length);
          console.log('📜 PointsHistory items:', pointsHistory);
          
          return {
            totalPoints: totalPoints,
            pointsHistory: pointsHistory.map((h: any) => ({
              _id: h._id || h.orderId || '',
              points: h.points,
              reason: h.reason,
              orderId: h.orderId,
              timestamp: h.timestamp || h.createdAt || new Date().toISOString(),
              createdAt: h.createdAt || h.timestamp || new Date().toISOString(),
              type: h.type === 'earned' ? 'earned' : 'deducted'
            })),
            pagination: response.data.pagination ? {
              page: response.data.pagination.currentPage || page,
              limit: response.data.pagination.itemsPerPage || limit,
              totalPages: response.data.pagination.totalPages || 1,
              hasMore: response.data.pagination.hasMore || false
            } : undefined
          };
        }
        
        console.warn('⚠️ Points API response format unexpected:', response);
        return {
          totalPoints: 0,
          pointsHistory: []
        };
      })
    );
  }

  deductPoints(userId: string, request: DeductPointsRequest): Observable<DeductPointsResponse> {
    // Use /api/users/{userId}/points/deduct (existing endpoint from UsersController)
    // This endpoint allows customers to deduct their own points
    return this.api.post<any>(`/users/${userId}/points/deduct`, {
      points: request.points,
      reason: request.reason
    }).pipe(
      map(response => ({
        success: response?.success || true,
        message: response?.message || 'Points deducted successfully',
        data: {
          totalPoints: response?.data?.totalPoints || 0,
          pointsDeducted: response?.data?.pointsDeducted || request.points
        }
      }))
    );
  }
}

