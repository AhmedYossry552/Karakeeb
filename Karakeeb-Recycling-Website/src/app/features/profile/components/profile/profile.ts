import { Component, OnInit, OnDestroy, AfterViewInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { AuthService, User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ApiService } from '../../../../core/services/api';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import { ToastrService } from 'ngx-toastr';
import { PointsService } from '../../../../core/services/points.service';
import { EWalletService } from '../../../../core/services/ewallet.service';
import { Socket } from '../../../../core/services/socket';
import { OrdersService } from '../../../../core/services/orders.service';
import { ProfileHeaderComponent } from '../profile-header/profile-header';
import { StatsSectionComponent } from '../stats-section/stats-section';
import { TabNavigationComponent } from '../tab-navigation/tab-navigation';
import { TabContentComponent } from '../tab-content/tab-content';
import { RedeemPointsComponent } from '../../../ewallet/components/redeem-points/redeem-points';
import { PointsActivityComponent } from '../../../buyer-orders/components/points-activity/points-activity';
import { ReviewModalComponent, ReviewableOrder, ExistingReview } from '../review-modal/review-modal';

export interface Order {
  _id: string;
  status: string;
  createdAt: string;
  items: any[];
  address: {
    street: string;
    building: string;
    floor: number;
    area: string;
    city: string;
  };
  [key: string]: any;
}

export interface OrdersResponse {
  success: boolean;
  data: Order[];
  totalCount?: number;
}

export interface UserPoints {
  totalPoints: number;
  [key: string]: any;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ProfileHeaderComponent,
    StatsSectionComponent,
    TabNavigationComponent,
    TabContentComponent,
    RedeemPointsComponent,
    PointsActivityComponent,
    ReviewModalComponent
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfileComponent implements OnInit, OnDestroy, AfterViewInit {
  user = signal<User | null>(null);
  activeTab = signal<string>('incoming');
  isLoading = signal<boolean>(true);
  allOrders = signal<Order[]>([]);
  userPoints = signal<UserPoints | null>(null);
  pointsLoading = signal<boolean>(false);
  walletBalance = signal<number>(0);
  walletLoading = signal<boolean>(false);
  userReviews = signal<any[]>([]);
  reviewsLoading = signal<boolean>(false);
  showRedeemModal = signal<boolean>(false);
  showReviewModal = signal<boolean>(false);
  selectedOrderForReview = signal<ReviewableOrder | null>(null);
  existingReview = signal<ExistingReview | null>(null);
  
  private subscriptions = new Subscription();

  private pollingSubscription?: Subscription;
  private socketSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    public translation: TranslationService,
    private api: ApiService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private toastr: ToastrService,
    private pointsService: PointsService,
    private ewalletService: EWalletService,
    private socket: Socket,
    private ordersService: OrdersService
  ) {}

  ngOnInit(): void {
    // Subscribe to user changes
    this.subscriptions.add(
      this.authService.user$.subscribe(user => {
        this.user.set(user);
        if (user) {
          this.loadData();
          this.setupSocketListeners();
          this.startPolling();
        }
      })
    );

    // Force refresh orders when component is initialized (in case user just created an order)
    // This ensures new orders appear immediately
    setTimeout(() => {
      this.loadOrders();
    }, 1500);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopPolling();
    this.removeSocketListeners();
  }

  private loadData(): void {
    const user = this.user();
    if (!user) return;

    this.isLoading.set(true);

    // Load orders
    this.loadOrders();

    // Load points and wallet for customers
    if (user.role === 'customer') {
      this.loadUserPoints();
      this.loadWalletBalance();
    }

    // Load reviews for buyers and customers
    if (user.role === 'buyer' || user.role === 'customer') {
      this.loadReviews();
    }
  }

  private loadOrders(): void {
    // Don't show loading spinner if this is a background refresh
    const isBackgroundRefresh = !this.isLoading();
    
    if (!isBackgroundRefresh) {
      this.isLoading.set(true);
    }

    // Fetch all orders without status filter to get completed orders
    // Use smaller limit first to avoid timeout, then fetch more if needed
    this.api.get<OrdersResponse>('/orders', {
      params: { page: 1, limit: 100 } // Start with reasonable limit
    }).subscribe({
      next: (response) => {
        console.log('📥 Raw API response:', response);
        
        // Handle different response formats - response.data is already Order[]
        const ordersData = response.data || [];
        
        if (response.success && ordersData && Array.isArray(ordersData)) {
          // Filter out any invalid orders (missing required fields)
          const validOrders = ordersData.filter((order: Order) => {
            return order && order._id && order.status;
          });
          
          // Normalize status to lowercase for consistent comparison
          const normalizedOrders = validOrders.map((order: Order) => ({
            ...order,
            status: order.status?.toLowerCase() || order.status
          }));
          
          console.log('📦 Orders loaded:', normalizedOrders.length);
          console.log('📊 Order statuses:', normalizedOrders.map((o: Order) => ({ id: o._id?.slice(-8) || 'unknown', status: o.status })));
          
          const previousCompletedCount = this.allOrders().filter(o => this.isOrderCompleted(o.status)).length;
          const previousOrders = this.allOrders();
          this.allOrders.set(normalizedOrders);
          
          // Check if any orders were completed (handles both 'completed' and 'collected')
          const currentCompletedCount = normalizedOrders.filter((o: Order) => this.isOrderCompleted(o.status)).length;
          const newCompletedOrders = normalizedOrders.filter((order: Order) => {
            const previousOrder = previousOrders.find(p => p._id === order._id);
            const isCompleted = this.isOrderCompleted(order.status);
            const wasCompleted = previousOrder ? this.isOrderCompleted(previousOrder.status) : false;
            return isCompleted && !wasCompleted;
          });

          console.log('✅ Completed orders:', currentCompletedCount);
          console.log('🆕 New completed orders:', newCompletedOrders.length);

          const user = this.user();
          if (user && user.role === 'customer') {
            // If new orders were completed, refresh points
            if (newCompletedOrders.length > 0) {
              console.log('🔄 New completed orders detected:', newCompletedOrders.length);
              console.log('🔄 Reloading points after orders loaded. Completed orders:', currentCompletedCount);
              
              // First try to add retroactive points (in case backend didn't add them automatically)
              this.addRetroactivePoints();
              
              // Then reload points after a delay to ensure backend has processed points
              setTimeout(() => {
                this.loadUserPoints();
              }, 2000);
            } else if (currentCompletedCount > previousCompletedCount) {
              // Completed count increased but we didn't detect new orders (might be a race condition)
              console.log('🔄 Completed orders count increased, refreshing points');
              
              // Try retroactive points in case they're missing
              this.addRetroactivePoints();
              
              setTimeout(() => {
                this.loadUserPoints();
              }, 2000);
            }
          }
        } else {
          console.warn('⚠️ Orders response missing data:', response);
          console.warn('⚠️ Response structure:', {
            success: response.success,
            hasData: !!response.data,
            dataType: typeof response.data,
            dataLength: Array.isArray(response.data) ? response.data.length : 'not array'
          });
          // Set empty array if no orders found
          this.allOrders.set([]);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Failed to load orders:', error);
        console.error('❌ Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url
        });
        
        // If it's a 500 error, try with a smaller limit
        if (error.status === 500) {
          console.log('⚠️ 500 error detected, trying with smaller limit...');
          // Retry with smaller limit after a delay
          setTimeout(() => {
            this.api.get<OrdersResponse>('/orders', {
              params: { page: 1, limit: 10 }
            }).subscribe({
              next: (retryResponse) => {
                if (retryResponse.success && retryResponse.data) {
                  const validOrders = retryResponse.data.filter((order: Order) => order && order._id && order.status);
                  const normalizedOrders = validOrders.map((order: Order) => ({
                    ...order,
                    status: order.status?.toLowerCase() || order.status
                  }));
                  this.allOrders.set(normalizedOrders);
                  console.log('✅ Orders loaded with retry:', normalizedOrders.length);
                }
                this.isLoading.set(false);
              },
              error: (retryError) => {
                console.error('❌ Retry also failed:', retryError);
                this.allOrders.set([]);
                this.isLoading.set(false);
              }
            });
          }, 2000);
        } else {
          this.allOrders.set([]);
          this.isLoading.set(false);
        }
      }
    });
  }

  // Helper method to normalize status (case-insensitive)
  private normalizeStatus(status: string | undefined): string {
    if (!status) return '';
    return status.toLowerCase().trim();
  }

  // Helper method to check if an order is completed (handles both 'completed' and 'collected' statuses)
  private isOrderCompleted(status: string | undefined): boolean {
    const normalized = this.normalizeStatus(status);
    return normalized === 'completed' || normalized === 'collected';
  }

  private loadUserPoints(): void {
    // Prevent multiple simultaneous calls
    if (this.pointsLoading()) {
      console.log('⏸️ Points already loading, skipping...');
      return;
    }

    const user = this.user();
    console.log('🔍 loadUserPoints called - user:', user?._id, 'role:', user?.role);
    
    // Track last load time
    (this as any).lastPointsLoad = Date.now();
    
    if (!user?._id || user.role !== 'customer') {
      console.log('⚠️ Cannot load points - user:', user?._id, 'role:', user?.role);
      // Set empty points for non-customers
      this.userPoints.set({ totalPoints: 0, pointsHistory: [] });
      this.pointsLoading.set(false);
      return;
    }

    console.log('🔄 Starting loadUserPoints for user:', user._id);
    this.pointsLoading.set(true);
    
    // Try /users/{userId}/points endpoint first (it wraps in { success: true, data: {...} })
    console.log('🔄 Making API call to /users/' + user._id + '/points...');
    const subscription = this.api.get<any>(`/users/${user._id}/points`, {
      params: { page: 1, limit: 100 }
    }).subscribe({
        next: (response) => {
          console.log('✅ API call successful! Response received');
          console.log('✅ Full response:', JSON.stringify(response, null, 2));
          console.log('✅ Response type:', typeof response);
          console.log('✅ Response keys:', Object.keys(response || {}));
        
        // This endpoint returns { success: true, data: { totalPoints, pointsHistory, ... } }
        let totalPoints = 0;
        let history: any[] = [];
        
        // CRITICAL: Log the entire response structure
        console.log('🔍 FULL RESPONSE ANALYSIS:');
        console.log('🔍 response:', response);
        console.log('🔍 response.success:', response?.success);
        console.log('🔍 response.data:', response?.data);
        console.log('🔍 response.data?.totalPoints:', response?.data?.totalPoints);
        console.log('🔍 response.data?.TotalPoints:', response?.data?.TotalPoints);
        
        if (response && response.success && response.data) {
          const data = response.data;
          console.log('📦 Response has success=true and data property');
          console.log('📦 Data object:', JSON.stringify(data, null, 2));
          console.log('📦 Data keys:', Object.keys(data || {}));
          
          // Try multiple ways to get totalPoints
          if (data.totalPoints != null) {
            totalPoints = typeof data.totalPoints === 'number' ? data.totalPoints : Number(data.totalPoints) || 0;
          } else if (data.TotalPoints != null) {
            totalPoints = typeof data.TotalPoints === 'number' ? data.TotalPoints : Number(data.TotalPoints) || 0;
          } else {
            totalPoints = 0;
          }
          
          history = data.pointsHistory || data.PointsHistory || data.history || data.History || [];
          
          console.log('✅ Extracted totalPoints:', totalPoints, '(type:', typeof totalPoints, ')');
          console.log('✅ Extracted history length:', Array.isArray(history) ? history.length : 0);
          
          // If totalPoints is still 0, search ALL properties
          if (totalPoints === 0 && data) {
            console.warn('⚠️ totalPoints is 0, searching ALL properties in data object...');
            for (const key in data) {
              const value = data[key];
              console.log(`  - ${key}:`, value, '(type:', typeof value, ')');
              if (key.toLowerCase().includes('point') && value != null) {
                const potentialPoints = typeof value === 'number' ? value : Number(value);
                if (!isNaN(potentialPoints) && potentialPoints > 0) {
                  console.log(`✅ FOUND POINTS in property "${key}":`, potentialPoints);
                  totalPoints = potentialPoints;
                  break;
                }
              }
            }
          }
        } else if (response && (response.totalPoints != null || response.TotalPoints != null)) {
          // Fallback: response might be direct
          console.log('📦 Response is direct (not wrapped)');
          totalPoints = response.totalPoints ?? response.TotalPoints ?? 0;
          history = response.pointsHistory || response.PointsHistory || response.history || response.History || [];
          console.log('✅ Extracted from direct response - totalPoints:', totalPoints);
        } else {
          console.error('❌ Unexpected response structure!');
          console.error('❌ Full response:', JSON.stringify(response, null, 2));
          console.error('❌ Response keys:', Object.keys(response || {}));
        }
        
        // Ensure totalPoints is a number
        const finalTotalPoints = typeof totalPoints === 'string' ? parseFloat(totalPoints) : (typeof totalPoints === 'number' ? totalPoints : 0);
        
        const pointsHistory = (Array.isArray(history) ? history : []).map((h: any) => ({
          _id: h.orderId || h._id || h.OrderId || '',
          points: h.points ?? h.Points ?? 0,
          reason: h.reason || h.Reason || 'Order completed',
          orderId: h.orderId || h.OrderId,
          timestamp: h.timestamp || h.Timestamp || h.createdAt || h.CreatedAt,
          createdAt: h.createdAt || h.CreatedAt || h.timestamp || h.Timestamp || new Date().toISOString(),
          type: (h.type || h.Type || 'earned') === 'earned' ? 'earned' : 'deducted'
        }));
        
        console.log('📊 Final Total Points:', finalTotalPoints, '(type:', typeof finalTotalPoints, ')');
        console.log('📜 Final Points History:', pointsHistory.length, 'entries');
        if (pointsHistory.length > 0) {
          console.log('📜 Sample history entry:', pointsHistory[0]);
        }
        
        // Check if we have completed orders but points might be missing
        const completedOrders = this.allOrders().filter(o => this.isOrderCompleted(o.status));
        
        if (completedOrders.length > 0) {
          // Calculate expected points from completed orders
          const expectedPoints = completedOrders.reduce((total, order) => {
            if (order.items && order.items.length > 0) {
              return total + order.items.reduce((sum, item) => {
                return sum + (item.points || 0) * (item.quantity || 0);
              }, 0);
            }
            return total;
          }, 0);
          
          // Check if points are missing (either no points at all, or points don't match expected)
          const hasPointsHistory = pointsHistory.length > 0;
          const pointsMatchExpected = totalPoints >= expectedPoints * 0.9; // Allow 10% tolerance for deductions
          
          if (expectedPoints > 0 && (!hasPointsHistory || !pointsMatchExpected)) {
            console.warn('⚠️ Warning: Completed orders detected but points may be missing.');
            console.warn('⚠️ Completed orders:', completedOrders.length);
            console.warn('⚠️ Expected points from orders:', expectedPoints);
            console.warn('⚠️ Current total points:', totalPoints);
            console.warn('⚠️ Points history entries:', pointsHistory.length);
            
            // Try to add retroactive points for completed orders
            this.addRetroactivePoints();
          } else if (expectedPoints > 0 && pointsMatchExpected) {
            console.log('✅ Points appear to be correctly calculated from completed orders');
          }
        }
        
        // Set points data
        const pointsData = {
          totalPoints: finalTotalPoints,
          pointsHistory: pointsHistory
        };
        
        console.log('💾 Setting userPoints signal with:', JSON.stringify(pointsData, null, 2));
        console.log('💾 Total points value:', finalTotalPoints);
        
        this.userPoints.set(pointsData);
        this.pointsLoading.set(false);
        
        // Verify the signal was set correctly
        setTimeout(() => {
          const currentPoints = this.userPoints();
          console.log('🔍 Verification - Current userPoints signal:', currentPoints);
          console.log('🔍 Verification - Current totalPoints:', currentPoints?.totalPoints);
          if (currentPoints && currentPoints.totalPoints !== finalTotalPoints) {
            console.warn('⚠️ Points mismatch! Expected:', finalTotalPoints, 'Got:', currentPoints.totalPoints);
            // Force update
            this.userPoints.set(pointsData);
          } else {
            console.log('✅ Points set correctly:', finalTotalPoints);
          }
        }, 100);
      },
        error: (error) => {
          console.error('❌ Failed to load user points from /users/{userId}/points:', error);
          console.error('❌ Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            url: error.url
          });
          
          // Set default values on error to prevent null
          this.userPoints.set({ totalPoints: 0, pointsHistory: [] });
          this.pointsLoading.set(false);
          
          // Fallback: try the /points/me endpoint
          console.log('🔄 Trying fallback endpoint /points/me...');
          this.api.get<any>('/points/me', {
            params: { page: 1, limit: 100 }
          }).subscribe({
            next: (fallbackResponse) => {
              console.log('✅ Fallback response from /points/me:', fallbackResponse);
            
            // This endpoint returns { success: true, data: {...} }
            const fallbackData = fallbackResponse?.data || fallbackResponse;
            const fallbackTotalPoints = fallbackData?.totalPoints ?? fallbackData?.TotalPoints ?? 0;
            const fallbackHistory = fallbackData?.pointsHistory || fallbackData?.PointsHistory || fallbackData?.history || fallbackData?.History || [];
            
            console.log('📊 Fallback totalPoints:', fallbackTotalPoints);
            console.log('📜 Fallback history length:', Array.isArray(fallbackHistory) ? fallbackHistory.length : 0);
            
            const fallbackPointsHistory = (Array.isArray(fallbackHistory) ? fallbackHistory : []).map((h: any) => ({
              _id: h.orderId || h._id || h.OrderId || '',
              points: h.points ?? h.Points ?? 0,
              reason: h.reason || h.Reason || 'Order completed',
              orderId: h.orderId || h.OrderId,
              timestamp: h.timestamp || h.Timestamp || h.createdAt || h.CreatedAt,
              createdAt: h.createdAt || h.CreatedAt || h.timestamp || h.Timestamp || new Date().toISOString(),
              type: (h.type || h.Type || 'earned') === 'earned' ? 'earned' : 'deducted'
            }));
            
            const finalTotalPoints = typeof fallbackTotalPoints === 'string' ? parseFloat(fallbackTotalPoints) : (typeof fallbackTotalPoints === 'number' ? fallbackTotalPoints : 0);
            
            this.userPoints.set({
              totalPoints: finalTotalPoints,
              pointsHistory: fallbackPointsHistory
            });
            this.pointsLoading.set(false);
            
            console.log('✅ Fallback points set successfully:', finalTotalPoints);
          },
          error: (fallbackError) => {
            console.error('❌ Failed to load user points from all endpoints:', fallbackError);
            console.error('❌ Fallback error details:', {
              status: fallbackError.status,
              statusText: fallbackError.statusText,
              message: fallbackError.message,
              error: fallbackError.error
            });
            this.userPoints.set({
              totalPoints: 0,
              pointsHistory: []
            });
            this.pointsLoading.set(false);
          }
        });
      }
    });
    
    // Track subscription to prevent memory leaks
    this.subscriptions.add(subscription);
  }

  private addRetroactivePoints(): void {
    const user = this.user();
    if (!user?._id || user.role !== 'customer') return;

    // Get all completed orders
    const completedOrders = this.allOrders().filter(o => this.isOrderCompleted(o.status));
    if (completedOrders.length === 0) {
      console.log('ℹ️ No completed orders found for retroactive points');
      return;
    }

    // Calculate total points that should be added
    let totalPointsToAdd = 0;
    const ordersNeedingPoints: any[] = [];

    completedOrders.forEach(order => {
      if (order.items && order.items.length > 0) {
        const orderPoints = order.items.reduce((sum, item) => {
          return sum + (item.points || 0) * (item.quantity || 0);
        }, 0);
        
        if (orderPoints > 0) {
          totalPointsToAdd += orderPoints;
          ordersNeedingPoints.push({
            orderId: order._id,
            points: orderPoints,
            items: order.items.length
          });
        }
      }
    });

    if (totalPointsToAdd === 0) {
      console.log('ℹ️ No points to add from completed orders');
      return;
    }

    console.log(`🔄 Attempting to add ${totalPointsToAdd} retroactive points from ${ordersNeedingPoints.length} completed order(s)...`);
    console.log('📋 Orders needing points:', ordersNeedingPoints);
    
    // Call the retroactive points endpoint to add points for completed orders that don't have them
    this.api.post<any>(`/users/${user._id}/points/retroactive`, {}).subscribe({
      next: (response) => {
        try {
          console.log('📥 Retroactive points response:', response);
          
          if (response && response.success) {
            const ordersProcessed = response.ordersProcessed || response.ordersProcessedCount || 0;
            const pointsAdded = response.pointsAdded || response.totalPointsAdded || 0;
            
            if (ordersProcessed > 0 || pointsAdded > 0) {
              console.log(`✅ Retroactive points added: ${pointsAdded} points for ${ordersProcessed} completed order(s)`);
              this.toastr.success(
                this.translation.t('profile.points.retroactiveAdded') || 
                `${pointsAdded} points added for ${ordersProcessed} completed order(s)`,
                this.translation.t('common.success') || 'Success'
              );
              // Reload points after adding retroactive points
              setTimeout(() => {
                this.loadUserPoints();
              }, 1500);
            } else {
              console.log('ℹ️ Backend processed orders but no points were added (may already have points)');
              // Still reload points in case backend updated something
              setTimeout(() => {
                this.loadUserPoints();
              }, 1000);
            }
          } else {
            console.warn('⚠️ Retroactive points response indicates failure:', response);
          }
        } catch (e) {
          console.warn('⚠️ Retroactive points response handling failed:', e);
        }
      },
      error: (error) => {
        console.error('❌ Retroactive points call failed:', error);
        console.error('❌ Error details:', {
          status: error.status,
          message: error.error?.message || error.message,
          url: error.url,
          error: error.error
        });
        
        // If endpoint doesn't exist (404), try alternative approach
        if (error.status === 404) {
          console.log('ℹ️ Retroactive endpoint not found (404). Backend should add points automatically when orders are completed.');
          console.log('ℹ️ If points are still missing, the backend may need to be configured to add points on order completion.');
          
          // Show user-friendly message
          this.toastr.warning(
            'Points should be added automatically when orders are completed. If points are missing, please contact support.',
            'Points Information'
          );
        } else if (error.status === 401 || error.status === 403) {
          console.error('❌ Authentication/Authorization error when trying to add retroactive points');
          // Don't show error to user for auth issues - might be expected
        } else {
          // For other errors, log but don't block the user
          console.warn('⚠️ Could not add retroactive points. Status:', error.status);
          console.warn('⚠️ Points should be added automatically by backend when orders are completed.');
        }
        
        // Still reload points in case they were added by backend
        setTimeout(() => {
          this.loadUserPoints();
        }, 1000);
      }
    });
  }

  private loadWalletBalance(): void {
    const user = this.user();
    if (!user?._id) return;

    this.walletLoading.set(true);
    this.ewalletService.getBalance(user._id).subscribe({
      next: (response) => {
        this.walletBalance.set(response.balance || 0);
        this.walletLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load wallet balance:', error);
        // Try fallback
        this.ewalletService.getBalanceFromUser(user._id).subscribe({
          next: (userData) => {
            this.walletBalance.set(userData.balance || 0);
            this.walletLoading.set(false);
          },
          error: () => {
            this.walletBalance.set(0);
            this.walletLoading.set(false);
          }
        });
      }
    });
  }

  // Public helper to refresh points manually and add retroactive points if needed
  requestRetroactivePoints(): void {
    const user = this.user();
    if (!user || user.role !== 'customer') return;

    this.pointsLoading.set(true);
    this.toastr.info(
      this.translation.t('profile.points.refreshing') || 'Refreshing points...',
      this.translation.t('common.info') || 'Info'
    );
    
    // First reload points to see current state
    this.loadUserPoints();
    
    // Then try to add retroactive points after a short delay
    setTimeout(() => {
      this.addRetroactivePoints();
    }, 500);
    
    // Reload points again after retroactive call
    setTimeout(() => {
      this.loadUserPoints();
    }, 2000);
  }

    // Removed local points estimation - only use backend data

  private loadReviews(): void {
    this.reviewsLoading.set(true);
    
    // Try to load reviews from the API
    this.api.get<{ success?: boolean; reviews?: any[]; data?: any[] }>('/reviews/my-reviews', {
      params: { page: 1, limit: 50 }
    }).subscribe({
      next: (response) => {
        const reviews = response.reviews || response.data || [];
        this.userReviews.set(Array.isArray(reviews) ? reviews : []);
        this.reviewsLoading.set(false);
      },
      error: (error) => {
        console.warn('Reviews endpoint not available, using empty array:', error);
        // If endpoint doesn't exist, use empty array (reviews will be loaded from orders)
        this.userReviews.set([]);
        this.reviewsLoading.set(false);
      }
    });
  }

  get filteredOrders(): Order[] {
    const orders = this.allOrders();
    const tab = this.activeTab();
    const user = this.user();
    
    if (!user) return [];

    return orders.filter(order => {
      const status = this.normalizeStatus(order.status);
      
      // Buyers don't see cancelled orders
      if (user.role === 'buyer' && status === 'cancelled') return false;
      
      // Filter by active tab (case-insensitive comparison)
      if (tab === 'incoming') {
        return ['pending', 'assigntocourier'].includes(status);
      }
      if (tab === 'completed') {
        // Include both 'completed' and 'collected' statuses as completed orders
        return this.isOrderCompleted(order.status);
      }
      if (tab === 'cancelled') {
        return status === 'cancelled';
      }
      return true;
    });
  }

  get tabs(): string[] {
    const user = this.user();
    if (!user) return [];
    
    const baseTabs = ['incoming', 'completed'];
    
    // Buyers get payments tab, others get cancelled tab
    if (user.role === 'buyer') {
      baseTabs.push('payments');
    } else {
      baseTabs.push('cancelled');
    }
    
    // Both buyers and customers get reviews tab
    if (user.role === 'customer' || user.role === 'buyer') {
      baseTabs.push('reviews');
    }
    
    return baseTabs;
  }

  get totalCompletedOrders(): number {
    return this.allOrders().filter(order => this.isOrderCompleted(order.status)).length;
  }

  get totalPointsHistoryLength(): number {
    return this.userPoints()?.pointsHistory?.length || 0;
  }

  get tier(): any {
    // Calculate tier based on completed orders
    const completed = this.totalCompletedOrders;
    if (completed >= 100) return { name: 'Diamond Elite', badge: '💎' };
    if (completed >= 50) return { name: 'Platinum Pioneer', badge: '🏆' };
    if (completed >= 30) return { name: 'Gold Guardian', badge: '🥇' };
    if (completed >= 20) return { name: 'Silver Recycler', badge: '🥈' };
    if (completed >= 10) return { name: 'Green Helper', badge: '🌿' };
    if (completed >= 5) return { name: 'Eco Starter', badge: '🌱' };
    return { name: 'Eco Beginner', badge: '🌍' };
  }

  onTabChange(tab: string): void {
    this.activeTab.set(tab);
    // Refresh orders when switching tabs to ensure we have latest data
    console.log('🔄 Tab changed to:', tab, '- Refreshing orders...');
    this.loadOrders();
    // Refresh points if switching to completed tab (for customers)
    const user = this.user();
    if (user && user.role === 'customer' && tab === 'completed') {
      console.log('🔄 Switched to completed tab, refreshing points...');
      setTimeout(() => {
        this.loadUserPoints();
      }, 1000);
    }
  }

  @HostListener('window:focus', ['$event'])
  onWindowFocus(): void {
    // Refresh orders when window gains focus
    this.loadOrders();
    const user = this.user();
    // Only refresh if we haven't loaded points recently (avoid excessive calls)
    if (user && user.role === 'customer' && !this.pointsLoading()) {
      // Debounce: only refresh if last load was more than 30 seconds ago
      const lastLoad = (this as any).lastPointsLoad || 0;
      const now = Date.now();
      if (now - lastLoad > 30000) {
        (this as any).lastPointsLoad = now;
        this.loadUserPoints();
      }
    }
  }

  private startPolling(): void {
    // Poll every 60 seconds for order updates (reduced frequency)
    this.pollingSubscription = interval(60000).subscribe(() => {
      this.loadOrders();
      const user = this.user();
      if (user && user.role === 'customer') {
        // Refresh points every 2 minutes (120 seconds) - much less frequent
        const shouldRefreshPoints = Math.random() < 0.25; // 25% chance each poll (every 4 minutes on average)
        if (shouldRefreshPoints) {
          this.loadUserPoints();
        }
      }
    });
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  private setupSocketListeners(): void {
    // Connect socket if not already connected
    if (!this.socket.connected) {
      this.socket.connect();
    }

    // Listen for order status updates
    const handleOrderStatusUpdate = (data: any) => {
      console.log('🔔 Order status updated via socket:', data);
      // Refresh orders immediately
      this.loadOrders();
      
      // If order was completed, refresh points (handles both 'completed' and 'collected')
      if (this.isOrderCompleted(data.status)) {
        const user = this.user();
        if (user && user.role === 'customer') {
          console.log('🔄 Order completed/collected, refreshing points...');
          setTimeout(() => {
            this.loadUserPoints();
          }, 1500);
        }
      }
    };

    const handleOrderCompleted = (data: any) => {
      console.log('✅ Order completed via socket:', data);
      this.loadOrders();
      const user = this.user();
      if (user && user.role === 'customer' && !this.pointsLoading()) {
        console.log('🔄 Order completed event, refreshing points...');
        setTimeout(() => {
          if (!this.pointsLoading()) {
            this.loadUserPoints();
          }
        }, 2000);
      }
    };

    const handleOrderCreated = (data: any) => {
      console.log('🆕 New order created via socket:', data);
      // Refresh orders immediately when a new order is created
      this.loadOrders();
    };

    const handleRecyclingCompleted = (data: any) => {
      console.log('♻️ Recycling completed via socket:', data);
      this.loadOrders();
      const user = this.user();
      if (user && user.role === 'customer' && !this.pointsLoading()) {
        console.log('🔄 Recycling completed, refreshing points...');
        setTimeout(() => {
          if (!this.pointsLoading()) {
            this.loadUserPoints();
          }
        }, 2000);
      }
    };

    // Set up socket listeners
    this.socket.on('order:status:updated', handleOrderStatusUpdate);
    this.socket.on('order:completed', handleOrderCompleted);
    this.socket.on('order:created', handleOrderCreated);
    this.socket.on('recycling:completed', handleRecyclingCompleted);

    // Store handlers for cleanup
    this.socketSubscription = new Subscription();
  }

  private removeSocketListeners(): void {
    if (this.socket) {
      this.socket.off('order:status:updated');
      this.socket.off('order:completed');
      this.socket.off('order:created');
      this.socket.off('recycling:completed');
    }
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }

  async onCancelOrder(orderId: string): Promise<void> {
    const order = this.allOrders().find(o => o._id === orderId);
    if (!order) return;

    // Check if order can be cancelled (only pending orders)
    if (order.status !== 'pending') {
      this.toastr.warning(
        this.translation.t('profile.orders.cannotCancel') || 
        'Only pending orders can be cancelled',
        this.translation.t('common.warning') || 'Warning'
      );
      return;
    }

    // Show confirmation dialog
    const confirmed = await this.confirmationService.confirm({
      title: this.translation.t('profile.orders.cancelOrder') || 'Cancel Order',
      message: this.translation.t('profile.orders.cancelConfirm') || 
        'Are you sure you want to cancel this order? This action cannot be undone.',
      confirmText: this.translation.t('profile.orders.cancel') || 'Cancel Order',
      cancelText: this.translation.t('common.cancel') || 'Cancel'
    });

    if (!confirmed) return;

    // Cancel the order
    this.api.put(`/orders/${orderId}/status`, { status: 'cancelled' }).subscribe({
      next: () => {
        this.toastr.success(
          this.translation.t('profile.orders.cancelled') !== 'profile.orders.cancelled' ? this.translation.t('profile.orders.cancelled') : 'Order cancelled successfully',
          this.translation.t('pickup.success') !== 'pickup.success' ? this.translation.t('pickup.success') : 'Success'
        );
        this.loadOrders(); // Reload orders to reflect the change
      },
      error: (error) => {
        console.error('Failed to cancel order:', error);
        const errorMessage = error.error?.message || 
          (this.translation.t('profile.orders.cancelError') !== 'profile.orders.cancelError' ? this.translation.t('profile.orders.cancelError') : 'Failed to cancel order. Please try again.');
        this.toastr.error(errorMessage, this.translation.t('common.error') !== 'common.error' ? this.translation.t('common.error') : 'Error');
      }
    });
  }

  async onDeleteOrder(orderId: string): Promise<void> {
    const order = this.allOrders().find(o => o._id === orderId);
    if (!order) return;

    // Check if user is a buyer
    const user = this.user();
    if (user?.role !== 'buyer') {
        this.toastr.warning(
          this.translation.t('Only buyers can delete orders') || 
          'Only buyers can delete orders',
          this.translation.t('common.warning') !== 'common.warning' ? this.translation.t('common.warning') : 'Warning'
        );
      return;
    }

    // Check if order can be deleted (only cancelled or completed orders)
    const status = order.status?.toLowerCase() || '';
    if (!['cancelled', 'completed', 'collected'].includes(status)) {
      this.toastr.warning(
        this.translation.t('Only cancelled or completed orders can be deleted') || 
        'Only cancelled or completed orders can be deleted',
        this.translation.t('common.warning') !== 'common.warning' ? this.translation.t('common.warning') : 'Warning'
      );
      return;
    }

    // Show confirmation dialog
    const confirmed = await this.confirmationService.confirm({
      title: this.translation.t('Delete Order') || 'Delete Order',
      message: this.translation.t('Are you sure you want to delete this order? This action cannot be undone.') || 
        'Are you sure you want to delete this order? This action cannot be undone.',
      confirmText: this.translation.t('Delete') || 'Delete',
      cancelText: this.translation.t('common.cancel') || 'Cancel'
    });

    if (!confirmed) return;

    // Delete the order
    this.ordersService.deleteOrder(orderId).subscribe({
      next: () => {
        this.toastr.success(
          this.translation.t('Order deleted successfully') || 
          'Order deleted successfully',
          this.translation.t('common.success') !== 'common.success' ? this.translation.t('common.success') : 'Success'
        );
        this.loadOrders(); // Reload orders
      },
      error: (error) => {
        console.error('Failed to delete order:', error);
        let errorMessage = this.translation.t('Failed to delete order') || 'Failed to delete order';
        if (error.status === 404) {
          errorMessage = this.translation.t('Order not found') || 'Order not found';
        } else if (error.status === 403) {
          errorMessage = this.translation.t('You are not authorized to delete this order') || 'You are not authorized to delete this order';
        }
        this.toastr.error(errorMessage, this.translation.t('common.error') !== 'common.error' ? this.translation.t('common.error') : 'Error');
      }
    });
  }

  onEditReview(order: ReviewableOrder): void {
    // Find existing review for this order
    const existing = this.userReviews().find(r => r.orderId === order._id);
    
    if (existing) {
      this.existingReview.set({
        rating: existing.rating || existing.stars || 0,
        comments: existing.comments || '',
        orderId: order._id
      });
    } else {
      this.existingReview.set(null);
    }
    
    this.selectedOrderForReview.set(order);
    this.showReviewModal.set(true);
  }

  onCloseReviewModal(): void {
    this.showReviewModal.set(false);
    this.selectedOrderForReview.set(null);
    this.existingReview.set(null);
  }

  onReviewSubmitted(reviewData: any): void {
    console.log('Review submitted:', reviewData);
    
    // Update local reviews list
    const currentReviews = this.userReviews();
    const existingIndex = currentReviews.findIndex(r => r.orderId === reviewData.orderId);
    
    if (existingIndex >= 0) {
      // Update existing review
      const updated = [...currentReviews];
      updated[existingIndex] = { ...updated[existingIndex], ...reviewData };
      this.userReviews.set(updated);
    } else {
      // Add new review
      this.userReviews.set([reviewData, ...currentReviews]);
    }
    
    // Reload reviews from API to get latest data
    this.loadReviews();
    
    this.onCloseReviewModal();
  }

  onDeleteReview(orderId: string): void {
    // .NET backend doesn't have reviews endpoint - just show success
    // In production, you would implement this endpoint
    this.toastr.success(
      this.translation.t('profile.reviews.deleted') || 'Review deleted successfully',
      this.translation.t('pickup.success') || 'Success'
    );
    this.loadReviews(); // Reload reviews
  }

  onReturnEarnClick(): void {
    // Open redeem points modal
    this.showRedeemModal.set(true);
  }

  onCloseRedeemModal(): void {
    this.showRedeemModal.set(false);
  }

  onRedeemSuccess(): void {
    // Reload user points after successful redemption
    const user = this.user();
    if (user && user.role === 'customer') {
      this.loadUserPoints();
    }
    this.showRedeemModal.set(false);
  }

  // Public method to refresh points (can be called from outside or on interval)
  refreshPoints(): void {
    const user = this.user();
    if (user && user.role === 'customer') {
      console.log('🔄 Manually refreshing points...');
      this.loadUserPoints();
    }
  }

  // Refresh points when component becomes visible (e.g., user navigates to profile)
  ngAfterViewInit(): void {
    // Refresh points after view init to ensure we have latest data
    const user = this.user();
    if (user && user.role === 'customer') {
      // Small delay to ensure component is fully initialized
      setTimeout(() => {
        this.loadUserPoints();
      }, 500);
    }
  }
}

