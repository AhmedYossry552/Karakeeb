import { Component, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faBell, 
  faCheckCircle, 
  faExclamationCircle, 
  faInfoCircle, 
  faTimesCircle,
  faCheckDouble,
  faSpinner,
  faBellSlash,
  faBox
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink, FontAwesomeModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss'
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  isOpen = signal<boolean>(false);
  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);
  loadingMore = signal<boolean>(false);
  hasMore = signal<boolean>(false);
  isMarkingAllRead = signal<boolean>(false);

  // Font Awesome Icons
  faBell = faBell;
  faCheckCircle = faCheckCircle;
  faExclamationCircle = faExclamationCircle;
  faInfoCircle = faInfoCircle;
  faTimesCircle = faTimesCircle;
  faCheckDouble = faCheckDouble;
  faSpinner = faSpinner;
  faBellSlash = faBellSlash;
  faBox = faBox;

  private subscriptions = new Subscription();

  constructor(
    public notificationService: NotificationService,
    public translation: TranslationService
  ) {}

  ngOnInit(): void {
    console.log('🔔 NotificationBellComponent initialized');
    
    // Subscribe to notifications
    this.subscriptions.add(
      this.notificationService.notifications$.subscribe(notifications => {
        console.log('📬 Notifications updated:', notifications.length);
        this.notifications.set(notifications);
      })
    );

    this.subscriptions.add(
      this.notificationService.unreadCount$.subscribe(count => {
        console.log('🔢 Unread count updated:', count);
        this.unreadCount.set(count);
      })
    );

    this.loadingMore.set(this.notificationService.loadingMoreNotifications);
    this.hasMore.set(this.notificationService.hasMoreNotifications);

    // Initial refresh to load notifications
    this.notificationService.refreshNotifications();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleDropdown(): void {
    const wasOpen = this.isOpen();
    this.isOpen.update(v => !v);
    
    if (this.isOpen() && !wasOpen) {
      // Refresh notifications when opening dropdown (like Next.js does)
      console.log('🔔 Opening notification dropdown, refreshing...');
      this.notificationService.refreshNotifications();
      // Update loading and hasMore states
      setTimeout(() => {
        this.loadingMore.set(this.notificationService.loadingMoreNotifications);
        this.hasMore.set(this.notificationService.hasMoreNotifications);
      }, 100);
    }
  }

  async onNotificationClick(notification: Notification): Promise<void> {
    if (!notification.isRead) {
      await this.notificationService.markAsRead(notification._id);
    }
    this.isOpen.set(false);
  }

  async onMarkAllAsRead(): Promise<void> {
    if (this.unreadCount() === 0 || this.isMarkingAllRead()) return;

    this.isMarkingAllRead.set(true);
    try {
      await this.notificationService.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      this.isMarkingAllRead.set(false);
    }
  }

  async onLoadMore(): Promise<void> {
    if (this.loadingMore() || !this.hasMore()) return;

    this.loadingMore.set(true);
    try {
      await this.notificationService.loadMoreNotifications();
      this.loadingMore.set(this.notificationService.loadingMoreNotifications);
      this.hasMore.set(this.notificationService.hasMoreNotifications);
    } finally {
      this.loadingMore.set(false);
    }
  }

  getNotificationIcon(type: string): any {
    switch (type) {
      case 'order':
      case 'order_assigned':
      case 'order_completed':
      case 'order_cancelled':
        return faBox;
      case 'message':
        return faInfoCircle;
      case 'warning':
        return faExclamationCircle;
      case 'success':
        return faCheckCircle;
      default:
        return faBell;
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'order':
      case 'order_assigned':
        return 'blue';
      case 'order_completed':
      case 'success':
        return 'green';
      case 'order_cancelled':
      case 'warning':
        return 'yellow';
      case 'message':
        return 'purple';
      default:
        return 'gray';
    }
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const locale = this.translation.getLocale();

    if (diffMins < 1) {
      return locale === 'ar' ? 'الآن' : 'Just now';
    } else if (diffMins < 60) {
      return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US');
    }
  }

  getLocalizedText(text: string | any): string {
    return this.notificationService.getLocalizedText(text);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isOpen() && !target.closest('.notification-container')) {
      this.isOpen.set(false);
    }
  }
}

