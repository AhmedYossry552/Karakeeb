import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core/services/translation.service';
import { ApiService } from '../../../../core/services/api';

@Component({
  selector: 'app-community-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './community-section.html',
  styleUrl: './community-section.scss',
})
export class CommunitySection {
  email = '';

  constructor(
    public translation: TranslationService,
    private api: ApiService
  ) {}

  handleSubscribe() {
    if (!this.email || !this.email.includes('@')) {
      // You can add toast notification here
      alert(this.translation.t('Invalid Email') || 'Invalid Email');
      return;
    }

    // .NET backend doesn't have subscribe endpoint - just show success message
    // In production, you would implement this endpoint or use a third-party service
    alert(this.translation.t('Subscribed Successfully') || 'Subscribed Successfully!');
    this.email = '';
  }
}
