import { Component, OnInit, Input, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faStar, 
  faTruck, 
  faAward, 
  faShield, 
  faEdit,
  faBox,
  faUser,
  faCog,
  faSignOutAlt
} from '@fortawesome/free-solid-svg-icons';
import { ApiService } from '../../../../core/services/api';
import { AuthService, User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { environment } from '../../../../../environments/environment';

interface Review {
  id: string;
  stars: number;
  comment: string;
  reviewedAt: string;
  customerName: string;
  orderDate: string;
}

interface Courier {
  id: string;
  name: string;
  averageRating: number;
  totalReviews: number;
  totalDeliveries?: number;
  onTimeRate?: number;
  averageDeliveryTime?: number;
}

interface PaginatedReviews {
  courier: Courier;
  reviews: Review[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalReviews: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Component({
  selector: 'app-delivery-profile',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './delivery-profile.html',
  styleUrls: ['./delivery-profile.scss']
})
export class DeliveryProfileComponent implements OnInit {
  @Input() setEdit?: (value: boolean) => void;
  
  // FontAwesome Icons
  faStar = faStar;
  faTruck = faTruck;
  faAward = faAward;
  faShield = faShield;
  faEdit = faEdit;
  faBox = faBox;
  faUser = faUser;
  faCog = faCog;
  faSignOutAlt = faSignOutAlt;

  // State
  data = signal<PaginatedReviews | null>(null);
  loading = signal<boolean>(false);
  currentPage = signal<number>(1);
  user = signal<User | null>(null);
  itemsPerPage = 3;
  
  // Navbar state
  showPopup = signal<boolean>(false);
  @ViewChild('dropdownRef') dropdownRef!: ElementRef;
  imageError = signal<boolean>(false);

  constructor(
    private api: ApiService,
    private authService: AuthService,
    public translation: TranslationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      console.log('📦 Delivery Profile - User loaded:', user);
      console.log('📦 User attachments:', user?.attachments);
      console.log('📦 User deliveryImage:', user?.attachments?.deliveryImage);
      console.log('📦 User imgUrl:', user?.imgUrl);
      this.user.set(user);
      if (user) {
        this.fetchReviews(this.currentPage());
      }
    });
  }

  fetchReviews(page: number): void {
    const user = this.user();
    if (!user) return;

    this.loading.set(true);
    const id = user._id || user.id;
    
    if (!id) {
      console.error('No user ID available');
      this.loading.set(false);
      return;
    }
    
    this.api.get<any>(`/reviews/courier/${id}?page=${page}&limit=${this.itemsPerPage}`).subscribe({
      next: (res) => {
        console.log('📦 Reviews API Response:', res);
        // Handle different response structures
        const reviewsData: PaginatedReviews = res?.data || res;
        console.log('📦 Parsed reviews data:', reviewsData);
        console.log('📦 Courier data:', reviewsData?.courier);
        this.data.set(reviewsData);
        this.loading.set(false);
      },
      error: (err) => {
        // If 404, the courier might not have reviews yet - set empty data
        if (err.status === 404) {
          this.data.set({
            courier: {
              id: id,
              name: user.name || 'Courier',
              averageRating: 0,
              totalReviews: 0,
              totalDeliveries: 0
            },
            reviews: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalReviews: 0,
              hasNext: false,
              hasPrev: false
            }
          });
        } else {
          console.error('Error fetching courier reviews:', err);
          this.data.set(null);
        }
        this.loading.set(false);
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.fetchReviews(page);
  }

  convertNumber(num: number | string): string {
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    const locale = this.translation.getLocale();
    return numValue.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  }

  getStarArray(): number[] {
    return [0, 1, 2, 3, 4];
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Pagination helpers
  getVisiblePages(): number[] {
    const pagination = this.data()?.pagination;
    if (!pagination || pagination.totalPages <= 1) return [];
    
    const current = pagination.currentPage;
    const total = pagination.totalPages;
    const pageGroupSize = 3;
    
    if (total <= pageGroupSize) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const half = Math.floor(pageGroupSize / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + pageGroupSize - 1);
    
    if (end - start + 1 < pageGroupSize) {
      start = Math.max(1, end - pageGroupSize + 1);
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  canJumpBackward(): boolean {
    const pages = this.getVisiblePages();
    return pages.length > 0 && pages[0] > 1;
  }

  canJumpForward(): boolean {
    const pagination = this.data()?.pagination;
    if (!pagination) return false;
    const pages = this.getVisiblePages();
    return pages.length > 0 && pages[pages.length - 1] < pagination.totalPages;
  }

  handleBigPrevious(): void {
    const pagination = this.data()?.pagination;
    if (!pagination) return;
    const pageGroupSize = 3;
    const newPage = Math.max(1, this.currentPage() - pageGroupSize);
    this.onPageChange(newPage);
  }

  handleBigNext(): void {
    const pagination = this.data()?.pagination;
    if (!pagination) return;
    const pageGroupSize = 3;
    const newPage = Math.min(pagination.totalPages, this.currentPage() + pageGroupSize);
    this.onPageChange(newPage);
  }

  handleEditClick(): void {
    if (this.setEdit) {
      this.setEdit(true);
    } else {
      // If used as standalone component, navigate to edit profile
      this.router.navigate(['/deliveryeditprofile']);
    }
  }

  goBack(): void {
    this.router.navigate(['/deliverydashboard']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showPopup() && this.dropdownRef && !this.dropdownRef.nativeElement.contains(event.target)) {
      this.showPopup.set(false);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    if (this.showPopup()) {
      this.positionDropdown();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    if (this.showPopup()) {
      this.positionDropdown();
    }
  }

  positionDropdown(): void {
    if (!this.dropdownRef || !this.showPopup()) return;
    
    const button = this.dropdownRef.nativeElement.querySelector('.avatar-button');
    const menu = this.dropdownRef.nativeElement.querySelector('.dropdown-menu');
    
    if (!button || !menu) return;
    
    const buttonRect = button.getBoundingClientRect();
    const menuElement = menu as HTMLElement;
    
    // Position below the button
    menuElement.style.top = `${buttonRect.bottom + 12}px`;
    // Align right edge of dropdown with right edge of button
    menuElement.style.right = `${window.innerWidth - buttonRect.right}px`;
    menuElement.style.left = 'auto';
  }

  togglePopup(): void {
    const newState = !this.showPopup();
    this.showPopup.set(newState);
    if (newState) {
      setTimeout(() => this.positionDropdown(), 0);
    }
  }

  getUserImage(): string | undefined {
    const userData = this.user();
    if (!userData) return undefined;
    // Use imgUrl first (like in customer/buyer profile), then fallback to deliveryImage
    const imageUrl = userData.imgUrl || userData.attachments?.deliveryImage;
    if (!imageUrl) return undefined;
    // Reset error when image URL changes
    if (imageUrl && this.imageError()) {
      this.imageError.set(false);
    }
    return imageUrl || undefined;
  }

  onImageError(event?: any): void {
    this.imageError.set(true);
    if (event && event.target) {
      event.target.style.display = 'none';
      if (event.target.nextElementSibling) {
        event.target.nextElementSibling.style.display = 'flex';
      }
    }
  }

  toggleLanguage(): void {
    const currentLang = this.translation.getLocale();
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    this.translation.setLocale(newLang);
  }

  getCurrentLanguage(): string {
    return this.translation.getLocale();
  }

  goToProfile(): void {
    this.showPopup.set(false);
    // Already on profile page, do nothing or refresh
  }

  goToSettings(): void {
    this.showPopup.set(false);
    this.router.navigate(['/deliveryeditprofile']);
  }

  goToSignOut(): void {
    this.showPopup.set(false);
    this.authService.logout();
    this.router.navigate(['/']);
  }

  getImageUrl(): string | null {
    const user = this.user();
    if (!user) {
      console.log('🔍 getImageUrl: No user');
      return null;
    }

    console.log('🔍 getImageUrl: User object:', user);
    console.log('🔍 getImageUrl: User attachments:', user.attachments);
    console.log('🔍 getImageUrl: User imgUrl:', user.imgUrl);

    // Check for delivery image first (for delivery role)
    const deliveryImage = user.attachments?.deliveryImage;
    if (deliveryImage) {
      console.log('✅ Found deliveryImage:', deliveryImage.substring(0, 50) + '...');
      
      // If it's already a full URL (starts with http:// or https://), return as-is
      if (deliveryImage.startsWith('http://') || deliveryImage.startsWith('https://')) {
        console.log('✅ Using full URL:', deliveryImage);
        return deliveryImage;
      }
      // If it's a base64 data URL, return as-is
      if (deliveryImage.startsWith('data:image/')) {
        console.log('✅ Using base64 data URL');
        return deliveryImage;
      }
      // If it's a relative path, construct full URL
      const baseUrl = environment.apiUrl.replace('/api', '');
      const fullUrl = deliveryImage.startsWith('/') 
        ? `${baseUrl}${deliveryImage}`
        : `${baseUrl}/${deliveryImage}`;
      console.log('✅ Constructed URL from relative path:', fullUrl);
      return fullUrl;
    }

    // Fallback to imgUrl if available
    const imgUrl = user.imgUrl;
    if (imgUrl) {
      console.log('✅ Found imgUrl:', imgUrl.substring(0, 50) + '...');
      if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://') || imgUrl.startsWith('data:image/')) {
        return imgUrl;
      }
      const baseUrl = environment.apiUrl.replace('/api', '');
      const fullUrl = imgUrl.startsWith('/') 
        ? `${baseUrl}${imgUrl}`
        : `${baseUrl}/${imgUrl}`;
      console.log('✅ Constructed URL from imgUrl:', fullUrl);
      return fullUrl;
    }

    console.warn('⚠️ No image URL found for user');
    return null;
  }

  onProfileImageError(event: any): void {
    console.error('❌ Image load error:', event);
    console.error('❌ Attempted URL:', this.getImageUrl());
    if (event && event.target) {
      event.target.style.display = 'none';
      if (event.target.nextElementSibling) {
        event.target.nextElementSibling.style.display = 'flex';
      }
    }
  }

  onImageLoad(): void {
    console.log('✅ Image loaded successfully:', this.getImageUrl());
  }
}
