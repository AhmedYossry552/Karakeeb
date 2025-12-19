import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../../core/services/notification.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss'
})
export class NotificationsPageComponent implements OnInit {
  notifications: Notification[] = [];
  unreadCount = 0;

  constructor(
    public notificationService: NotificationService,
    public translation: TranslationService
  ) {}

  ngOnInit(): void {
    this.notificationService.notifications$.subscribe(notifs => {
      this.notifications = notifs;
    });
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });
  }

  async onMarkAllAsRead(): Promise<void> {
    await this.notificationService.markAllAsRead();
  }

  async onLoadMore(): Promise<void> {
    await this.notificationService.loadMoreNotifications();
  }
}


