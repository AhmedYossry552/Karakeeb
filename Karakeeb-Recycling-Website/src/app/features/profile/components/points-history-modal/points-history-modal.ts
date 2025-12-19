import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';
import { PointsService, PointsHistoryItem } from '../../../../core/services/points.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PointsEntryItemComponent, PointsEntry } from '../points-entry-item/points-entry-item';
import { faCalendar, faX } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-points-history-modal',
  standalone: true,
  imports: [CommonModule, PointsEntryItemComponent, FaIconComponent],
  templateUrl: './points-history-modal.html',
  styleUrls: ['./points-history-modal.scss']
})
export class PointsHistoryModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  pointsHistory = signal<PointsEntry[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  itemsPerPage = 3;

  faCalendar = faCalendar;
  faX = faX;

  constructor(
    public translation: TranslationService,
    private pointsService: PointsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.isOpen) {
      this.loadPointsHistory(1);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reload when modal opens
    if (changes['isOpen'] && this.isOpen && !changes['isOpen'].previousValue) {
      this.loadPointsHistory(1);
    }
  }

  loadPointsHistory(page: number = 1): void {
    // Get current user from AuthService
    const user = this.authService.getUser();
    if (!user?._id || !this.isOpen) return;

    this.loading.set(true);
    console.log('📜 Loading points history for user:', user._id, 'page:', page);
    
    this.pointsService.getUserPoints(user._id, page, this.itemsPerPage).subscribe({
      next: (response) => {
        console.log('📜 Points history response:', response);
        console.log('📜 Points history array:', response.pointsHistory);
        
        // Map PointsHistoryItem to PointsEntry format
        const entries: PointsEntry[] = (response.pointsHistory || []).map((item: any) => ({
          _id: item._id || item.orderId || '',
          reason: item.reason || 'Points transaction',
          points: item.points || 0,
          timestamp: item.createdAt || item.timestamp || new Date().toISOString(),
          createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
          orderId: item.orderId,
          type: item.type || 'earned'
        }));
        
        console.log('📜 Mapped entries:', entries);
        this.pointsHistory.set(entries);
        this.totalPages.set(response.pagination?.totalPages || 1);
        this.currentPage.set(page);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Failed to load points history:', error);
        console.error('❌ Error details:', error.error || error.message);
        this.pointsHistory.set([]);
        this.loading.set(false);
      }
    });
  }

  handlePageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPointsHistory(page);
  }

  closeModal(): void {
    this.close.emit();
    this.currentPage.set(1);
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  trackByEntryId(index: number, entry: any): string {
    return entry._id || index.toString();
  }
}

