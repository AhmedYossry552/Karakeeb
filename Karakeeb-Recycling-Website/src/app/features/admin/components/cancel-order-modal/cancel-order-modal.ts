import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cancel-order-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancel-order-modal.html',
  styleUrls: ['./cancel-order-modal.scss']
})
export class CancelOrderModalComponent {
  @Input() isOpen: boolean = false;
  @Output() onConfirm = new EventEmitter<string>();
  @Output() onClose = new EventEmitter<void>();

  reason = signal('');
  error = signal('');

  get isValid(): boolean {
    const reasonValue = this.reason().trim();
    return reasonValue.length >= 5;
  }

  handleConfirm(): void {
    const reasonValue = this.reason().trim();
    
    if (!reasonValue) {
      this.error.set('Cancellation reason is required');
      return;
    }

    if (reasonValue.length < 5) {
      this.error.set('Please provide a reason (at least 5 characters)');
      return;
    }

    this.error.set('');
    this.onConfirm.emit(reasonValue);
    this.reason.set('');
  }

  handleClose(): void {
    this.reason.set('');
    this.error.set('');
    this.onClose.emit();
  }
}

