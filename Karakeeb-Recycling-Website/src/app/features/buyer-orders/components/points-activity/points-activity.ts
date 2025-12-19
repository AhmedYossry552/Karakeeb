import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';
import { PointsEntryItemComponent, PointsEntry } from '../../../profile/components/points-entry-item/points-entry-item';
import { PointsHistoryModalComponent } from '../../../profile/components/points-history-modal/points-history-modal';
import { faChevronDown, faCalendar, faEye } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

export interface UserPoints {
  totalPoints: number;
  pointsHistory?: PointsEntry[];
}

@Component({
  selector: 'app-points-activity',
  standalone: true,
  imports: [CommonModule, PointsEntryItemComponent, PointsHistoryModalComponent, FaIconComponent],
  templateUrl: './points-activity.html',
  styleUrls: ['./points-activity.scss']
})
export class PointsActivityComponent {
  @Input() userPoints: UserPoints | null = null;
  @Input() totalPointsHistoryLength: number = 0;

  isOpen = signal(false);
  isModalOpen = signal(false);

  faChevronDown = faChevronDown;
  faCalendar = faCalendar;
  faEye = faEye;

  constructor(public translation: TranslationService) {}

  toggleAccordion(): void {
    this.isOpen.update(v => !v);
  }

  openModal(): void {
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  get recentEntries(): PointsEntry[] {
    return this.userPoints?.pointsHistory?.slice(0, 3) || [];
  }

  get hasNoActivity(): boolean {
    return this.totalPointsHistoryLength === 0;
  }

  get showFullHistoryButton(): boolean {
    return this.totalPointsHistoryLength > 3;
  }
}

