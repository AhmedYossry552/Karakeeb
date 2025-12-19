import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, User } from '../../../../core/services/auth.service';
import { CartService, CartItem } from '../../../../core/services/cart.service';
import { AddressService, Address } from '../../../../core/services/address.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ApiService } from '../../../../core/services/api';
import { AddressStepComponent } from '../address-step/address-step';
import { ReviewFormComponent } from '../review-form/review-form';
import { PaymentStepComponent } from '../payment-step/payment-step';
import { ToastrService } from 'ngx-toastr';

enum Steps {
  ADDRESS = 1,
  PAYMENT = 2,
  REVIEW = 3
}

type PaymentMethod = 'cash' | 'credit_card';

@Component({
  selector: 'app-pickup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AddressStepComponent,
    ReviewFormComponent,
    PaymentStepComponent
  ],
  templateUrl: './pickup.html',
  styleUrls: ['./pickup.scss']
})
export class PickupComponent implements OnInit {
  currentStep = signal<Steps>(Steps.ADDRESS);
  user = signal<User | null>(null);
  cartItems: CartItem[] = [];
  loading = signal(false);
  selectedPaymentMethod = signal<PaymentMethod | null>(null);
  selectedAddress = signal<Address | null>(null);
  addressForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cartService: CartService,
    private addressService: AddressService,
    public translation: TranslationService,
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user.set(user);
      if (user?.role === 'customer') {
        this.selectedPaymentMethod.set('cash');
      }
    });

    this.cartService.cart$.subscribe(cart => {
      this.cartItems = cart;
      if (cart.length === 0) {
        this.router.navigate(['/cart']);
      }
    });

    this.initAddressForm();
  }

  initAddressForm(): void {
    this.addressForm = this.fb.group({
      city: ['', Validators.required],
      area: ['', Validators.required],
      street: ['', Validators.required],
      building: ['', Validators.required],
      floor: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      apartment: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      landmark: [''],
      notes: ['']
    });
  }

  get totalPrice(): number {
    return this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get deliveryFee(): number {
    const city = this.addressForm.get('city')?.value;
    // Delivery fees based on city - you can move this to a constant file
    const fees: Record<string, number> = {
      'Cairo': 20,
      'Giza': 25,
      'Alexandria': 30,
      'Mansoura': 15,
      'Aswan': 35
    };
    return fees[city] || 0;
  }

  get totalAmount(): number {
    return this.user()?.role === 'buyer' ? this.totalPrice + this.deliveryFee : this.totalPrice;
  }

  onAddressNext(): void {
    if (this.addressForm.valid) {
      if (this.user()?.role === 'buyer') {
        this.currentStep.set(Steps.PAYMENT);
      } else {
        this.currentStep.set(Steps.REVIEW);
      }
    }
  }

  /**
   * Called when user selects a saved address
   */
  onAddressSelected(address: Address): void {
    console.log('📍 [Pickup] Address selected:', address);
    this.selectedAddress.set(address);
    
    // Populate the form with the selected address so it persists through the flow
    if (address) {
      this.addressForm.patchValue({
        city: address.City || address.city || '',
        area: address.Area || address.area || '',
        street: address.Street || address.street || '',
        building: address.Building || address.building || '',
        floor: address.Floor || address.floor || '',
        apartment: address.Apartment || address.apartment || '',
        landmark: address.Landmark || address.landmark || '',
        notes: address.Notes || address.notes || ''
      });
      // Mark form as valid since we have a saved address
      this.addressForm.markAllAsTouched();
    }
  }

  onPaymentNext(paymentMethod: PaymentMethod): void {
    this.selectedPaymentMethod.set(paymentMethod);
    this.currentStep.set(Steps.REVIEW);
  }

  onReviewBack(): void {
    if (this.user()?.role === 'buyer') {
      this.currentStep.set(Steps.PAYMENT);
    } else {
      this.currentStep.set(Steps.ADDRESS);
    }
  }

  onConfirmOrder(): void {
    if (!this.addressForm.valid) {
      this.toastr.error(this.translation.t('pickup.invalidAddress') !== 'pickup.invalidAddress' ? this.translation.t('pickup.invalidAddress') : 'Please fill all required address fields');
      return;
    }

    const user = this.user();
    if (!user) {
      this.toastr.error(this.translation.t('auth.login.required') !== 'auth.login.required' ? this.translation.t('auth.login.required') : 'Please login to continue');
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/pickup' } });
      return;
    }

    this.loading.set(true);

    const address = {
      City: this.addressForm.get('city')?.value,
      Area: this.addressForm.get('area')?.value,
      Street: this.addressForm.get('street')?.value,
      Building: this.addressForm.get('building')?.value,
      Floor: this.addressForm.get('floor')?.value,
      Apartment: this.addressForm.get('apartment')?.value,
      Landmark: this.addressForm.get('landmark')?.value || '',
      Notes: this.addressForm.get('notes')?.value || ''
    };

    // Transform cart items to match order API format
    const orderItems = this.cartItems.map(item => ({
      itemId: item._id,
      categoryId: item.categoryId,
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      price: item.price,
      points: item.points || 0,
      categoryName: item.categoryName,
      measurement_unit: item.measurement_unit
    }));

    const orderData = {
      items: orderItems,
      address,
      paymentMethod: this.selectedPaymentMethod() || 'cash',
      totalPrice: this.totalAmount,
      deliveryFee: user.role === 'buyer' ? this.deliveryFee : 0,
      subtotal: this.totalPrice,
      phoneNumber: user.phoneNumber,
      userName: user.name,
      email: user.email,
      userId: user._id
    };

    if (this.selectedPaymentMethod() === 'credit_card') {
      // Store order data and redirect to payment page
      sessionStorage.setItem('checkoutData', JSON.stringify({
        cart: this.cartItems,
        selectedAddress: this.selectedAddress(),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber
        },
        totalPrice: this.totalAmount,
        deliveryFee: this.deliveryFee
      }));
      this.router.navigate(['/payment'], {
        queryParams: {
          total: this.totalAmount,
          deliveryFee: this.deliveryFee
        }
      });
      this.loading.set(false);
      return;
    }

    // For cash/wallet: create order with saved address ID from database
    const selectedAddr = this.selectedAddress();
    if (!selectedAddr || (!selectedAddr.id && !selectedAddr.Id && !selectedAddr._id)) {
      this.toastr.error('Address not selected', this.translation.t('common.error') !== 'common.error' ? this.translation.t('common.error') : 'Error');
      this.loading.set(false);
      return;
    }

    const addressId = selectedAddr.id || selectedAddr.Id || selectedAddr._id;

    // Ensure cart is loaded from database before creating order
    // The backend needs cart items from the database
    console.log('💾 Loading cart from database to ensure it is up to date...');
    this.cartService.loadCart().then(() => {
      const dbCartItems = this.cartService.cart;
      console.log('📦 Cart items from database:', dbCartItems.length);
      
      if (dbCartItems.length === 0) {
        console.error('❌ Cart is empty in database! Cannot create order.');
        this.toastr.error(
          'Your cart is empty. Please add items to cart before creating an order.',
          this.translation.t('common.error') || 'Error'
        );
        this.loading.set(false);
        return;
      }

      // Create order with address ID - backend will use items from user's cart in database
      const orderPayload = {
        AddressId: addressId,
        PaymentMethod: this.selectedPaymentMethod() || 'cash',
        DeliveryFee: user.role === 'buyer' ? this.deliveryFee : 0
      };

      console.log('📦 Creating order with payload:', orderPayload);
      console.log('📦 Cart items count in DB:', dbCartItems.length);
      console.log('📦 Address ID:', addressId);
      console.log('📦 User ID:', user._id);
    
    this.api.post('/orders', orderPayload).subscribe({
      next: (response: any) => {
        console.log('✅ Order creation response:', response);
        this.loading.set(false);
        
        if (response.success || response.data) {
          const orderId = response.data?._id || response.data?.id || response._id;
          console.log('✅ Order created successfully with ID:', orderId);
          
          if (!orderId) {
            console.error('❌ Order ID is missing from response:', response);
            this.toastr.error(
              'Order created but ID is missing. Please check your profile.',
              this.translation.t('common.error') || 'Error'
            );
            // Still navigate but without orderId
            this.router.navigate(['/pickup/confirmation']);
            return;
          }
          
          this.cartService.clearCart();
          this.toastr.success(
            this.translation.t('pickup.orderCreated') !== 'pickup.orderCreated' ? this.translation.t('pickup.orderCreated') : 'Order created successfully',
            this.translation.t('pickup.success') !== 'pickup.success' ? this.translation.t('pickup.success') : 'Success'
          );
          // Navigate to confirmation page
          this.router.navigate(['/pickup/confirmation'], {
            queryParams: { orderId }
          });
        } else {
          console.error('❌ Order creation failed - no success or data in response:', response);
          this.toastr.error(
            this.translation.t('pickup.orderError') !== 'pickup.orderError' ? this.translation.t('pickup.orderError') : 'Failed to create order',
            this.translation.t('common.error') !== 'common.error' ? this.translation.t('common.error') : 'Error'
          );
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('❌ Error creating order:', error);
        console.error('❌ Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        
        const errorMessage = error.error?.message || 
          error.error?.error ||
          error.message ||
          this.translation.t('pickup.orderError') || 
          'Failed to create order. Please try again.';
        this.toastr.error(errorMessage, this.translation.t('common.error') !== 'common.error' ? this.translation.t('common.error') : 'Error');
      }
    });
    }).catch((error) => {
      console.error('❌ Failed to load cart from database:', error);
        this.toastr.error(
          'Failed to load cart. Please try again.',
          this.translation.t('common.error') !== 'common.error' ? this.translation.t('common.error') : 'Error'
        );
      this.loading.set(false);
    });
  }
}

