import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, Order } from '../../../../core/services/admin.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ApiService } from '../../../../core/services/api';
import { CancelOrderModalComponent } from '../cancel-order-modal/cancel-order-modal';
import { CourierSelectionModalComponent, Courier } from '../courier-selection-modal/courier-selection-modal';
import { OrderDetailsModalComponent } from '../order-details-modal/order-details-modal';
import { UserDetailsModalComponent, UserDetails } from '../user-details-modal/user-details-modal';
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';

type UserRole = 'customer' | 'buyer';

@Component({
  selector: 'app-admin-pickups',
  standalone: true,
  imports: [CommonModule, CancelOrderModalComponent, CourierSelectionModalComponent, OrderDetailsModalComponent, UserDetailsModalComponent, ConfirmationDialogComponent],
  templateUrl: './admin-pickups.html',
  styleUrl: './admin-pickups.scss'
})
export class AdminPickupsComponent implements OnInit {
  orders = signal<Order[]>([]);
  isLoading = signal(false);
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalPages = signal(1);
  totalItems = signal(0);
  searchTerm = signal('');
  selectedStatus: string = '';
  activeTab = signal<UserRole>('customer');
  private searchSubject = new Subject<string>();

  // Modal states
  isCancelModalOpen = signal(false);
  isCourierModalOpen = signal(false);
  isOrderDetailsModalOpen = signal(false);
  isUserDetailsModalOpen = signal(false);
  isCompleteConfirmationOpen = signal(false);
  isDeliveryProofModalOpen = signal(false);
  isDeleteConfirmationOpen = signal(false);
  selectedOrderForCancel: Order | null = null;
  selectedOrderForCourier: Order | null = null;
  selectedOrderForDetails: Order | null = null;
  selectedUser: UserDetails | null = null;
  selectedOrderForComplete: Order | null = null;
  selectedOrderForProof: Order | null = null;
  selectedOrderForDelete: Order | null = null;
  pendingStatusChange: string | null = null;
  couriers = signal<Courier[]>([]);
  loadingCourierId: string | null = null;
  orderStatusMap = new Map<string, string>(); // Store original status for each order

