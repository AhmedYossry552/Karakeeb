import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-system-flow-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-flow-section.html',
  styleUrl: './system-flow-section.scss',
})
export class SystemFlowSection {
  customerSteps = [
    {
      step: 1,
      title: 'Sign Up',
      description: 'Create your account to start recycling',
      icon: 'user-plus'
    },
    {
      step: 2,
      title: 'Choose Categories',
      description: 'Select what you want to sell from our categories',
      icon: 'grid'
    },
    {
      step: 3,
      title: 'Place Order',
      description: 'Submit your recycling order',
      icon: 'shopping-bag'
    },
    {
      step: 4,
      title: 'Earn Points',
      description: 'Get points according to your order value',
      icon: 'coins'
    },
    {
      step: 5,
      title: 'Order Collected',
      description: 'Our delivery team collects your order',
      icon: 'truck'
    },
    {
      step: 6,
      title: 'Order Completed',
      description: 'Admin completes and verifies your order',
      icon: 'check-circle'
    },
    {
      step: 7,
      title: 'Redeem Points',
      description: 'Convert points to cash or vouchers',
      icon: 'gift'
    },
    {
      step: 8,
      title: 'Cash Out',
      description: 'Withdraw money from your wallet',
      icon: 'wallet'
    }
  ];

  buyerSteps = [
    {
      step: 1,
      title: 'Sign Up',
      description: 'Create your buyer account',
      icon: 'user-plus'
    },
    {
      step: 2,
      title: 'Browse Marketplace',
      description: 'Explore products in our marketplace',
      icon: 'store'
    },
    {
      step: 3,
      title: 'Place Order',
      description: 'Add items to cart and place your order',
      icon: 'shopping-cart'
    },
    {
      step: 4,
      title: 'Pay Cash or Card',
      description: 'Complete payment using your preferred method',
      icon: 'credit-card'
    },
    {
      step: 5,
      title: 'Order Delivered',
      description: 'Receive your order from our delivery team',
      icon: 'truck'
    }
  ];

  constructor(public translation: TranslationService) {}
}

