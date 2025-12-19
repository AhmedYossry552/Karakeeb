import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, DeliveryUser } from '../../../../core/services/admin.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-delivery-approve',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-delivery-approve.html',
  styleUrl: './admin-delivery-approve.scss'
})
export class AdminDeliveryApproveComponent implements OnInit {
  deliveries = signal<DeliveryUser[]>([]);
  isLoading = signal(false);
  selectedUser: DeliveryUser | null = null;
  showActionModal = signal(false);
  actionType = signal<'approve' | 'decline' | 'revoke'>('approve');
  actionReason = signal('');
  actionLoading = signal(false);
  showAttachmentsModal = signal(false);
  selectedAttachments: any = null;

  constructor(
    private adminService: AdminService,
    public translation: TranslationService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadDeliveries();
  }

  loadDeliveries(): void {
    this.isLoading.set(true);
    
    this.adminService.getDeliveryAttachments().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.deliveries.set(response.data);
        } else if (Array.isArray(response)) {
          this.deliveries.set(response);
        } else {
          this.deliveries.set([]);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading deliveries:', error);
        this.toastr.error('Failed to load delivery applications');
        this.isLoading.set(false);
      }
    });
  }

  handleApprove(user: DeliveryUser): void {
    this.selectedUser = user;
    this.actionType.set('approve');
    this.actionLoading.set(true);

    this.adminService.approveDelivery(user.userId).subscribe({
      next: () => {
        this.toastr.success(`Delivery user "${user.name}" approved successfully`);
        this.actionLoading.set(false);
        this.loadDeliveries();
      },
      error: (error) => {
        console.error('Error approving delivery:', error);
        this.toastr.error('Failed to approve delivery user');
        this.actionLoading.set(false);
      }
    });
  }

  handleDecline(user: DeliveryUser): void {
    this.selectedUser = user;
    this.actionType.set('decline');
    this.actionReason.set('');
    this.showActionModal.set(true);
  }

  handleRevoke(user: DeliveryUser): void {
    this.selectedUser = user;
    this.actionType.set('revoke');
    this.actionReason.set('');
    this.showActionModal.set(true);
  }

  confirmAction(): void {
    if (!this.selectedUser) return;
    if (this.actionType() === 'revoke' && !this.actionReason().trim()) {
      this.toastr.error('Reason is required for revoking access');
      return;
    }

    this.actionLoading.set(true);
    const userId = this.selectedUser.userId;
    const reason = this.actionReason() || undefined;

    let request;
    if (this.actionType() === 'revoke') {
      request = this.adminService.revokeDelivery(userId, this.actionReason());
    } else {
      request = this.adminService.declineDelivery(userId, reason);
    }

    request.subscribe({
      next: () => {
        const actionText = this.actionType() === 'revoke' ? 'revoked' : 'declined';
        this.toastr.success(`Delivery user "${this.selectedUser?.name}" ${actionText} successfully`);
        this.actionLoading.set(false);
        this.showActionModal.set(false);
        this.selectedUser = null;
        this.actionReason.set('');
        this.loadDeliveries();
      },
      error: (error) => {
        console.error(`Error ${this.actionType()}ing delivery:`, error);
        this.toastr.error(`Failed to ${this.actionType()} delivery user`);
        this.actionLoading.set(false);
      }
    });
  }

  viewAttachments(user: DeliveryUser): void {
    this.selectedAttachments = user.attachments;
    this.showAttachmentsModal.set(true);
  }

  getStatusCount(status: string): number {
    return this.deliveries().filter(d => (d.currentStatus || 'pending') === status).length;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      approved: 'status-approved',
      declined: 'status-declined',
      revoked: 'status-revoked',
      pending: 'status-pending'
    };
    return classes[status] || 'status-pending';
  }

  handleActionChange(user: DeliveryUser, action: string): void {
    if (action === 'approve') {
      this.handleApprove(user);
    } else if (action === 'decline') {
      this.handleDecline(user);
    } else if (action === 'revoke') {
      this.handleRevoke(user);
    }
  }
}
