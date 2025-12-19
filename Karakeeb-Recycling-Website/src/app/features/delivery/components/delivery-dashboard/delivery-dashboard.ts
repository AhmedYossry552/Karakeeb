import { Component, OnInit, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faTruck, 
  faBox, 
  faUser, 
  faClock, 
  faCheckCircle, 
  faCamera, 
  faUpload, 
  faTimes,
  faRotateRight,
  faSignOutAlt,
  faCog,
  faEdit,
  faFileInvoice,
  faMapMarkerAlt,
  faEnvelope,
  faPhone,
  faCube,
  faSearch,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { ApiService } from '../../../../core/services/api';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthService, User } from '../../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

interface DeliveryOrder {
  _id: string;
  status: string;
  createdAt: string;
  user?: {
    _id?: string;
    id?: string;
    userName?: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
    image?: string;
    imageUrl?: string;
    role?: string;
  };
  address?: {
    street?: string;
    city?: string;
    area?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    landmark?: string;
    details?: string;
  };
  items?: Array<{
    _id: string;
    name?: string | { en?: string; ar?: string };
    quantity: number;
    unit?: string;
    measurement_unit?: number;
    points?: number;
    price?: number;
    image?: string;
  }>;
  totalPrice?: number;
  deliveryProof?: {
    photoUrl?: string;
    notes?: string;
  };
}

interface QuantityItem {
  originalQuantity: number;
  actualQuantity: number | string;
  name: string;
  unit: string;
  measurement_unit: number;
  hasUnitMismatch: boolean;
  originalUnit: string;
  pointsPerUnit: number;
  originalPoints: number;
  currentPoints: number;
}

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyValuePipe, FontAwesomeModule],
  templateUrl: './delivery-dashboard.html',
  styleUrls: ['./delivery-dashboard.scss']
})
export class DeliveryDashboardComponent implements OnInit {
  // FontAwesome Icons
  faTruck = faTruck;
  faBox = faBox;
  faUser = faUser;
  faClock = faClock;
  faCheckCircle = faCheckCircle;
  faCamera = faCamera;
  faUpload = faUpload;
  faX = faTimes;
  faRotateRight = faRotateRight;
  faSignOutAlt = faSignOutAlt;
  faCog = faCog;
  faEdit = faEdit;
  faFileInvoice = faFileInvoice;
  faMapMarkerAlt = faMapMarkerAlt;
  faEnvelope = faEnvelope;
  faPhone = faPhone;
  faCube = faCube;
  faSearch = faSearch;
  faChevronRight = faChevronRight;

  // Orders state
  loading = signal<boolean>(true);
  orders = signal<DeliveryOrder[]>([]);
  isFetching = signal<boolean>(false);

  // Modal states
  isDetailsModalOpen = signal<boolean>(false);
  selectedOrderDetails = signal<DeliveryOrder | null>(null);
  showCompleteModal = signal<boolean>(false);
  selectedOrder = signal<DeliveryOrder | null>(null);
  userRole = signal<string>('');

  // Photo proof states
  proofPhoto: File | null = null;
  photoPreview = signal<string>('');
  notes = signal<string>('');
  completing = signal<boolean>(false);
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  // Quantity management states
  quantities = signal<Record<string, QuantityItem>>({});
  showQuantityForm = signal<boolean>(false);
  quantityNotes = signal<string>('');

  // Profile states
  showPopup = signal<boolean>(false);
  @ViewChild('dropdownRef') dropdownRef!: ElementRef;
  imageError = signal<boolean>(false);

  // User
  user = signal<User | null>(null);

  // Search
  searchTerm = signal<string>('');

