import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api';
import { TranslationService } from '../../../../core/services/translation.service';

export interface Review {
  orderId: string;
  stars: number;
  comment: string;
  reviewedAt: string;
  courier: {
    id: string;
    name: string;
  };
  orderDate: string;
  itemCount?: number;
}

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

@Component({
  selector: 'app-reviews-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reviews-tab.html',
  styleUrls: ['./reviews-tab.scss']
})
export class ReviewsTabComponent implements OnInit {
  @Input() userReviews: Review[] = [];
  @Input() isLoading: boolean = false;
  @Output() editReview = new EventEmitter<ReviewableOrder>();
  @Output() deleteReview = new EventEmitter<string>();

  deletingReviewId: string | null = null;

  constructor(public translation: TranslationService) {}

  ngOnInit(): void {}

  createMockOrderFromReview(review: Review): ReviewableOrder {
    return {
      _id: review.orderId,
      createdAt: review.orderDate || review.reviewedAt,
      items: new Array(review.itemCount || 0).fill({}),
      courier: {
        _id: review.courier.id,
        name: review.courier.name,
      },
      address: {},
      status: 'completed',
    };
  }

  onEditReview(review: Review): void {
    this.editReview.emit(this.createMockOrderFromReview(review));
  }

  onDeleteReview(review: Review): void {
    if (confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      this.deletingReviewId = review.orderId;
      this.deleteReview.emit(review.orderId);
      // Reset after a delay
      setTimeout(() => {
        this.deletingReviewId = null;
      }, 1000);
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getOrderId(orderId: string): string {
    return orderId.slice(-8).toUpperCase();
  }
}

