import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-stat-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-box.html',
  styleUrls: ['./stat-box.scss']
})
export class StatBoxComponent {
  @Input() label: string = '';
  @Input() value: number = 0;
  @Input() loading: boolean = false;
  @Input() formatCurrency: boolean = false;

  constructor(public translation: TranslationService) {}

  get displayValue(): string {
    if (this.loading) return '';
    if (this.formatCurrency) {
      // Format as currency (EGP)
      const formatted = this.translation.convertNumber(this.value.toFixed(2));
      const currency = this.translation.t('currency.egp');
      return `${formatted} ${currency !== 'currency.egp' ? currency : 'EGP'}`;
    }
    return this.translation.convertNumber(this.value);
  }
}