  constructor(
    private api: ApiService,
    public translation: TranslationService,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user.set(user);
    });

    this.loadOrders();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showPopup() && this.dropdownRef && !this.dropdownRef.nativeElement.contains(event.target)) {
      this.showPopup.set(false);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    if (this.showPopup()) {
      this.positionDropdown();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event): void {
    if (this.showPopup()) {
      this.positionDropdown();
    }
  }

  loadOrders(): void {
    this.loading.set(true);
    this.isFetching.set(true);

   
    this.api.get<any>('/my-orders').subscribe({
      next: (res) => {

        let data: any[] = [];
        
        console.log('=== RAW API RESPONSE ===');
        console.log('Response type:', typeof res);
        console.log('Response:', res);
        console.log('Response keys:', res ? Object.keys(res) : 'null');
        
 
        if (res?.data?.orders && Array.isArray(res.data.orders)) {
          data = res.data.orders;
          console.log('✅ Using res.data.orders structure');
        } 
    
        else if (res?.orders && Array.isArray(res.orders)) {
          data = res.orders;
          console.log('✅ Using res.orders structure');
        } else if (res?.data && Array.isArray(res.data)) {
          data = res.data;
          console.log('✅ Using res.data structure');
        } else if (Array.isArray(res)) {
          data = res;
          console.log('✅ Using direct array structure');
        } else {
          console.warn('⚠️ Unknown response structure:', res);
        }
        

        if (data.length > 0) {
          console.log('=== FIRST ORDER ANALYSIS ===');
          console.log('Total orders:', data.length);
          console.log('First order (full JSON):', JSON.stringify(data[0], null, 2));
          console.log('First order keys:', Object.keys(data[0]));
          console.log('First order user:', data[0].user);
          console.log('First order user type:', typeof data[0].user);
          console.log('First order address:', data[0].address);
          console.log('First order address type:', typeof data[0].address);
          console.log('First order items:', data[0].items);
          
          // Check all possible user field names
          console.log('🔍 Checking for user in different fields:');
          console.log('  - order.user:', data[0].user);
          console.log('  - order.customer:', (data[0] as any).customer);
          console.log('  - order.userId:', (data[0] as any).userId);
          console.log('  - order.userData:', (data[0] as any).userData);
          console.log('  - order.customerId:', (data[0] as any).customerId);
          console.log('  - order.customerData:', (data[0] as any).customerData);
          
          // Check all possible address field names
          console.log('🔍 Checking for address in different fields:');
          console.log('  - order.address:', data[0].address);
          console.log('  - order.shippingAddress:', (data[0] as any).shippingAddress);
          console.log('  - order.deliveryAddress:', (data[0] as any).deliveryAddress);
          console.log('  - order.pickupAddress:', (data[0] as any).pickupAddress);
          console.log('  - order.shipping:', (data[0] as any).shipping);
          
          // Check if user/address might be in a nested structure
          console.log('🔍 Checking nested structures:');
          console.log('  - Full order object:', data[0]);
          
          if (data[0].user) {
            console.log('✅ User exists! User keys:', Object.keys(data[0].user));
            console.log('User object:', JSON.stringify(data[0].user, null, 2));
          } else {
            console.warn('❌ User is null/undefined');
            console.warn('💡 The backend /my-orders endpoint is NOT populating user field');
            console.warn('💡 This is a BACKEND issue - the endpoint needs to populate user data');
          }
          if (data[0].address) {
            console.log('✅ Address exists! Address keys:', Object.keys(data[0].address));
            console.log('Address object:', JSON.stringify(data[0].address, null, 2));
          } else {
            console.warn('❌ Address is null/undefined');
            console.warn('💡 The backend /my-orders endpoint is NOT populating address field');
            console.warn('💡 This is a BACKEND issue - the endpoint needs to populate address data');
          }
        }
        
        this.orders.set(data);
        this.loading.set(false);
        this.isFetching.set(false);
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        console.error('Error response:', err.error);
        this.loading.set(false);
        this.isFetching.set(false);
        if (err.status !== 401) {
          this.toastr.error(this.translation.t('courier.errorLoadingOrders') !== 'courier.errorLoadingOrders' ? this.translation.t('courier.errorLoadingOrders') : 'Failed to load orders');
        }
      }
    });
  }

  handleViewOrderDetails(order: DeliveryOrder): void {
    console.log('=== ORDER DETAILS ===');
    console.log('Order from list:', JSON.stringify(order, null, 2));

    const enrichedOrder: any = { ...order };

    const hasUser = !!order.user;
    const hasAddress = !!order.address;


    const userId = order.user?._id || (order as any).userId || (order as any).customerId || (order as any).user_id;
    const addressId = (order as any).address?._id || (order as any).addressId || (order as any).shippingAddressId || (order as any).address_id;

    if (hasUser && hasAddress) {
      this.selectedOrderDetails.set(order);
      this.isDetailsModalOpen.set(true);
      return;
    }


    const userReq = hasUser
      ? of(order.user)
      : userId
        ? this.api.get<any>(`/users/${userId}`).pipe(

            catchError(err => {
              console.warn('Failed to fetch user for order fallback', err);
              return of(null);
            })
          )
        : of(null);

    const addressReq = hasAddress
      ? of(order.address)
      : addressId
        ? this.api.get<any>(`/addresses/${addressId}`).pipe(
            catchError(err => {
              console.warn('Failed to fetch address for order fallback', err);
              return of(null);
            })
          )
        : of(null);

    this.isFetching.set(true);
    forkJoin({ user: userReq, address: addressReq }).subscribe({
      next: (res) => {
        this.isFetching.set(false);
        if (res.user) enrichedOrder.user = res.user;
        if (res.address) enrichedOrder.address = res.address;
        this.selectedOrderDetails.set(enrichedOrder);
        this.isDetailsModalOpen.set(true);
      },
      error: (err) => {
        console.error('Error enriching order details:', err);
        this.isFetching.set(false);
    
        this.selectedOrderDetails.set(order);
        this.isDetailsModalOpen.set(true);
      }
    });
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedOrderDetails.set(null);
  }

  handleCompleteOrder(order: DeliveryOrder): void {
    if (!order.user) {
      this.toastr.error('Order user information is missing');
      return;
    }
    
    this.selectedOrder.set(order);
    this.userRole.set(order.user.role || '');
    this.showCompleteModal.set(true);

    // Initialize quantities for customer orders
    if (order.user.role === 'customer' && order.items) {
      const initialQuantities: Record<string, QuantityItem> = {};
      const locale = this.translation.getLocale();

      order.items.forEach((item) => {
        const correctUnit = item.measurement_unit === 1 ? 'kg' : (this.translation.t('common.piece') || 'piece');
        const isUnitMismatch = item.unit !== correctUnit;
        const itemName = typeof item.name === 'string' 
          ? item.name 
          : (item.name?.[locale] || item.name?.en || this.translation.t('common.item') || 'Item');

        initialQuantities[item._id] = {
          originalQuantity: item.quantity,
          actualQuantity: item.quantity,
          name: itemName,
          unit: correctUnit,
          measurement_unit: item.measurement_unit || 1,
          hasUnitMismatch: isUnitMismatch,
          originalUnit: item.unit || correctUnit,
          pointsPerUnit: item.points || 0,
          originalPoints: (item.points || 0) * item.quantity,
          currentPoints: (item.points || 0) * item.quantity
        };
      });

      this.quantities.set(initialQuantities);
      this.showQuantityForm.set(true);
    }
  }

  handleQuantityChange(itemId: string, value: string, measurementUnit: number): void {
    if (value === '') {
      this.quantities.update(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          actualQuantity: '',
          currentPoints: 0
        }
      }));
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    let adjustedQuantity: number;
    if (measurementUnit === 2) {
      adjustedQuantity = Math.max(0, Math.round(numericValue));
    } else {
      adjustedQuantity = Math.max(0, numericValue);
    }

    this.quantities.update(prev => {
      const item = prev[itemId];
      const newPoints = item.pointsPerUnit * adjustedQuantity;

      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          actualQuantity: adjustedQuantity,
          currentPoints: newPoints
        }
      };
    });
  }

  handlePhotoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        this.proofPhoto = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.photoPreview.set(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        this.toastr.error(this.translation.t('courier.pleaseSelectImage') !== 'courier.pleaseSelectImage' ? this.translation.t('courier.pleaseSelectImage') : 'Please select an image file');
      }
    }
  }

  completeOrderWithProof(): void {
    if (!this.proofPhoto) {
      this.toastr.error(this.translation.t('courier.uploadProofPhoto') !== 'courier.uploadProofPhoto' ? this.translation.t('courier.uploadProofPhoto') : 'Please upload a delivery proof photo');
      return;
    }

    const order = this.selectedOrder();
    if (!order) return;

    // Check if quantities have been reviewed for customer role
    if (this.userRole() === 'customer' && this.showQuantityForm()) {
      const hasChanges = Object.values(this.quantities()).some((item) => {
        const actualQty = item.actualQuantity === '' ? 0 : Number(item.actualQuantity);
        return item.originalQuantity !== actualQty;
      });

      if (hasChanges && !this.quantityNotes().trim()) {
        this.toastr.error(this.translation.t('courier.addQuantityNotes') !== 'courier.addQuantityNotes' ? this.translation.t('courier.addQuantityNotes') : 'Please add notes about the quantity changes');
        return;
      }

      const hasEmptyQuantities = Object.values(this.quantities()).some(
        (item) => item.actualQuantity === '' || item.actualQuantity === null || item.actualQuantity === undefined
      );

      if (hasEmptyQuantities) {
        this.toastr.error(this.translation.t('courier.enterActualQuantities') !== 'courier.enterActualQuantities' ? this.translation.t('courier.enterActualQuantities') : 'Please enter actual quantities for all items');
        return;
      }
    }

    // Validate estimated weight for customer orders
    if (this.userRole() === 'customer' && !this.notes().trim()) {
      this.toastr.error(this.translation.t('courier.enterEstimatedWeight') !== 'courier.enterEstimatedWeight' ? this.translation.t('courier.enterEstimatedWeight') : 'Please enter estimated weight');
      return;
    }

    this.completing.set(true);

    const formData = new FormData();
    formData.append('proofPhoto', this.proofPhoto);
    formData.append('notes', this.notes());

    // Add quantity data for customer orders
    if (this.userRole() === 'customer') {
      formData.append('updatedQuantities', JSON.stringify(this.quantities()));
      formData.append('quantityNotes', this.quantityNotes());
    }

    this.api.post(`/orders/${order._id}/complete-with-proof`, formData).subscribe({
      next: () => {
        this.toastr.success(this.translation.t('courier.orderCompletedSuccessfully') !== 'courier.orderCompletedSuccessfully' ? this.translation.t('courier.orderCompletedSuccessfully') : 'Order completed successfully!');
        this.showCompleteModal.set(false);
        this.resetModal();
        this.loadOrders();

        const customerId = order.user?._id || (order.user as any)?.id || (order as any).userId;
        const userRole = order.user?.role || (order as any).userRole;
        

        if (customerId && userRole === 'customer') {
          console.log('🔄 Calling retroactive points for customer:', customerId);
          this.api.post<any>(`/users/${customerId}/points/retroactive`, {}).subscribe({
            next: (resp) => {
              try {
                console.log('📊 Retroactive points response:', resp);
                if (resp && resp.success) {
                  const ordersProcessed = resp.ordersProcessed || 0;
                  const pointsAdded = resp.pointsAdded || resp.totalPointsAdded || 0;
                  if (ordersProcessed > 0 || pointsAdded > 0) {
                    console.log(`✅ Points added: ${pointsAdded} points for ${ordersProcessed} order(s)`);
                    this.toastr.success(`Points added to customer account: ${pointsAdded} points`);
                  } else {
                    console.log('ℹ️ No points added (may already have points or no points to add)');
                  }
                }
              } catch (e) {
                console.warn('Retroactive points response handling failed', e);
              }
            },
            error: (error) => {
              console.error('❌ Failed to add retroactive points:', error);

            }
          });
        }
      },
      error: (err) => {
        console.error('Error completing order:', err);
        const errorMsg = err?.error?.message || this.translation.t('courier.errorCompletingOrder') || 'Error completing order';
        this.toastr.error(errorMsg);
        this.completing.set(false);
      }
    });
  }

  resetModal(): void {
    this.selectedOrder.set(null);
    this.proofPhoto = null;
    this.photoPreview.set('');
    this.notes.set('');
    this.quantities.set({});
    this.showQuantityForm.set(false);
    this.quantityNotes.set('');
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  closeCompleteModal(): void {
    this.showCompleteModal.set(false);
    this.resetModal();
  }

  getStatusBadge(status: string): string {
    const statusMap: Record<string, string> = {
      'assigntocourier': this.translation.t('courier.readyForDelivery') || 'Ready for Delivery',
      'completed': this.translation.t('courier.status.completed') || 'Completed',
      'pending': this.translation.t('courier.status.pending') || 'Pending',
      'cancelled': this.translation.t('courier.status.cancelled') || 'Cancelled'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'assigntocourier': 'bg-blue-100',
      'completed': 'bg-green-100',
      'pending': 'bg-yellow-100',
      'cancelled': 'bg-red-100'
    };
    return statusClasses[status] || 'bg-gray-100';
  }

  getUserImage(): string | undefined {
    const userData = this.user();
    if (!userData) return undefined;
    
    // Use imgUrl first (like in customer/buyer profile), then fallback to deliveryImage
    const imageUrl = userData.imgUrl || userData.attachments?.deliveryImage;
    
    // Reset error when image URL changes
    if (imageUrl && this.imageError()) {
      this.imageError.set(false);
    }
    
    return imageUrl || undefined;
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }


  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  toggleLanguage(): void {
    const currentLang = this.translation.getLocale();
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    this.translation.setLocale(newLang);
  }

  getCurrentLanguage(): string {
    return this.translation.getLocale();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const locale = this.getCurrentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const locale = this.getCurrentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getItemName(item: any): string {
    const locale = this.getCurrentLanguage();
    if (typeof item.name === 'string') return item.name;
    return item.name?.[locale] || item.name?.en || this.translation.t('common.item') || 'Item';
  }

  hasQuantityChanges(): boolean {
    return Object.values(this.quantities()).some((item) => {
      const actualQty = item.actualQuantity === '' ? 0 : Number(item.actualQuantity);
      return item.originalQuantity !== actualQty;
    });
  }

  calculateDifference(original: number, actual: number | string, measurementUnit: number): string {
    const actualNum = typeof actual === 'string' ? parseFloat(actual) : actual;
    if (isNaN(actualNum)) return '0';
    const diff = actualNum - original;
    if (measurementUnit === 2) {
      return Math.round(diff).toString();
    }
    return diff.toFixed(1);
  }

  getFilteredOrders(): DeliveryOrder[] {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.orders();
    
    return this.orders().filter(order => {
      const userName = (order.user?.userName || order.user?.name || '').toLowerCase();
      const email = (order.user?.email || '').toLowerCase();
      const status = (order.status || '').toLowerCase();
      return userName.includes(term) || email.includes(term) || status.includes(term);
    });
  }

  getActionButtonText(order: DeliveryOrder): string {

    const userRole = order.user?.role;
    console.log('🔍 getActionButtonText - Order:', order._id, 'User Role:', userRole);

    if (userRole === 'customer') {
      return this.translation.t('courier.collect') || 'Collect';
    }
 
    return this.translation.t('courier.deliver') || 'Deliver';
  }


  getOrderTotalPoints(order: DeliveryOrder): number {
    if (!order.items || order.items.length === 0) return 0;
    return order.items.reduce((total, item) => {
      const itemPoints = (item.points || 0) * (item.quantity || 0);
      return total + itemPoints;
    }, 0);
  }


  getTotalPointsFromQuantities(): number {
    return Object.values(this.quantities()).reduce((total, item) => {
      const actualQty = item.actualQuantity === '' ? 0 : Number(item.actualQuantity);
      return total + (item.pointsPerUnit * actualQty);
    }, 0);
  }

  getOriginalTotalPoints(): number {
    return Object.values(this.quantities()).reduce((total, item) => {
      return total + item.originalPoints;
    }, 0);
  }

  togglePopup(): void {
    const newState = !this.showPopup();
    this.showPopup.set(newState);
    
    if (newState && this.dropdownRef) {
   
      setTimeout(() => {
        this.positionDropdown();
      }, 0);
    }
  }

  positionDropdown(): void {
    if (!this.dropdownRef) return;
    
    const avatarButton = this.dropdownRef.nativeElement.querySelector('.avatar-button');
    const dropdown = this.dropdownRef.nativeElement.querySelector('.dropdown-menu');
    
    if (!avatarButton || !dropdown) return;
    
    const rect = avatarButton.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 12}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;
  }

  goToProfile(): void {
    this.showPopup.set(false);
    this.router.navigate(['/deliveryprofile']);
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
}


