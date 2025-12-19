import { Injectable } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { of } from 'rxjs';
import { ApiService } from './api';
import { Category, CategoryApiResponse, CategoryListOptions } from '../types/category.types';
import { TranslationService } from './translation.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  constructor(
    private api: ApiService,
    private translation: TranslationService
  ) {}

  getCategories(options: CategoryListOptions = {}): Observable<CategoryApiResponse> {
    const { page = 1, limit = 10, search } = options;
    const locale = this.translation.getLocale();
    
    const params: any = {
      language: locale,
      page: page.toString(),
      limit: limit.toString()
    };

    if (search && search.trim()) {
      params.search = search.trim();
    }

    const endpoint = search && search.trim() ? '/categories/search' : '/categories';
    
    return this.api.get<CategoryApiResponse>(endpoint, { params }).pipe(
      catchError(error => {
        console.error('CategoryService error:', error);
        return of({
          success: false,
          data: [],
          pagination: null
        } as CategoryApiResponse);
      })
    );
  }

  getCategoryDisplayName(category: Category): string {
    if (!category) return '';
    if (category.displayName) return category.displayName;
    
    const locale = this.translation.getLocale();
    if (category.name && typeof category.name === 'object') {
      return category.name[locale] || category.name.en || category.name.ar || '';
    }
    return typeof category.name === 'string' ? category.name : '';
  }

  getCategoryEnglishName(category: Category): string {
    if (!category) return '';
    if (category.name && typeof category.name === 'object') {
      return category.name.en || '';
    }
    return typeof category.name === 'string' ? category.name : '';
  }
}
