import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';

interface StatData {
  icon: string;
  value: string;
  labelKey: string;
}

@Component({
  selector: 'app-recycling-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recycling-banner.html',
  styleUrl: './recycling-banner.scss'
})
export class RecyclingBannerComponent {
  @Input() statsData: StatData[] = [];

  constructor(public translation: TranslationService) {}

  getIcon(iconName: string): string {
    const icons: { [key: string]: string } = {
      zap: '⚡',
      recycle: '♻️',
      leaf: '🌿',
      eco: '🌱'
    };
    return icons[iconName] || '♻️';
  }
}

