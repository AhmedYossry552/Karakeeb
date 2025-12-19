import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DeliveryProof {
  photoUrl?: string;
  notes?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.html',
  styleUrls: ['./confirmation-dialog.scss']
})
export class ConfirmationDialogComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() title: string = 'Confirm Action';
  @Input() message: string = 'Are you sure you want to proceed?';
  @Input() confirmText: string = 'Confirm';
  @Input() cancelText: string = 'Cancel';
  @Input() deliveryProof?: DeliveryProof | null;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  ngOnInit(): void {
    // Debug: Log when delivery proof is received
    if (this.deliveryProof) {
      console.log('📸 Confirmation Dialog - Delivery Proof received:', this.deliveryProof);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Debug: Log when delivery proof changes
    if (changes['deliveryProof']) {
      if (this.deliveryProof) {
        console.log('📸 Confirmation Dialog - Delivery Proof changed:', this.deliveryProof);
      } else {
        console.log('📸 Confirmation Dialog - No delivery proof');
      }
    }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.onCancel();
    }
  }
}

