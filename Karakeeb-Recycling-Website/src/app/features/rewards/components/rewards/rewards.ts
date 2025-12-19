import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api';
import { TranslationService } from '../../../../core/services/translation.service';
import { PointsActivityComponent } from '../../../../features/buyer-orders/components/points-activity/points-activity';

interface RewardTier {
  id: number;
  name: string;
  minRecycles: number;
  maxRecycles: number;
  color: string;
  badge: string;
  benefits: {
    en: string[];
    ar: string[];
  };
}

const rewardLevels: RewardTier[] = [
  {
    id: 1,
    name: 'Eco Beginner',
    minRecycles: 0,
    maxRecycles: 4,
    color: 'bg-gray-50 text-gray-900 border-gray-200',
    badge: '🌍',
    benefits: {
      en: ['Welcome bonus: 50 points', '1 points per recycling order'],
      ar: ['مكافأة ترحيبية: ٥٠ نقطة', '١ نقطة لكل طلب إعادة تدوير']
    }
  },
  {
    id: 2,
    name: 'Eco Starter',
    minRecycles: 5,
    maxRecycles: 14,
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    badge: '🌱',
    benefits: {
      en: ['Reaching bonus: 150 points', '5 points per recycling order'],
      ar: ['مكافأة الوصول: ١٥٠ نقطة', '٥ نقاط لكل طلب إعادة تدوير']
    }
  },
  {
    id: 3,
    name: 'Green Helper',
    minRecycles: 15,
    maxRecycles: 29,
    color: 'bg-green-100 text-green-800 border-green-300',
    badge: '♻️',
    benefits: {
      en: ['Reaching bonus: 300 points', '10 points per recycling order'],
      ar: ['مكافأة الوصول: ٣٠٠ نقطة', '١٠ نقاط لكل طلب إعادة تدوير']
    }
  },
  {
    id: 4,
    name: 'Silver Recycler',
    minRecycles: 30,
    maxRecycles: 49,
    color: 'bg-gray-200 text-gray-700 border-gray-400',
    badge: '🛡️',
    benefits: {
      en: ['Reaching bonus: 500 points', '15 points per recycling order'],
      ar: ['مكافأة الوصول: ٥٠٠ نقطة', '١٥ نقطة لكل طلب إعادة تدوير']
    }
  },
  {
    id: 5,
    name: 'Gold Guardian',
    minRecycles: 50,
    maxRecycles: 74,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    badge: '⭐',
    benefits: {
      en: ['Reaching bonus: 700 points', '20 points per recycling order'],
      ar: ['مكافأة الوصول: ٧٠٠ نقطة', '٢٠ نقطة لكل طلب إعادة تدوير']
    }
  },
  {
    id: 6,
    name: 'Platinum Pioneer',
    minRecycles: 75,
    maxRecycles: 99,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    badge: '💎',
    benefits: {
      en: ['Reaching bonus: 850 points', '25 points per recycling order'],
      ar: ['مكافأة الوصول: ٨٥٠ نقطة', '٢٥ نقطة لكل طلب إعادة تدوير']
    }
  },
  {
    id: 7,
    name: 'Diamond Elite',
    minRecycles: 100,
    maxRecycles: 999999,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    badge: '👑',
    benefits: {
      en: ['Reaching bonus: 1000 points', '30 points per recycling order'],
      ar: ['مكافأة الوصول: ١٠٠٠ نقطة', '٣٠ نقطة لكل طلب إعادة تدوير']
    }
  }
];

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, PointsActivityComponent],
  templateUrl: './rewards.html',
  styleUrls: ['./rewards.scss']
})
export class RewardsComponent implements OnInit {
  user = signal<User | null>(null);
  totalCompletedOrders = signal(0);
  userPoints = signal<any>(null);
  loading = signal(true);

  constructor(
    private authService: AuthService,
    private api: ApiService,
    public translation: TranslationService
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user.set(user);
      if (user?._id) {
        this.loadUserData();
      }
    });
  }

  loadUserData(): void {
    const user = this.user();
    if (!user?._id) return;

    this.loading.set(true);
    
    // Load orders to count completed ones (handles both 'completed' and 'collected' statuses)
    this.api.get('/orders').subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const completed = response.data.filter((o: any) => {
            const status = o.status?.toLowerCase() || o.status;
            return status === 'completed' || status === 'collected';
          }).length;
          this.totalCompletedOrders.set(completed);
        }
      },
      error: (error) => {
        console.error('Failed to load orders:', error);
      }
    });

    // Load user points
    this.api.get(`/users/${user._id}/points`).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.userPoints.set(response.data);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load user points:', error);
        this.loading.set(false);
      }
    });
  }

  rewardLevels = rewardLevels;

  getCurrentLevel = computed(() => {
    const orders = this.totalCompletedOrders();
    return rewardLevels.find(
      level => orders >= level.minRecycles && orders <= level.maxRecycles
    ) || rewardLevels[0];
  });

  getNextLevel = computed(() => {
    const orders = this.totalCompletedOrders();
    const currentIndex = rewardLevels.findIndex(
      level => orders >= level.minRecycles && orders <= level.maxRecycles
    );
    return rewardLevels[currentIndex + 1] || null;
  });

  getProgressPercentage = computed(() => {
    const current = this.getCurrentLevel();
    const orders = this.totalCompletedOrders();
    if (!current) return 0;
    const range = current.maxRecycles - current.minRecycles;
    if (range === 0) return 100;
    return Math.min(100, ((orders - current.minRecycles) / range) * 100);
  });

  getOrdersToNext = computed(() => {
    const next = this.getNextLevel();
    if (!next) return 0;
    return Math.max(0, next.minRecycles - this.totalCompletedOrders());
  });

  getTierName(tier: RewardTier): string {
    const key = `profile.tires.${tier.name.replace(/\s+/g, '').toLowerCase()}`;
    return this.translation.t(key) || tier.name;
  }

  getBenefits(tier: RewardTier): string[] {
    const locale = this.translation.getLocale();
    return locale === 'ar' ? tier.benefits.ar : tier.benefits.en;
  }

  isUnlocked(tier: RewardTier): boolean {
    return this.totalCompletedOrders() >= tier.minRecycles;
  }

  isCurrentLevel(tier: RewardTier): boolean {
    return tier.id === this.getCurrentLevel().id;
  }
}