  constructor(
    private adminService: AdminService,
    public translation: TranslationService,
    private toastr: ToastrService,
    private api: ApiService
  ) {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.currentPage.set(1);
      this.loadOrders();
    });
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    
    this.adminService.getOrders(
      this.currentPage(),
      this.itemsPerPage(),
      this.activeTab(),
      this.selectedStatus || undefined,
      undefined,
      this.searchTerm() || undefined
    ).subscribe({
      next: (response) => {
        console.log('📦 Admin Orders Response:', response);
        if (response.success && response.data) {
          const orders = response.data;
          // Log first order to see structure
          if (orders.length > 0) {
            console.log('📦 First Order:', orders[0]);
            console.log('📦 First Order User:', orders[0].user);
            console.log('📦 First Order User Keys:', orders[0].user ? Object.keys(orders[0].user) : 'No user');
          }
          this.orders.set(orders);
          this.totalPages.set(response.totalPages || 1);
          this.totalItems.set(response.totalOrders || 0);
        } else {
          this.orders.set([]);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        
        // Handle specific error cases
        if (error.status === 401) {
          this.toastr.error('Session expired. Please log in again.');
        } else if (error.status === 403) {
          this.toastr.error('Access denied. Admin privileges required.');
        } else if (error.status === 0) {
          this.toastr.error('Network error. Please check your connection.');
        } else {
          const errorMessage = error.error?.message || error.message || 'Failed to load orders';
          this.toastr.error(errorMessage);
        }
        
        this.isLoading.set(false);
      }
    });
  }

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadOrders();
  }

  onItemsPerPageChange(items: number): void {
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
    this.loadOrders();
  }

  onDelete(order: Order): void {
    this.selectedOrderForDelete = order;
    this.isDeleteConfirmationOpen.set(true);
  }

  handleDeleteConfirm(): void {
    if (!this.selectedOrderForDelete) return;

    this.adminService.deleteOrder(this.selectedOrderForDelete._id).subscribe({
      next: () => {
        this.toastr.success('Order deleted successfully');
        this.isDeleteConfirmationOpen.set(false);
        this.selectedOrderForDelete = null;
        this.loadOrders();
      },
      error: (error) => {
        console.error('Error deleting order:', error);
        this.toastr.error('Failed to delete order');
        this.isDeleteConfirmationOpen.set(false);
        this.selectedOrderForDelete = null;
      }
    });
  }

  handleDeleteCancel(): void {
    this.isDeleteConfirmationOpen.set(false);
    this.selectedOrderForDelete = null;
  }

  getDeleteMessage(): string {
    const orderId = this.selectedOrderForDelete?._id || '';
    return `Are you sure you want to delete order "${orderId}"? This action cannot be undone.`;
  }

  changeTab(tab: UserRole): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadOrders();
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.currentPage.set(1);
    this.loadOrders();
  }

  isOrderAssignedToCourier(order: Order): boolean {
    // Check if order has a courier assigned or status is assigntocourier
    return !!(order.courier || order.status?.toLowerCase() === 'assigntocourier');
  }

  updateStatus(order: Order, newStatus: string): void {
    const currentStatus = order.status?.toLowerCase() || '';
    
    // Allow collected -> completed transition even if courier is assigned
    const isCollectedToCompleted = currentStatus === 'collected' && newStatus === 'completed';
    
    // Prevent status change if order is assigned to courier (except collected -> completed)
    if (this.isOrderAssignedToCourier(order) && !isCollectedToCompleted) {
      this.toastr.warning('Cannot change status of order assigned to courier');
      // Revert the select dropdown to original status
      order.status = this.orderStatusMap.get(order._id) || order.status;
      return;
    }

    // Store original status in case we need to revert
    this.orderStatusMap.set(order._id, order.status);

    // If changing to cancelled, show cancel modal
    if (newStatus === 'cancelled') {
      this.selectedOrderForCancel = order;
      this.isCancelModalOpen.set(true);
      return;
    }

    // If changing to assign to courier, show courier selection modal
    if (newStatus === 'assigntocourier') {
      this.selectedOrderForCourier = order;
      this.loadCouriers();
      this.isCourierModalOpen.set(true);
      return;
    }

    // If changing from collected to completed, show confirmation dialog
    if (isCollectedToCompleted) {
      this.selectedOrderForComplete = order;
      this.pendingStatusChange = newStatus;
      // Debug: Log order data to see delivery proof structure
      console.log('📦 Order selected for completion:', order);
      console.log('📦 Order deliveryProof:', order.deliveryProof);
      console.log('📦 Order keys:', Object.keys(order));
      console.log('📦 Full order object:', JSON.stringify(order, null, 2));
      
      // If delivery proof is not in the order, try to fetch full order details
      if (!order.deliveryProof && !(order as any).proofPhoto && !(order as any).collectedProof) {
        console.log('📦 Delivery proof not found, fetching full order details...');
        this.adminService.getOrderById(order._id).subscribe({
          next: (response) => {
            const fullOrder = response.success && response.data ? response.data : (response as any);
            console.log('📦 Full order details fetched:', fullOrder);
            console.log('📦 Full order deliveryProof:', (fullOrder as any).deliveryProof);
            // Update the selected order with full details
            if (fullOrder) {
              this.selectedOrderForComplete = { ...order, ...fullOrder } as Order;
            }
            this.isCompleteConfirmationOpen.set(true);
          },
          error: (error) => {
            console.error('Error fetching full order details:', error);
            // Still show the dialog even if we can't fetch full details
            this.isCompleteConfirmationOpen.set(true);
          }
        });
      } else {
        this.isCompleteConfirmationOpen.set(true);
      }
      return;
    }

    // For other status changes, update directly
    this.adminService.updateOrderStatus(order._id, newStatus).subscribe({
      next: () => {
        this.toastr.success('Order status updated successfully');
        this.loadOrders();
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        this.toastr.error('Failed to update order status');
        // Revert the select dropdown to original status
        order.status = this.orderStatusMap.get(order._id) || order.status;
      }
    });
  }

  loadCouriers(): void {
    this.adminService.getCouriers().subscribe({
      next: (response) => {
        const couriersData = response?.data || response || [];
        this.couriers.set(couriersData);
      },
      error: (error) => {
        console.error('Error loading couriers:', error);
        this.toastr.error('Failed to load couriers');
        this.couriers.set([]);
      }
    });
  }

  handleCancelConfirm(reason: string): void {
    if (!this.selectedOrderForCancel) return;

    this.adminService.updateOrderStatus(this.selectedOrderForCancel._id, 'cancelled', reason).subscribe({
      next: () => {
        this.toastr.success('Order cancelled successfully');
        this.isCancelModalOpen.set(false);
        this.selectedOrderForCancel = null;
        this.loadOrders();
      },
      error: (error) => {
        console.error('Error cancelling order:', error);
        this.toastr.error('Failed to cancel order');
      }
    });
  }

  handleCancelClose(): void {
    // Revert the select dropdown to original status
    if (this.selectedOrderForCancel) {
      const originalStatus = this.orderStatusMap.get(this.selectedOrderForCancel._id);
      if (originalStatus) {
        this.selectedOrderForCancel.status = originalStatus;
      }
    }
    this.isCancelModalOpen.set(false);
    this.selectedOrderForCancel = null;
  }

  handleCourierSelect(courierId: string): void {
    if (!this.selectedOrderForCourier) return;

    const selectedCourier = this.couriers().find(c => c._id === courierId);
    if (!selectedCourier) {
      this.toastr.error('Selected courier not found');
      return;
    }

    // Check if courier is approved
    if (selectedCourier.attachments?.status !== 'approved' && selectedCourier.isApproved !== true) {
      this.toastr.error('Cannot assign order to non-approved courier');
      return;
    }

    this.loadingCourierId = courierId;
    this.adminService.assignCourier(this.selectedOrderForCourier._id, courierId).subscribe({
      next: () => {
        this.toastr.success('Order assigned to courier successfully');
        this.loadingCourierId = null;
        this.isCourierModalOpen.set(false);
        this.selectedOrderForCourier = null;
        this.loadOrders();
      },
      error: (error) => {
        console.error('Failed to assign courier:', error);
        this.toastr.error('Failed to assign courier to order');
        this.loadingCourierId = null;
      }
    });
  }

  handleCourierClose(): void {
    // Revert the select dropdown to original status
    if (this.selectedOrderForCourier) {
      const originalStatus = this.orderStatusMap.get(this.selectedOrderForCourier._id);
      if (originalStatus) {
        this.selectedOrderForCourier.status = originalStatus;
      }
    }
    this.isCourierModalOpen.set(false);
    this.selectedOrderForCourier = null;
    this.loadingCourierId = null;
  }

  getStatusClass(status: string): string {
    const statusLower = status?.toLowerCase() || 'pending';
    const classes: { [key: string]: string } = {
      pending: 'status-pending',
      assigntocourier: 'status-assigned',
      collected: 'status-collected',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return classes[statusLower] || 'status-pending';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  handleViewOrderDetails(order: Order): void {
    this.selectedOrderForDetails = order;
    this.isOrderDetailsModalOpen.set(true);
  }

  handleCloseOrderDetails(): void {
    this.isOrderDetailsModalOpen.set(false);
    this.selectedOrderForDetails = null;
  }

  handleViewUserDetails(order: Order): void {
    // Extract user data from order
    const userData: UserDetails = {
      _id: order.userId || undefined,
      name: order.userName || order.user?.name || order.user?.userName || 'Unknown',
      userName: order.userName || order.user?.userName || order.user?.name || 'Unknown',
      email: order.userEmail || order.user?.email || 'Not provided',
      phoneNumber: order.user?.phoneNumber || 'Not provided',
      role: order.userRole || order.user?.role || 'Unknown',
      imageUrl: order.user?.imageUrl,
      imgUrl: order.user?.imageUrl, // Use imageUrl as imgUrl since that's what the type has
      address: order.address
    };
    
    this.selectedUser = userData;
    this.isUserDetailsModalOpen.set(true);
  }

  handleCloseUserDetails(): void {
    this.isUserDetailsModalOpen.set(false);
    this.selectedUser = null;
  }

  handleCompleteConfirm(): void {
    if (!this.selectedOrderForComplete || !this.pendingStatusChange) return;

    const order = this.selectedOrderForComplete;
    const customerId = order.userId;

    // First update the order status
    this.adminService.updateOrderStatus(order._id, this.pendingStatusChange).subscribe({
      next: () => {
        this.toastr.success('Order status updated to completed successfully');
        
        // If order has a customer, add points for the completed order
        // IMPORTANT: Only add points for customers, not buyers
        const userRole = order.userRole || order.user?.role;
        if (customerId && userRole === 'customer') {
          console.log('🔄 Adding points for completed customer order...');
          console.log('📋 Order details:', { orderId: order._id, customerId, userRole });
          
          // Call retroactive points endpoint to ensure points are added
          this.api.post<any>(`/users/${customerId}/points/retroactive`, {}).subscribe({
            next: (response) => {
              console.log('📊 Retroactive points response:', response);
              if (response && response.success) {
                const ordersProcessed = response.ordersProcessed || 0;
                const pointsAdded = response.pointsAdded || response.totalPointsAdded || 0;
                if (ordersProcessed > 0 || pointsAdded > 0) {
                  console.log(`✅ Points added: ${pointsAdded} points for ${ordersProcessed} order(s)`);
                  this.toastr.success(`Points added to customer account: ${pointsAdded} points`);
                } else {
                  console.log('ℹ️ No points added (may already have points or no points to add)');
                  // Still show info that we attempted to add points
                  this.toastr.info('Points check completed. If points are missing, they may need to be added manually.');
                }
              } else {
                console.warn('⚠️ Retroactive points response was not successful:', response);
              }
            },
            error: (error) => {
              console.error('❌ Could not add points automatically:', error);
              console.error('❌ Error details:', {
                status: error.status,
                message: error.error?.message || error.message,
                url: error.url
              });
              // Show warning to admin that points might not be added
              this.toastr.warning('Could not automatically add points. Please verify points were added in customer profile.');
            }
          });
        } else {
          console.log('ℹ️ Skipping points addition - not a customer order:', { customerId, userRole });
        }
        
        this.isCompleteConfirmationOpen.set(false);
        this.selectedOrderForComplete = null;
        this.pendingStatusChange = null;
        this.loadOrders();
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        this.toastr.error('Failed to update order status');
        // Revert the select dropdown to original status
        if (this.selectedOrderForComplete) {
          this.selectedOrderForComplete.status = this.orderStatusMap.get(this.selectedOrderForComplete._id) || this.selectedOrderForComplete.status;
        }
        this.isCompleteConfirmationOpen.set(false);
        this.selectedOrderForComplete = null;
        this.pendingStatusChange = null;
      }
    });
  }

  handleCompleteCancel(): void {
    // Revert the select dropdown to original status
    if (this.selectedOrderForComplete) {
      const originalStatus = this.orderStatusMap.get(this.selectedOrderForComplete._id);
      if (originalStatus) {
        this.selectedOrderForComplete.status = originalStatus;
      }
    }
    this.isCompleteConfirmationOpen.set(false);
    this.selectedOrderForComplete = null;
    this.pendingStatusChange = null;
  }

  handleViewDeliveryProof(order: Order): void {
    this.selectedOrderForProof = order;
    console.log('📸 Viewing delivery proof for order:', order);
    console.log('📸 Order deliveryProof:', order.deliveryProof);
    
    // If delivery proof is not in the order, try to fetch full order details
    if (!order.deliveryProof && !(order as any).proofPhoto && !(order as any).collectedProof) {
      console.log('📦 Delivery proof not found, fetching full order details...');
      this.adminService.getOrderById(order._id).subscribe({
        next: (response) => {
          const fullOrder = response.success && response.data ? response.data : (response as any);
          console.log('📦 Full order details fetched:', fullOrder);
          console.log('📦 Full order deliveryProof:', (fullOrder as any).deliveryProof);
          // Update the selected order with full details
          if (fullOrder) {
            this.selectedOrderForProof = { ...order, ...fullOrder } as Order;
          }
          this.isDeliveryProofModalOpen.set(true);
        },
        error: (error) => {
          console.error('Error fetching full order details:', error);
          // Still show the modal even if we can't fetch full details
          this.isDeliveryProofModalOpen.set(true);
        }
      });
    } else {
      this.isDeliveryProofModalOpen.set(true);
    }
  }

  handleCloseDeliveryProof(): void {
    this.isDeliveryProofModalOpen.set(false);
    this.selectedOrderForProof = null;
  }

  hasDeliveryProof(order: Order | null): boolean {
    if (!order) return false;
    const proof = this.getDeliveryProof(order);
    return !!(proof && (proof.photoUrl || proof.notes));
  }

  getDeliveryProof(order: Order | null): any {
    if (!order) return null;
    
    // Try multiple possible field names for delivery proof
    const proof = order.deliveryProof || 
                  (order as any).proofPhoto || 
                  (order as any).collectedProof ||
                  (order as any).deliveryProofPhoto;
    
    // If proof is an object with photoUrl/notes, return it
    if (proof && typeof proof === 'object') {
      return {
        photoUrl: proof.photoUrl || proof.photo || proof.imageUrl || proof.image,
        notes: proof.notes || proof.weight || proof.comment
      };
    }
    
    // If proof is just a string (URL), wrap it
    if (typeof proof === 'string') {
      return { photoUrl: proof };
    }
    
    // Check if order has direct photoUrl/notes fields
    const directPhoto = (order as any).photoUrl || (order as any).proofPhotoUrl;
    const directNotes = (order as any).notes || (order as any).weight;
    
    if (directPhoto || directNotes) {
      return {
        photoUrl: directPhoto,
        notes: directNotes
      };
    }
    
    console.log('🔍 No delivery proof found in order:', order);
    return null;
  }
}
