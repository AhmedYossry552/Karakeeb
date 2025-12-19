import { Component, Input, computed, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-profile-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-header.html',
  styleUrls: ['./profile-header.scss']
})
export class ProfileHeaderComponent {
  @Input() user!: User;
  @Input() tier!: any;
  @Output() returnEarnClick = new EventEmitter<void>();
  
  imageError = signal(false);
  imageLoaded = signal(false);

  constructor(public translation: TranslationService) {}

  onReturnEarnClick(): void {
    this.returnEarnClick.emit();
  }

  get userName(): string {
    return this.user?.name || 'John Doe';
  }

  get userEmail(): string {
    return this.user?.email || '';
  }

  get userImage(): string | undefined {
    return this.user?.imgUrl;
  }

  get userInitials(): string {
    const name = this.userName;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  get formattedPhoneNumber(): string {
    const phone = this.user?.phoneNumber;
    if (!phone) return '';
    return this.translation.convertNumber(phone.padStart(11, '0'));
  }

  get showTierBadge(): boolean {
    return this.user?.role === 'customer' && !!this.tier;
  }

  get isNotBuyer(): boolean {
    return this.user?.role !== 'buyer';
  }

  get locationDate(): string {
    const now = new Date();
    const monthName = now.toLocaleString(this.translation.getLocale() || 'en-US', { month: 'long' });
    const year = this.translation.convertNumber(now.getFullYear());
    return `Cairo, ${monthName} ${year}`;
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }
}

