import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';
import { ApiService } from '../../../../core/services/api';

export interface UserDetails {
  _id?: string;
  name?: string;
  userName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  imageUrl?: string;
  imgUrl?: string;
  address?: any;
}

export interface PointsEntry {
  _id?: string;
  points: number;
  reason: string;
  orderId?: string;
  createdAt?: string;
  timestamp?: string;
  type?: 'earned' | 'redeemed';
}

export interface UserPoints {
  totalPoints: number;
  pointsHistory?: PointsEntry[];
}

@Component({
  selector: 'app-user-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-details-modal.html',
  styleUrls: ['./user-details-modal.scss']
})
export class UserDetailsModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() user: UserDetails | null = null;
  @Output() onClose = new EventEmitter<void>();

  userPoints = signal<UserPoints | null>(null);
  pointsLoading = signal(false);
  showPointsHistory = signal(false);

  constructor(
    public translation: TranslationService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    if (this.isOpen && this.user) {
      this.loadUserPoints();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.user) {
      this.loadUserPoints();
    }
    if (changes['user'] && this.user && this.isOpen) {
      this.loadUserPoints();
    }
  }

  loadUserPoints(): void {
    if (!this.user?._id || this.user.role !== 'customer') {
      this.userPoints.set(null);
      return;
    }

    this.pointsLoading.set(true);
    this.api.get<any>(`/users/${this.user._id}/points`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.userPoints.set({
            totalPoints: response.data.totalPoints || 0,
            pointsHistory: response.data.pointsHistory || []
          });
        } else {
          this.userPoints.set({ totalPoints: 0, pointsHistory: [] });
        }
        this.pointsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load user points:', error);
        this.userPoints.set({ totalPoints: 0, pointsHistory: [] });
        this.pointsLoading.set(false);
      }
    });
  }

  togglePointsHistory(): void {
    this.showPointsHistory.update(v => !v);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }

  handleClose(): void {
    this.onClose.emit();
  }

  getUserImage(): string | undefined {
    if (!this.user) return undefined;
    return this.user.imgUrl || this.user.imageUrl || undefined;
  }

  getUserInitials(): string {
    if (!this.user) return 'U';
    const name = this.user.name || this.user.userName || 'User';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  getUserName(): string {
    if (!this.user) return 'Unknown';
    return this.user.name || this.user.userName || 'Unknown';
  }

  getUserEmail(): string {
    if (!this.user) return 'Not provided';
    return this.user.email || 'Not provided';
  }

  getUserPhone(): string {
    if (!this.user || !this.user.phoneNumber) return 'Not provided';
    return this.user.phoneNumber;
  }

  getUserRole(): string {
    if (!this.user || !this.user.role) return 'Unknown';
    return this.user.role.charAt(0).toUpperCase() + this.user.role.slice(1);
  }

  getAddressString(): string {
    if (!this.user || !this.user.address) return 'Not provided';
    const addr = this.user.address;
    const parts: string[] = [];
    
    // Build address string with all available fields
    if (addr.street) parts.push(addr.street);
    if (addr.building) parts.push(`Building ${addr.building}`);
    if (addr.floor) parts.push(`Floor ${addr.floor}`);
    if (addr.apartment) parts.push(`Apartment ${addr.apartment}`);
    if (addr.area) parts.push(addr.area);
    if (addr.city) parts.push(addr.city);
    if (addr.governorate) parts.push(addr.governorate);
    if (addr.landmark) parts.push(`Near ${addr.landmark}`);
    if (addr.postalCode) parts.push(`Postal: ${addr.postalCode}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  }

  hasAddress(): boolean {
    if (!this.user || !this.user.address) return false;
    const addr = this.user.address;
    // Check if address has any meaningful data
    return !!(addr.street || addr.city || addr.area || addr.building || 
              addr.governorate || addr.landmark || addr.postalCode);
  }

  getAddressDetails(): any {
    if (!this.user || !this.user.address) return null;
    return this.user.address;
  }
}

