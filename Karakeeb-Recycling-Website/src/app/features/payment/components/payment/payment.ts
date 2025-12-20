import { Component, OnInit, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentService } from '../../../../core/services/payment.service';
import { CartService, CartItem } from '../../../../core/services/cart.service';
import { AuthService, User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ApiService } from '../../../../core/services/api';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../../environments/environment';

declare const Stripe: any;

interface CheckoutData {
  cart: CartItem[];
  selectedAddress: any;
  totalPrice: number;
  deliveryFee: number;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
  };
  paymentMethod?: string;
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment.html',
  styleUrls: ['./payment.scss']
})
export class PaymentComponent implements OnInit, AfterViewInit {
  checkoutData: CheckoutData | null = null;
  totalAmount = signal(0);
  deliveryFee = signal(0);
  loading = signal(false);
  errorMessage = signal('');
  user = signal<User | null>(null);
  paymentForm!: FormGroup;
  private stripe: any;
  private cardElement: any;

  private getUserId(): string | null {
    const currentUser: any = this.user();
    return (
      currentUser?._id ||
      currentUser?.id ||
      currentUser?.userId ||
      this.checkoutData?.user?.id ||
      null
    );
  }

  private requireLoggedIn(): void {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('User must be logged in to process payment');
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private cartService: CartService,
    private authService: AuthService,
    public translation: TranslationService,
    private api: ApiService,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    // Get total and deliveryFee from query params
    this.route.queryParams.subscribe(params => {
      this.totalAmount.set(parseFloat(params['total']) || 0);
      this.deliveryFee.set(parseFloat(params['deliveryFee']) || 0);
    });

    // Get checkout data from sessionStorage
    const storedData = sessionStorage.getItem('checkoutData');
    if (storedData) {
      try {
        this.checkoutData = JSON.parse(storedData);
      } catch (error) {
        console.error('Error parsing checkout data:', error);
        this.router.navigate(['/cart']);
      }
    } else {
      this.router.navigate(['/cart']);
    }

    this.authService.user$.subscribe(user => {
      this.user.set(user);
    });

    this.initPaymentForm();
  }

  ngAfterViewInit(): void {
    this.initStripe();
  }

  initPaymentForm(): void {
    this.paymentForm = this.fb.group({
      cardholderName: ['', Validators.required]
    });
  }

  private initStripe(): void {
    try {
      if (typeof Stripe === 'undefined') {
        console.error('Stripe.js is not loaded');
        return;
      }

      this.stripe = Stripe(environment.stripePublicKey);
      const elements = this.stripe.elements();
      this.cardElement = elements.create('card');
      this.cardElement.mount('#card-element');
    } catch (error) {
      console.error('Error initializing Stripe:', error);
    }
  }

  async processPayment(): Promise<void> {
    if (this.paymentForm.invalid || !this.checkoutData) {
      this.errorMessage.set('Please fill all payment fields correctly');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      this.requireLoggedIn();
      const user: any = this.user();
      const userId = this.getUserId();
      if (!userId) {
        throw new Error('User must be logged in to process payment');
      }

      // Step 1: Ensure Stripe customer exists (required by backend)
      try {
        await this.api.post(`/users/${userId}/stripe-customer`, {}).toPromise();
      } catch (stripeError: any) {
        console.error('Stripe customer creation error:', stripeError);
        // If it's a 400/500 error, throw it; 200/201 means success
        if (stripeError.status && stripeError.status >= 400) {
          const errorMsg = stripeError.error?.error || stripeError.error?.message || 'Failed to set up payment account. Please try again.';
          throw new Error(errorMsg);
        }
        // If no status, it might be a network error
        if (!stripeError.status) {
          throw new Error('Network error. Please check your connection and try again.');
        }
      }

      if (!this.stripe || !this.cardElement) {
        throw new Error('Payment form is not ready. Please refresh the page.');
      }

      // Step 2: Create payment intent
      const paymentIntent = await this.paymentService.createPaymentIntent(
        this.totalAmount(),
        'egp'
      ).toPromise();

      if (!paymentIntent?.clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      const clientSecret = paymentIntent.clientSecret;

      // Step 3: Confirm payment with Stripe.js
      const billingEmail = user?.email || this.checkoutData?.user?.email || '';
      const billingPhone = user?.phoneNumber || this.checkoutData?.user?.phoneNumber || '';
      const confirmation = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement,
          billing_details: {
            name: this.paymentForm.value.cardholderName,
            email: billingEmail,
            phone: billingPhone
          }
        }
      });

      if (confirmation.error) {
        throw new Error(confirmation.error.message || 'Payment confirmation failed');
      }

      const confirmedIntent = confirmation.paymentIntent;
      if (!confirmedIntent || confirmedIntent.status !== 'succeeded') {
        throw new Error('Payment was not completed. Please try again.');
      }

      const paymentIntentId = confirmedIntent.id;

      // Step 4: Create order after successful payment
      await this.createOrderAfterPayment(paymentIntentId);

    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMsg = error.error?.error || error.error?.message || error.message || 'Payment failed. Please try again.';
      this.errorMessage.set(errorMsg);
      this.loading.set(false);
    }
  }

  private async createOrderAfterPayment(paymentIntentId: string): Promise<void> {
    if (!this.checkoutData) return;

    try {
      this.requireLoggedIn();
    } catch {
      this.errorMessage.set('User not found. Please login again.');
      this.loading.set(false);
      return;
    }

    // Transform cart items to match order API format
    const orderItems = this.checkoutData.cart.map(item => ({
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

    try {
      // Get the saved address from checkout data (selected from user's saved addresses)
      const selectedAddress = this.checkoutData?.selectedAddress;
      const addressId = selectedAddress?.Id || selectedAddress?._id || selectedAddress?.id;

      if (!addressId) {
        this.errorMessage.set('Address not found. Please go back and select an address.');
        this.loading.set(false);
        return;
      }

      // Create the order with the address ID - backend will use items from user's cart
      const orderData = {
        AddressId: addressId,
        PaymentMethod: 'credit_card',
        DeliveryFee: this.deliveryFee()
      };

      const response: any = await this.api.post('/orders', orderData).toPromise();
      
      if (response.success || response.data) {
        const orderId = response.data?._id || response._id;
        
        // Payment is already confirmed by Stripe.js on frontend, so charge is created automatically
        // No need to call confirm endpoint - the charge will appear in Stripe and be fetched by /users/{id}/payments
        
        this.cartService.clearCart();
        sessionStorage.removeItem('checkoutData');
        this.toastr.success(
          this.translation.t('order.createdSucc') !== 'order.createdSucc' ? this.translation.t('order.createdSucc') : 'Order created successfully!',
          this.translation.t('pickup.success') !== 'pickup.success' ? this.translation.t('pickup.success') : 'Success'
        );
        
        // Refresh notifications to get the new order notification
        // The backend will send a notification via Socket.IO, but we also refresh to be sure
        setTimeout(() => {
          // This will be handled by Socket.IO, but we refresh as fallback
        }, 1000);
        
        this.router.navigate(['/payment/success'], {
          queryParams: {
            orderId,
            paymentIntentId,
            amount: this.totalAmount()
          }
        });
      } else {
        throw new Error('Order creation failed');
      }
    } catch (error: any) {
      console.error('Order creation error:', error);
      const errorMessage = error.error?.message || 
        'Order creation failed. Please contact support.';
      this.errorMessage.set(errorMessage);
      this.loading.set(false);
    }
  }

  get cartItems(): CartItem[] {
    return this.checkoutData?.cart || [];
  }

  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}

