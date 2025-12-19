import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStar, faX, faPaperPlane, faBox, faUser, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { ApiService } from '../../../../core/services/api';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';

export interface ReviewableOrder {
  _id: string;
  createdAt: string;
  items: any[];
  courier?: {
    _id: string;
    name: string;
  };
  address: any;
  status: string;
}

export interface ExistingReview {
  rating: number;
  comments: string;
  orderId?: string;
}

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './review-modal.html',
  styleUrls: ['./review-modal.scss']
})
export class ReviewModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() orderId: string = '';
  @Input() orderInfo?: ReviewableOrder;
  @Input() existingReview?: ExistingReview | null;
  @Output() close = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<any>();

  rating = signal<number>(0);
  comments = signal<string>('');
  loading = signal<boolean>(false);
  submissionAttempted = signal<boolean>(false);

  // Icons
  faStar = faStar;
  faX = faX;
  faPaperPlane = faPaperPlane;
  faBox = faBox;
  faUser = faUser;
  faCalendar = faCalendar;

  constructor(
    private api: ApiService,
    public translation: TranslationService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.isOpen) {
      this.resetForm();
    }
  }

  ngOnChanges(): void {
    if (this.isOpen) {
      this.resetForm();
    }
  }

  resetForm(): void {
    if (this.existingReview) {
      this.rating.set(this.existingReview.rating || 0);
      this.comments.set(this.existingReview.comments || '');
    } else {
      this.rating.set(0);
      this.comments.set('');
    }
    this.submissionAttempted.set(false);
  }

  setRating(value: number): void {
    this.rating.set(value);
    this.submissionAttempted.set(false);
  }

  onCommentsChange(value: string): void {
    this.comments.set(value);
  }

  getRatingLabel(): string {
    const rating = this.rating();
    if (rating === 5) return 'Excellent!';
    if (rating === 4) return 'Great!';
    if (rating === 3) return 'Good';
    if (rating === 2) return 'Fair';
    if (rating === 1) return 'Needs improvement';
    return '';
  }

  getOrderNumber(): string {
    if (this.orderInfo?._id) {
      return this.orderInfo._id.slice(-8).toUpperCase();
    }
    return this.orderId.slice(-8).toUpperCase();
  }

  getItemCount(): number {
    return this.orderInfo?.items?.length || 0;
  }

  getCourierName(): string {
    return this.orderInfo?.courier?.name || '';
  }

  getOrderDate(): string {
    if (this.orderInfo?.createdAt) {
      return new Date(this.orderInfo.createdAt).toLocaleDateString();
    }
    return '';
  }

  handleClose(): void {
    if (!this.loading()) {
      this.close.emit();
    }
  }

  async handleSubmit(): Promise<void> {
    const currentRating = this.rating();
    
    if (currentRating === 0) {
      this.submissionAttempted.set(true);
      this.toastr.error(
        this.translation.t('profile.reviews.selectRating') || 'Please select a rating'
      );
      return;
    }

    this.loading.set(true);
    this.submissionAttempted.set(true);

    try {
      // Validate rating
      if (currentRating < 1 || currentRating > 5) {
        throw new Error('Invalid rating value');
      }

      // Validate comments length
      const commentsValue = this.comments().trim();
      if (commentsValue.length > 1000) {
        throw new Error('Comments are too long (max 1000 characters)');
      }

      console.log('Submitting review:', {
        rating: currentRating,
        comments: commentsValue,
        orderId: this.orderId,
      });

      // Use the correct endpoint and method
      const endpoint = `/orders/${this.orderId}/review`;
      const method = this.existingReview ? 'put' : 'post';

      const reviewData = {
        rating: currentRating,
        comments: commentsValue,
      };

      let response: any;
      if (method === 'post') {
        response = await this.api.post<any>(endpoint, reviewData).toPromise();
      } else {
        response = await this.api.put<any>(endpoint, reviewData).toPromise();
      }

      if (response && (response.success || response.status === 200 || response.status === 201)) {
        this.toastr.success(
          this.existingReview
            ? (this.translation.t('Review Updated Successfully') || 'Review Updated Successfully')
            : (this.translation.t('Thank you for your feedback!') || 'Thank you for your feedback!')
        );

        // Create the review object to pass back to parent
        const submittedReview = {
          orderId: this.orderId,
          rating: currentRating,
          comments: commentsValue,
          ...response.data?.data,
          id: response.data?.data?.id || response.data?.data?._id,
          createdAt: response.data?.data?.createdAt || new Date().toISOString(),
          updatedAt: response.data?.data?.updatedAt || new Date().toISOString(),
        };

        // Pass the review data back to the parent component
        this.submitted.emit(submittedReview);
        this.handleClose();
      } else {
        throw new Error('Review submission failed');
      }
    } catch (error: any) {
      console.error('Review submission error:', error);

      // Handle specific error cases
      if (error.status === 404) {
        this.toastr.error(
          this.translation.t('Order Not Found') || 'Order Not Found'
        );
      } else if (error.status === 400) {
        this.toastr.error(
          this.translation.t('Invalid Review Data') || 'Invalid Review Data'
        );
      } else if (error.status === 409) {
        this.toastr.error(
          this.translation.t('Review Already Submitted') || 'Review Already Submitted'
        );
      } else if (error.status >= 500) {
        this.toastr.error(
          this.translation.t('Server Error') || 'Server Error'
        );
      } else if (error.error?.message) {
        this.toastr.error(error.error.message);
      } else {
        this.toastr.error(
          this.translation.t('Failed to Submit Review') || 'Failed to Submit Review'
        );
      }
    } finally {
      this.loading.set(false);
    }
  }
}

