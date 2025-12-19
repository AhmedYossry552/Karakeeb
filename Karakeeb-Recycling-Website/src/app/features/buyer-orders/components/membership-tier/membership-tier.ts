import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core/services/translation.service';

interface RewardTier {
  name: string;
  minRecycles: number;
  maxRecycles: number;
  color: string;
  badge: string;
}

const rewardLevels: RewardTier[] = [
  { name: 'Bronze', minRecycles: 0, maxRecycles: 10, color: 'border-amber-600 bg-amber-50', badge: '🥉' },
  { name: 'Silver', minRecycles: 11, maxRecycles: 25, color: 'border-gray-400 bg-gray-50', badge: '🥈' },
  { name: 'Gold', minRecycles: 26, maxRecycles: 50, color: 'border-yellow-500 bg-yellow-50', badge: '🥇' },
  { name: 'Platinum', minRecycles: 51, maxRecycles: 100, color: 'border-blue-500 bg-blue-50', badge: '💎' },
  { name: 'Diamond', minRecycles: 101, maxRecycles: Infinity, color: 'border-purple-500 bg-purple-50', badge: '💠' }
];

@Component({
  selector: 'app-membership-tier',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './membership-tier.html',
  styleUrls: ['./membership-tier.scss']
})
export class MembershipTierComponent {
  @Input() totalRecycles = 0;

  constructor(public translation: TranslationService) {}

  getTier(): RewardTier | null {
    return rewardLevels.find(
      tier => this.totalRecycles >= tier.minRecycles && this.totalRecycles <= tier.maxRecycles
    ) || null;
  }

  getTierName(): string {
    const tier = this.getTier();
    if (!tier) return '';
    const key = `profile.tires.${tier.name.toLowerCase()}`;
    return this.translation.t(key) || tier.name;
  }
}

