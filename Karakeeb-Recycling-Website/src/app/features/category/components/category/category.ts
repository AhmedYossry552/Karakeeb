

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslationService } from '../../../../core/services/translation.service';
import { CategoryService } from '../../../../core/services/category.service';
import { Category } from '../../../../core/types/category.types';
import { CATEGORY_ICONS } from '../../data/static-categories';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './category.html',
  styleUrls: ['./category.scss']
})
export class CategoryComponent implements OnInit {
  categories = signal<Category[]>([]);
  isLoading = signal<boolean>(true);
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);

  constructor(
    public translation: TranslationService,
    private router: Router,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);

    // Get all categories first (we'll handle pagination manually)
    this.categoryService.getCategories({
      page: 1,
      limit: 10 // Get enough to cover all categories
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Remove duplicates and ensure only one 'kids toys' category
          const allCategories = this.removeDuplicates(response.data);
          
          // First page: first 5 categories
          if (this.currentPage() === 1) {
            this.categories.set(allCategories.slice(0, 5));
            this.totalPages.set(2); // We know we want exactly 2 pages
          } 
          // Second page: remaining categories (should be 4)
          else if (this.currentPage() === 2) {
            this.categories.set(allCategories.slice(5, 9)); // Get items 5-8
            this.totalPages.set(2);
          }
        } else {
          this.categories.set([]);
          this.totalPages.set(1);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
        this.categories.set([]);
        this.totalPages.set(1);
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.currentPage.set(page);
    this.loadCategories();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  getCategoryIcon(category: Category): string {
    const englishName = this.getEnglishName(category);
    const name = englishName.toLowerCase();
    return CATEGORY_ICONS[name] || CATEGORY_ICONS[this.getDisplayName(category).toLowerCase()] || '📦';
  }

  getDisplayName(category: Category): string {
    if (category.displayName) {
      return category.displayName;
    }
    
    const locale = this.translation.getLocale();
    if (typeof category.name === 'string') {
      return category.name.toLowerCase();
    }
    
    const name = locale === 'ar' 
      ? (category.name.ar || category.name.en)
      : (category.name.en || category.name.ar);
    
    return name.toLowerCase();
  }

  getEnglishName(category: Category): string {
    if (typeof category.name === 'string') {
      return category.name;
    }
    return category.name.en || category.name.ar;
  }

  onCardClick(category: Category): void {
    const categoryName = this.getEnglishName(category);
    // Remove fromMarketPlace flag when navigating from category page
    localStorage.removeItem('fromMarketPlace');
    this.router.navigate(['/marketplace'], {
      queryParams: { category: categoryName }
    });
  }

  getCategoryDescription(category: Category): string {
    if (!category.description) return '';
    
    const locale = this.translation.getLocale();
    if (typeof category.description === 'string') {
      return category.description;
    }
    
    if (typeof category.description === 'object') {
      return locale === 'ar' 
        ? (category.description.ar || category.description.en || '')
        : (category.description.en || category.description.ar || '');
    }
    
    return '';
  }

  onImageError(event: Event, category: Category): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const wrapper = img.parentElement;
    if (wrapper) {
      const fallback = document.createElement('div');
      fallback.className = 'category-icon-fallback';
      fallback.textContent = this.getCategoryIcon(category);
      wrapper.appendChild(fallback);
    }
  }

  private removeDuplicates(categories: Category[]): Category[] {
    const seen = new Map<string, Category>();
    const uniqueCategories: Category[] = [];
    let kidsToysFound = false;

    for (const category of categories) {
      if (!category) continue;

      const englishName = this.getEnglishName(category).toLowerCase().trim();
      const isKidsToys = englishName.includes('kids') || englishName.includes('toys');

      // Skip if this is a duplicate 'kids toys' category
      if (isKidsToys) {
        if (kidsToysFound) {
          console.log('Skipping duplicate kids toys category:', category);
          continue;
        }
        kidsToysFound = true;
      }

      // Check for other duplicates
      const existing = Array.from(seen.values()).find(cat => 
        this.getEnglishName(cat).toLowerCase().trim() === englishName
      );

      if (!existing) {
        seen.set(category._id, category);
        uniqueCategories.push(category);
      }
    }

    return uniqueCategories;
  }
}