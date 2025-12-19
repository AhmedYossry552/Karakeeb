import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';

const cancelReasons = [
  'Changed my mind',
  'Found a better option',
  'Emergency came up',
  'Scheduling conflict',
  'Other'
];

@Component({
  selector: 'app-cancel-order-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancel-order-dialog.html',
  styleUrls: ['./cancel-order-dialog.scss']
})
export class CancelOrderDialogComponent {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string>();

  selectedReason = signal('');
  customReason = signal('');
  isLoading = signal(false);

  reasons = cancelReasons;

  constructor(public translation: TranslationService) {}

  onConfirm(): void {
    const reason = this.selectedReason() === 'Other' ? this.customReason() : this.selectedReason();
    if (reason.trim()) {
      this.confirm.emit(reason);
    }
  }

  onClose(): void {
    this.selectedReason.set('');
    this.customReason.set('');
    this.close.emit();
  }

  canConfirm(): boolean {
    if (this.isLoading()) return false;
    if (!this.selectedReason()) return false;
    if (this.selectedReason() === 'Other' && !this.customReason().trim()) return false;
    return true;
  }
}

