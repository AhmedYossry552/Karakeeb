import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';
import { StatBoxComponent } from '../stat-box/stat-box';

@Component({
  selector: 'app-stats-section',
  standalone: true,
  imports: [CommonModule, StatBoxComponent],
  templateUrl: './stats-section.html',
  styleUrls: ['./stats-section.scss']
})
export class StatsSectionComponent {
  @Input() totalCompletedOrders: number = 0;
  @Input() userPoints: any = null;
  @Input() pointsLoading: boolean = false;
  @Input() walletBalance: number = 0;
  @Input() walletLoading: boolean = false;
  @Input() userRole: string = 'customer';

  constructor(public translation: TranslationService) {}

  get isNotBuyer(): boolean {
    return this.userRole !== 'buyer';
  }

  get isCustomer(): boolean {
    return this.userRole === 'customer';
  }

  get totalPoints(): number {
    const points = this.userPoints?.totalPoints || 0;
    // Return points as number (can be decimal like 112398.5)
    return typeof points === 'number' ? points : parseFloat(String(points)) || 0;
  }

  get formattedPoints(): string {
    const points = this.totalPoints;
    // Format points with decimals if needed (e.g., 112398.5)
    return points % 1 === 0 ? points.toString() : points.toFixed(1);
  }

  get gridClass(): string {
    let colCount = 1; // Always at least recycles
    if (this.isNotBuyer) colCount++; // Points
    if (this.isCustomer) colCount++; // Wallet
    if (this.isCustomer) colCount++; // Tier
    
    if (colCount === 1) return 'grid-cols-1 md:grid-cols-1';
    if (colCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (colCount === 3) return 'grid-cols-1 md:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-4';
  }

  get recyclesLabel(): string {
    return this.isCustomer
      ? this.translation.t('Total Recycles') || 'Total Recycles'
      : this.translation.t('Total Orders') || 'Total Orders';
  }
}

