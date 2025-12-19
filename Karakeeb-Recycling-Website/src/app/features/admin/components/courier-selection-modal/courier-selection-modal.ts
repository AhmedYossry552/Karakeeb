import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faTimes, 
  faUser, 
  faEnvelope, 
  faCheckCircle,
  faChevronRight,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

export interface Courier {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
  imgUrl?: string;
  isAvailable?: boolean;
  isApproved?: boolean;
  attachments?: {
    status?: string;
    deliveryImage?: string;
  };
}

@Component({
  selector: 'app-courier-selection-modal',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './courier-selection-modal.html',
  styleUrls: ['./courier-selection-modal.scss']
})
export class CourierSelectionModalComponent {
  @Input() isOpen: boolean = false;
  @Input() couriers: Courier[] = [];
  @Input() loadingCourierId: string | null = null;
  @Output() onSelectCourier = new EventEmitter<string>();
  @Output() onClose = new EventEmitter<void>();

  // FontAwesome Icons
  faTimes = faTimes;
  faUser = faUser;
  faEnvelope = faEnvelope;
  faCheckCircle = faCheckCircle;
  faChevronRight = faChevronRight;
  faSpinner = faSpinner;

  get availableCouriers(): Courier[] {
    return this.couriers.filter(courier => 
      courier.isApproved === true || 
      courier.attachments?.status === 'approved'
    );
  }

  getInitials(name: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  handleSelectCourier(courierId: string): void {
    const courier = this.couriers.find(c => c._id === courierId);
    if (!courier) {
      return;
    }

    // Check if courier is approved
    if (courier.attachments?.status !== 'approved' && courier.isApproved !== true) {
      return;
    }

    this.onSelectCourier.emit(courierId);
  }

  handleClose(): void {
    this.onClose.emit();
  }
}

