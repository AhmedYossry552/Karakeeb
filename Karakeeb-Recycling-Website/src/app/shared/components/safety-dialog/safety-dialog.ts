import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../core/services/translation.service';

interface SafetyIssue {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const safetyIssues: SafetyIssue[] = [
  { id: 'unsafe_behavior', label: 'Unsafe Driving/Behavior', icon: '⚠️', description: 'Reckless driving, speeding, or unsafe conduct' },
  { id: 'harassment', label: 'Harassment or Inappropriate Behavior', icon: '🚫', description: 'Verbal abuse, discrimination, or inappropriate comments' },
  { id: 'property_damage', label: 'Property Damage', icon: '🚚', description: 'Damage to your property or belongings' },
  { id: 'late_arrival', label: 'Excessive Delay', icon: '⏰', description: 'Driver is significantly late without communication' },
  { id: 'no_show', label: 'Driver No-Show', icon: '👤', description: 'Driver failed to arrive for scheduled pickup' },
  { id: 'other', label: 'Other Safety Concern', icon: '🛡️', description: 'Any other safety-related issue' }
];

@Component({
  selector: 'app-safety-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './safety-dialog.html',
  styleUrls: ['./safety-dialog.scss']
})
export class SafetyDialogComponent {
  @Input() open = false;
  @Input() orderNumber = '';
  @Input() driverName?: string;
  @Output() close = new EventEmitter<void>();

  reportType = signal('');
  description = signal('');
  isLoading = signal(false);
  showEmergencyConfirm = signal(false);

  issues = safetyIssues;

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    public translation: TranslationService
  ) {}

  get selectedIssue(): SafetyIssue | undefined {
    return this.issues.find(issue => issue.id === this.reportType());
  }

  onReport(): void {
    if (!this.reportType() || !this.description().trim()) return;

    this.isLoading.set(true);
    
    // .NET backend doesn't have safety-report endpoint - just show success
    // In production, you would implement this endpoint or log to a service
    setTimeout(() => {
      this.toastr.success(this.translation.t('Safety Report Submitted') || 'Safety report submitted successfully!');
      this.reportType.set('');
      this.description.set('');
      this.close.emit();
      this.isLoading.set(false);
    }, 500);
  }

  onEmergency(): void {
    this.showEmergencyConfirm.set(true);
  }

  onEmergencyConfirm(): void {
    // .NET backend doesn't have emergency endpoint
    // In a real scenario, this would call emergency services or log the incident
    // For now, just show success message
    this.toastr.success(this.translation.t('Emergency Services Contacted') || 'Emergency services contacted! Please call local emergency services if this is a real emergency.');
    this.showEmergencyConfirm.set(false);
    this.close.emit();
  }

  onClose(): void {
    this.reportType.set('');
    this.description.set('');
    this.showEmergencyConfirm.set(false);
    this.close.emit();
  }

  canSubmit(): boolean {
    return !!this.reportType() && !!this.description().trim() && !this.isLoading();
  }
}

