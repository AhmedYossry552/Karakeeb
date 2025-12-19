import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api';

export interface MarketplaceItem {
  _id: string;
  name: {
    en: string;
    ar: string;
  };
  points: number;
  price: number;
  measurement_unit: 1 | 2;
  image: string;
  categoryName: {
    en: string;
    ar: string;
  };
  categoryId: string;
  quantity: number;
  description?: string;
  displayName?: string;
  categoryDisplayName?: string;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetItemsResponse {
  data: MarketplaceItem[];
  pagination: Pagination;
}

export interface MarketplaceFilters {
  currentPage: number;
  itemsPerPage: number;
  userRole?: string;
  category?: string;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarketplaceService {
  private itemsSubject = new BehaviorSubject<MarketplaceItem[]>([]);
  private paginationSubject = new BehaviorSubject<Pagination>({
    currentPage: 1,
    itemsPerPage: 18,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  });

  items$ = this.itemsSubject.asObservable();
  pagination$ = this.paginationSubject.asObservable();

  constructor(private api: ApiService) {}

  getItems(filters: MarketplaceFilters): Observable<GetItemsResponse> {
    const params: any = {
      page: filters.currentPage,
      limit: filters.itemsPerPage
    };

    if (filters.userRole) {
      params.role = filters.userRole;
    }

    if (filters.category && filters.category !== 'all') {
      params.category = filters.category;
    }

    if (filters.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }

    return this.api.get<GetItemsResponse>('/get-items', { params }).pipe(
      map(response => {
        this.itemsSubject.next(response.data || []);
        this.paginationSubject.next(response.pagination);
        return response;
      })
    );
  }

  getItemByName(itemName: string, role?: string, language?: string): Observable<MarketplaceItem> {
    const params: any = {};
    if (role) params.role = role;
    if (language) params.language = language;

    return this.api.get<{ success: boolean; data: MarketplaceItem }>(`/items/by-name/${encodeURIComponent(itemName)}`, { params }).pipe(
      map(response => response.data)
    );
  }

  getCategories(role?: string): Observable<string[]> {
    const params: any = { page: 1, limit: 50 };
    if (role) params.role = role;

    return this.api.get<{ success: boolean; data: Array<{ name: { en: string; ar: string }; displayName: string }> }>('/categories', { params }).pipe(
      map(response => {
        // Extract category names from the response
        const categories = (response.data || []).map(category => category.name.en);
        return categories.sort();
      })
    );
  }

  getOptimizedImageUrl(url: string, width: number = 300): string {
    if (url.includes('cloudinary.com')) {
      return url.replace('/upload/', `/upload/c_fit,w_${width},q_auto,f_auto,dpr_auto/`);
    }
    return url;
  }
}

