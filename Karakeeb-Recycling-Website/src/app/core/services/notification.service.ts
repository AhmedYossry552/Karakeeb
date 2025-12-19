import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api';
import { AuthService } from './auth.service';
import { TranslationService } from './translation.service';
import { Socket } from './socket';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

export interface LocalizedText {
  en: string;
  ar: string;
  _id?: string;
}

export interface Notification {
  _id: string;
  title: string | LocalizedText;
  body: string | LocalizedText;
  type: string;
  orderId?: any;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  unreadCount?: number;
  hasMore?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private currentPage = signal<number>(1);
  private hasMore = signal<boolean>(true);
  private loadingMore = signal<boolean>(false);
  private isInitialized = signal<boolean>(false);

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private translation: TranslationService,
    private socket: Socket,
    private toastr: ToastrService
  ) {
    // Subscribe to user changes to initialize notifications
    this.authService.user$.subscribe(user => {
      if (user && !this.isInitialized()) {
        // Initialize notifications first
        this.initializeNotifications().then(() => {
          // Setup socket listeners after notifications are loaded
          setTimeout(() => {
            this.setupSocketListeners();
          }, 1000);
        });
      } else if (!user) {
        this.socket.disconnect();
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
        this.isInitialized.set(false);
      }
    });
  }

  get notifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  get unreadCount(): number {
    return this.unreadCountSubject.value;
  }

  get shouldDisableNotifications(): boolean {
    const user = this.authService.getUser();
    return user?.role === 'admin' || user?.role === 'delivery';
  }

  private async initializeNotifications(): Promise<void> {
    if (this.shouldDisableNotifications) return;

    try {
      const response = await this.api.get<any>('/notifications', {
        params: { page: 1, limit: 20 }
      }).toPromise();

      // .NET backend returns: { success: true, data: { notifications: [], pagination: {}, unreadCount: number } }
      let notifications: Notification[] = [];
      let unreadCount = 0;
      let hasMore = false;

      if (response?.success && response.data) {
        notifications = response.data.notifications || [];
        unreadCount = response.data.unreadCount || 0;
        hasMore = response.data.pagination?.hasMore || false;
      } else if (Array.isArray(response)) {
        // Fallback for direct array response
        notifications = response;
      }

      this.notificationsSubject.next(notifications);
      this.unreadCountSubject.next(unreadCount);
      this.hasMore.set(hasMore);
      this.currentPage.set(1);
      this.isInitialized.set(true);
    } catch (error: any) {
      // Silently handle 401 (unauthorized) - user is not logged in
      if (error?.status === 401) {
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
        this.hasMore.set(false);
        this.isInitialized.set(true);
        return;
      }
      
      // Handle 500 errors (backend issues - likely empty table or DB issue)
      if (error?.status === 500) {
        // Silently handle 500 errors - likely empty notifications table or DB issue
        // Only log in development mode
        if (!environment.production) {
          console.warn('⚠️ Notifications endpoint returned 500. This is normal if the notifications table is empty or not created yet.');
        }
        
        // Initialize with empty state
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
        this.hasMore.set(false);
        this.isInitialized.set(true);
        return;
      }
      
      console.error('Failed to initialize notifications:', error);
      // On other errors, initialize with empty state
      this.notificationsSubject.next([]);
      this.unreadCountSubject.next(0);
      this.hasMore.set(false);
      this.isInitialized.set(true);
    }
  }

  async loadMoreNotifications(): Promise<void> {
    if (!this.hasMore() || this.loadingMore() || this.shouldDisableNotifications) return;

    this.loadingMore.set(true);
    const nextPage = this.currentPage() + 1;

    try {
      const response = await this.api.get<any>('/notifications', {
        params: { page: nextPage, limit: 20 }
      }).toPromise();

      // .NET backend returns: { success: true, data: { notifications: [], pagination: {}, unreadCount: number } }
      let newNotifications: Notification[] = [];
      let hasMore = false;

      if (response?.success && response.data) {
        newNotifications = response.data.notifications || [];
        hasMore = response.data.pagination?.hasMore || false;
      } else if (Array.isArray(response)) {
        // Fallback for direct array response
        newNotifications = response;
      }

      if (newNotifications.length > 0) {
        const currentNotifications = this.notificationsSubject.value;
        const existingIds = new Set(currentNotifications.map(n => n._id));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n._id));
        this.notificationsSubject.next([...currentNotifications, ...uniqueNew]);
        this.currentPage.set(nextPage);
        this.hasMore.set(hasMore);
      } else {
        this.hasMore.set(false);
      }
    } catch (error: any) {
      // Silently handle 401 (unauthorized)
      if (error?.status !== 401) {
        console.error('Failed to load more notifications:', error);
      }
      this.hasMore.set(false);
    } finally {
      this.loadingMore.set(false);
    }
  }

  async markAsRead(id: string): Promise<void> {
    if (this.shouldDisableNotifications) return;

    // Optimistic update
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notif =>
      notif._id === id ? { ...notif, isRead: true } : notif
    );
    this.notificationsSubject.next(updatedNotifications);

    const currentUnread = this.unreadCountSubject.value;
    this.unreadCountSubject.next(Math.max(0, currentUnread - 1));

    try {
      // .NET backend: PATCH /api/notifications/{id}/mark-read
      await this.api.patch(`/notifications/${id}/mark-read`, {}).toPromise();
    } catch (error: any) {
      // Silently handle 401 (unauthorized)
      if (error?.status !== 401) {
        console.error('Failed to mark notification as read:', error);
      }
      // Revert on error (except 401)
      if (error?.status !== 401) {
        this.notificationsSubject.next(currentNotifications);
        this.unreadCountSubject.next(currentUnread);
      }
    }
  }

  async markAllAsRead(): Promise<void> {
    if (this.shouldDisableNotifications) return;

    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notif => ({ ...notif, isRead: true }));
    this.notificationsSubject.next(updatedNotifications);
    this.unreadCountSubject.next(0);

    try {
      // .NET backend: PATCH /api/notifications/mark-read with empty NotificationIds list
      // This marks all notifications as read
      await this.api.patch('/notifications/mark-read', { notificationIds: [] }).toPromise();
    } catch (error: any) {
      // Silently handle 401 (unauthorized)
      if (error?.status !== 401) {
        console.error('Failed to mark all as read:', error);
      }
      // Revert on error (except 401)
      if (error?.status !== 401) {
        this.notificationsSubject.next(currentNotifications);
        // Restore unread count
        const unreadCount = currentNotifications.filter(n => !n.isRead).length;
        this.unreadCountSubject.next(unreadCount);
      }
    }
  }

  async refreshNotifications(): Promise<void> {
    if (this.shouldDisableNotifications) return;
    
    this.currentPage.set(1);
    this.hasMore.set(true);
    this.isInitialized.set(false);
    
    try {
      const response = await this.api.get<any>('/notifications', {
        params: { page: 1, limit: 20 }
      }).toPromise();

      // .NET backend returns: { success: true, data: { notifications: [], pagination: {}, unreadCount: number } }
      let notifications: Notification[] = [];
      let unreadCount = 0;
      let hasMore = false;

      if (response?.success && response.data) {
        notifications = response.data.notifications || [];
        unreadCount = response.data.unreadCount || 0;
        hasMore = response.data.pagination?.hasMore || false;
      } else if (Array.isArray(response)) {
        // Fallback for direct array response
        notifications = response;
        // Calculate unread count from notifications
        unreadCount = notifications.filter(n => !n.isRead).length;
      } else if (response?.data && Array.isArray(response.data)) {
        // Another fallback format
        notifications = response.data;
        unreadCount = notifications.filter(n => !n.isRead).length;
      }

      this.notificationsSubject.next(notifications);
      this.unreadCountSubject.next(unreadCount);
      this.hasMore.set(hasMore);
      this.currentPage.set(1);
      this.isInitialized.set(true);
    } catch (error: any) {
      // Silently handle 401 (unauthorized) - user is not logged in
      if (error?.status === 401) {
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
        return;
      }
      
      // Handle 500 errors (backend issues - likely empty table or DB issue)
      if (error?.status === 500) {
        // Silently handle 500 errors - likely empty notifications table or DB issue
        // Only log in development mode
        if (!environment.production) {
          console.warn('⚠️ Notifications endpoint returned 500. This is normal if the notifications table is empty or not created yet.');
        }
        
        // Keep existing notifications if available, don't clear them
        if (this.notificationsSubject.value.length === 0) {
          this.notificationsSubject.next([]);
          this.unreadCountSubject.next(0);
        }
        this.hasMore.set(false);
        this.isInitialized.set(true);
        return;
      }
      
      // Only log in development mode
      if (!environment.production) {
        console.error('❌ Failed to refresh notifications:', error);
      }
      // On other errors, keep existing state
      this.isInitialized.set(true);
    }
  }

  private setupSocketListeners(): void {
    if (this.shouldDisableNotifications) return;

    // Try to connect socket, but don't fail if it doesn't work
    try {
      this.socket.connect();
    } catch (error) {
      console.warn('Socket connection not available. Notifications will work via polling.');
      return;
    }

    // Wait a bit for socket to connect before setting up listeners
    setTimeout(() => {
      // Only setup listeners if socket is connected
      if (!this.socket.connected) {
        // Only log in development mode
        if (!environment.production) {
          console.warn('Socket not connected. Notifications will work via polling.');
        }
        return;
      }

      // Listen for new notifications
      this.socket.on('newNotification', (notification: Notification) => {
        console.log('🔔 New notification received via socket:', notification);
        this.handleNewNotification(notification);
      });

      // Listen for notification events (alternative event name)
      this.socket.on('notification', (notification: Notification) => {
        console.log('🔔 Notification event received:', notification);
        this.handleNewNotification(notification);
      });

      // Listen for order-related notifications
      this.socket.on('order:created', (data: any) => {
        console.log('📦 Order created event:', data);
        // Refresh notifications to get the new one
        this.refreshNotifications();
      });

      this.socket.on('order:cancelled', (data: any) => {
        console.log('❌ Order cancelled event:', data);
        // Refresh notifications to get the new one
        this.refreshNotifications();
      });

      this.socket.on('order:status:updated', (data: any) => {
        console.log('🔄 Order status updated event:', data);
        // Refresh notifications to get the new one
        this.refreshNotifications();
      });

      // Listen for unread count updates
      this.socket.on('unreadCount', (count: number) => {
        console.log('📊 Unread count update:', count);
        this.unreadCountSubject.next(count);
      });

      // Listen for unread count updates (alternative event name)
      this.socket.on('notification:count', (data: any) => {
        const count = typeof data === 'number' ? data : (data?.count || data?.unreadCount || 0);
        console.log('📊 Notification count update:', count);
        this.unreadCountSubject.next(count);
      });
    }, 1000);
  }

  private handleNewNotification(notification: Notification): void {
    const currentNotifications = this.notificationsSubject.value;
    const exists = currentNotifications.some(n => n._id === notification._id);
    
    if (!exists) {
      const updated = [notification, ...currentNotifications];
      this.notificationsSubject.next(updated.slice(0, 50)); // Limit to 50
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
      
      // Show toast notification
      const title = this.getLocalizedText(notification.title);
      const body = this.getLocalizedText(notification.body);
      
      // Use different toast types based on notification type
      if (notification.type === 'order_completed' || notification.type === 'success') {
        this.toastr.success(body, title, {
          timeOut: 5000,
          positionClass: 'toast-top-right'
        });
      } else if (notification.type === 'order_cancelled' || notification.type === 'warning') {
        this.toastr.warning(body, title, {
          timeOut: 5000,
          positionClass: 'toast-top-right'
        });
      } else {
        this.toastr.info(body, title, {
          timeOut: 5000,
          positionClass: 'toast-top-right'
        });
      }
    }
  }

  getLocalizedText(text: string | LocalizedText): string {
    if (typeof text === 'string') return text;
    const locale = this.translation.getLocale();
    return text[locale as keyof LocalizedText] || text.en || '';
  }

  get loadingMoreNotifications(): boolean {
    return this.loadingMore();
  }

  get hasMoreNotifications(): boolean {
    return this.hasMore();
  }
}

