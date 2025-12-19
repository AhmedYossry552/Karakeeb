import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { MarketplaceService, MarketplaceItem, Pagination } from '../../../../core/services/marketplace.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ItemCardComponent } from '../item-card/item-card';
import { PaginationComponent } from '../pagination/pagination';
import { FloatingRecorderButtonComponent } from '../../../voice-recorder/components/floating-recorder-button/floating-recorder-button';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, ItemCardComponent, PaginationComponent, FloatingRecorderButtonComponent],
  templateUrl: './marketplace.html',
  styleUrl: './marketplace.scss'
})
export class MarketplaceComponent implements OnInit, OnDestroy {
  searchTerm = signal('');
  selectedCategory = signal('all');
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
  categories = signal<string[]>([]);
  isLoading = signal(false);
  isFetching = signal(false);
  
  private searchSubject = new Subject<string>();
  private subscriptions = new Subscription();

  filteredItems = computed(() => {
    const items = this.items();
    const search = this.searchTerm().toLowerCase().trim();
    const category = this.selectedCategory();

    if (!search && category === 'all') {
      return items;
    }

    return items.filter(item => {
      if (search) {
        const matchesName = this.createEnhancedSearch(search, item.name);
        const matchesCategory = this.createEnhancedSearch(search, item.categoryName);
        if (!matchesName && !matchesCategory) return false;
      }

      if (category !== 'all') {
        // Case-insensitive category matching
        const itemCategory = item.categoryName?.en?.toLowerCase().trim() || '';
        const selectedCategory = category.toLowerCase().trim();
        return itemCategory === selectedCategory;
      }

      return true;
    });
  });

  sortedFilteredItems = computed(() => {
    const items = this.filteredItems();
    const search = this.searchTerm().toLowerCase().trim();

    if (!search) return items;

    return [...items].sort((a, b) => {
      const scoreA = this.getSearchScore(a, search);
      const scoreB = this.getSearchScore(b, search);
      return scoreB - scoreA;
    });
  });

  constructor(
    private marketplaceService: MarketplaceService,
    public translation: TranslationService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Debounce search
    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(400),
        distinctUntilChanged()
      ).subscribe(value => {
        this.searchTerm.set(value);
        this.currentPage.set(1);
        this.loadInitialData();
      })
    );
  }


  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadInitialData(): void {
    if (this.items().length === 0) {
      this.isLoading.set(true);
    } else {
      this.isFetching.set(true);
    }
    
    const user = this.authService.getUser();
    const filters = {
      currentPage: this.currentPage(),
      itemsPerPage: 18,
      // Send role for both buyer and customer to get correct pricing
      userRole: user?.role === 'buyer' ? 'buyer' : (user?.role === 'customer' ? 'customer' : undefined),
      category: this.selectedCategory() !== 'all' ? this.selectedCategory() : undefined,
      search: this.searchTerm() || undefined
    };

    this.subscriptions.add(
      this.marketplaceService.getItems(filters).subscribe({
        next: (response) => {
          this.items.set(response.data);
          this.pagination.set(response.pagination);
          this.isLoading.set(false);
          this.isFetching.set(false);
        },
        error: (error) => {
          console.error('Failed to load items:', error);
          this.isLoading.set(false);
          this.isFetching.set(false);
        }
      })
    );
  }

  private loadCategories(): void {
    const user = this.authService.getUser();
    this.subscriptions.add(
      this.marketplaceService.getCategories(user?.role).subscribe({
        next: (categories) => {
          this.categories.set(categories);
        },
        error: (error) => {
          console.error('Failed to load categories:', error);
        }
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  ngOnInit(): void {
    // Read category from query params first
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        const category = decodeURIComponent(params['category']);
        this.selectedCategory.set(category);
      } else {
        this.selectedCategory.set('all');
      }
      // Load data after setting category
      this.loadInitialData();
    });
    this.loadCategories();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.loadInitialData();
  }
  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
    
    // Update URL with category query param
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: category !== 'all' ? category : null },
      queryParamsHandling: 'merge'
    });
    
    this.loadInitialData();
  }

  private normalizeArabicText(text: string): string {
    if (!text) return text;
    return text
      .replace(/[آأإا]/g, 'ا')
      .replace(/[ؤئء]/g, 'ء')
      .replace(/[يى]/g, 'ي')
      .replace(/[هة]/g, 'ه')
      .replace(/[ًٌٍَُِّْٰ]/g, '')
      .replace(/ة/g, 'ه');
  }

  private createEnhancedSearch(searchTerm: string, text: { en: string; ar: string }): boolean {
    if (!searchTerm || !searchTerm.trim()) return true;

    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    const normalizedArabicSearchTerm = this.normalizeArabicText(normalizedSearchTerm);

    const englishMatch = text.en.toLowerCase().includes(normalizedSearchTerm);
    const arabicMatch = text.ar.toLowerCase().includes(normalizedSearchTerm);
    const normalizedArabicMatch = this.normalizeArabicText(text.ar.toLowerCase()).includes(normalizedArabicSearchTerm);

    const englishInArabic = !/[\u0600-\u06FF]/.test(searchTerm) ?
      this.normalizeArabicText(text.ar.toLowerCase()).includes(normalizedSearchTerm) : false;

    const arabicInEnglish = /[\u0600-\u06FF]/.test(searchTerm) ?
      text.en.toLowerCase().includes(normalizedSearchTerm) : false;

    return englishMatch || arabicMatch || normalizedArabicMatch || englishInArabic || arabicInEnglish;
  }

  private getSearchScore(item: MarketplaceItem, searchTerm: string): number {
    let score = 0;
    const normalizedSearchTerm = this.normalizeArabicText(searchTerm);

    if (item.name.en.toLowerCase() === searchTerm || item.name.ar.toLowerCase() === searchTerm) {
      score += 100;
    }

    if (this.normalizeArabicText(item.name.ar.toLowerCase()) === normalizedSearchTerm) {
      score += 90;
    }

    if (item.name.en.toLowerCase().startsWith(searchTerm) ||
        item.name.ar.toLowerCase().startsWith(searchTerm) ||
        this.normalizeArabicText(item.name.ar.toLowerCase()).startsWith(normalizedSearchTerm)) {
      score += 50;
    }

    if (this.createEnhancedSearch(searchTerm, item.categoryName)) {
      score += 25;
    }

    if (score === 0) score = 10;

    return score;
  }

  get locale(): string {
    return this.translation.getLocale();
  }

  get user() {
    return this.authService.getUser();
  }

  trackByItemId(index: number, item: MarketplaceItem): string {
    return item._id;
  }
}

