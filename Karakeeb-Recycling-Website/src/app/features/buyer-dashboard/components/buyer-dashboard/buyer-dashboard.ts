import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MarketplaceService, MarketplaceItem, Pagination } from '../../../../core/services/marketplace.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ItemCardComponent } from '../../../marketplace/components/item-card/item-card';
import { PaginationComponent } from '../../../marketplace/components/pagination/pagination';
import { PromotionSliderComponent } from '../promotion-slider/promotion-slider';
import { RecyclingBannerComponent } from '../recycling-banner/recycling-banner';
import { TopMaterialsComponent } from '../top-materials/top-materials';

@Component({
  selector: 'app-buyer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ItemCardComponent, PaginationComponent, PromotionSliderComponent, RecyclingBannerComponent, TopMaterialsComponent],
  templateUrl: './buyer-dashboard.html',
  styleUrl: './buyer-dashboard.scss'
})
export class BuyerDashboardComponent implements OnInit, OnDestroy {
  currentPage = signal(1);
  items = signal<MarketplaceItem[]>([]);
  pagination = signal<Pagination>({
    currentPage: 1,
    itemsPerPage: 18,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  });
  isLoading = signal(false);
  isFetching = signal(false);

  private subscriptions = new Subscription();

  filteredItems = computed(() => {
    return this.items();
  });

  constructor(
    private marketplaceService: MarketplaceService,
    public translation: TranslationService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadItems();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get user() {
    return this.authService.getUser();
  }

  get locale(): string {
    return this.translation.getLocale();
  }

  get statsData() {
    return [
      {
        icon: 'zap',
        value: '1,250+',
        labelKey: 'recyclingBanner.stats.dailyRecyclers'
      },
      {
        icon: 'recycle',
        value: '5.2K',
        labelKey: 'recyclingBanner.stats.itemsRecycled'
      },
      {
        icon: 'leaf',
        value: '28K+',
        labelKey: 'recyclingBanner.stats.co2Reduced'
      },
      {
        icon: 'eco',
        value: '100%',
        labelKey: 'recyclingBanner.stats.ecoFriendly'
      }
    ];
  }

  loadItems(): void {
    this.isLoading.set(true);
    const user = this.authService.getUser();
    const filters = {
      currentPage: this.currentPage(),
      itemsPerPage: 18,
      // Send role for both buyer and customer to get correct pricing
      userRole: user?.role === 'buyer' ? 'buyer' : (user?.role === 'customer' ? 'customer' : undefined)
    };
    
    this.marketplaceService.getItems(filters).subscribe({
      next: (response) => {
        this.items.set(response.data || []);
        if (response.pagination) {
          this.pagination.set(response.pagination);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading items:', error);
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadItems();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}

