export interface BilingualText {
  en: string;
  ar: string;
}

export interface Category {
  _id: string;
  categoryName: string | BilingualText;
  name: string | BilingualText;
  points: number;
  quantity: number;
  image: string;
  description?: string | BilingualText;
  items: any[];
  measurement_unit?: 1 | 2;
  price: number;
  displayName?: string;
}

export interface CategoryApiResponse {
  success: boolean;
  data: Category[];
  pagination?: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  searchInfo?: {
    searchTerm: string;
    hasSearch: boolean;
    resultsCount: number;
    currentPageResults: number;
  };
}

export interface CategoryListOptions {
  page?: number;
  limit?: number;
  search?: string;
  enabled?: boolean;
}

