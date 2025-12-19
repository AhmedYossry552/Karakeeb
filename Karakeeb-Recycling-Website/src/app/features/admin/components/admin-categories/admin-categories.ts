import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService, Category } from '../../../../core/services/admin.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-categories.html',
  styleUrl: './admin-categories.scss'
})
export class AdminCategoriesComponent implements OnInit {
  categories = signal<Category[]>([]);
  isLoading = signal(false);
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalPages = signal(1);
  totalItems = signal(0);
  searchTerm = signal('');
  private searchSubject = new Subject<string>();

  constructor(
    private adminService: AdminService,
    public translation: TranslationService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.currentPage.set(1);
      this.loadCategories();
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    const locale = this.translation.getLocale();
    
    this.adminService.getCategories(
      this.currentPage(),
      this.itemsPerPage(),
      this.searchTerm() || undefined,
      locale
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories.set(response.data);
          if (response.pagination) {
            this.totalPages.set(response.pagination.totalPages || 1);
            this.totalItems.set(response.pagination.totalItems || 0);
          }
        } else {
          this.categories.set([]);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.toastr.error('Failed to load categories');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadCategories();
  }

  onItemsPerPageChange(items: number): void {
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
    this.loadCategories();
  }

  onEdit(item: Category): void {
    const categoryName = this.translation.getLocale() === 'ar' ? item.name?.ar : item.name?.en;
    this.router.navigate([`/admin/categories/${encodeURIComponent(categoryName || '')}/edit`]);
  }

  onDelete(item: Category): void {
    const categoryName = this.translation.getLocale() === 'ar' ? item.name?.ar : item.name?.en;
    const displayName = this.translation.getLocale() === 'ar' ? item.name?.ar : item.name?.en;
    
    if (confirm(`Are you sure you want to delete "${displayName}"? This action cannot be undone!`)) {
      this.adminService.deleteCategory(categoryName || '').subscribe({
        next: () => {
          this.toastr.success(`"${displayName}" has been deleted.`);
          this.loadCategories();
        },
        error: (error) => {
          console.error('Error deleting category:', error);
          this.toastr.error('Failed to delete category');
        }
      });
    }
  }

  onAdd(): void {
    this.router.navigate(['/admin/categories/add-category']);
  }

  onImageClick(item: Category): void {
    const categoryName = this.translation.getLocale() === 'ar' ? item.name?.ar : item.name?.en;
    this.router.navigate([`/admin/categories/${encodeURIComponent(categoryName || '')}/get-sub-category`]);
  }

  getDisplayName(item: Category): string {
    const locale = this.translation.getLocale();
    return locale === 'ar' ? (item.name?.ar || item.name?.en || '') : (item.name?.en || item.name?.ar || '');
  }

  getDisplayDescription(item: Category): string {
    const locale = this.translation.getLocale();
    return locale === 'ar' ? (item.description?.ar || item.description?.en || '') : (item.description?.en || item.description?.ar || '');
  }
}
