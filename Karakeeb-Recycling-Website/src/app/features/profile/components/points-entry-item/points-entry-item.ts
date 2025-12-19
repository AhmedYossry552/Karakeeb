import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';
import { categorizeEntry, formatDate, TAG_COLORS, PointsTag } from '../../../../core/utils/points.util';
import { faGift, faPlus, faAward, faMinus, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

export interface PointsEntry {
  _id: string;
  reason: string;
  points: number;
  timestamp?: string;
  orderId?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-points-entry-item',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './points-entry-item.html',
  styleUrls: ['./points-entry-item.scss']
})
export class PointsEntryItemComponent {
  @Input() entry!: PointsEntry;

  faGift = faGift;
  faPlus = faPlus;
  faAward = faAward;
  faMinus = faMinus;
  faCalendar = faCalendar;

  constructor(public translation: TranslationService) {}

  get tag(): PointsTag {
    return categorizeEntry(this.entry.reason, this.entry.points);
  }

  get formattedDate(): string {
    const timestamp = this.entry.timestamp || this.entry.createdAt;
    if (!timestamp) return '';
    const locale = this.translation.getLocale() === 'ar' ? 'ar-EG' : 'en-US';
    return formatDate(timestamp, locale);
  }

  get isPositive(): boolean {
    return this.entry.points > 0;
  }

  get absolutePoints(): number {
    return Math.abs(this.entry.points);
  }

  get tagColorClass(): string {
    return TAG_COLORS[this.tag];
  }

  get icon(): any {
    switch (this.tag) {
      case "redeem":
      case "cashback":
        return this.faGift;
      case "earn":
        return this.faPlus;
      case "bonus":
        return this.faAward;
      case "deduct":
        return this.faMinus;
      default:
        return this.faPlus;
    }
  }

  get tagLabel(): string {
    const tagMap: Record<PointsTag, string> = {
      redeem: this.translation.t('Points Redeem') || 'Points Redeem',
      cashback: this.translation.t('Points Cashback') || 'Points Cashback',
      earn: this.translation.t('Points Earn') || 'Points Earn',
      bonus: this.translation.t('Points Bonus') || 'Points Bonus',
      deduct: this.translation.t('Points Deduct') || 'Points Deduct'
    };
    return tagMap[this.tag];
  }
}

