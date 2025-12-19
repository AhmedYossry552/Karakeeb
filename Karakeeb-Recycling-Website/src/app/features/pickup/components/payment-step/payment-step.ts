import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';

type PaymentMethod = 'cash' | 'credit_card';

@Component({
  selector: 'app-payment-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-step.html',
  styleUrls: ['./payment-step.scss']
})
export class PaymentStepComponent {
  @Input() selectedMethod: PaymentMethod | null = null;
  @Output() selectMethod = new EventEmitter<PaymentMethod>();
  @Output() back = new EventEmitter<void>();

  paymentMethods: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: 'cash', label: 'Cash on Delivery', icon: '💵' },
    { value: 'credit_card', label: 'Credit Card', icon: '💳' }
  ];

  constructor(public translation: TranslationService) {}

  onSelectMethod(method: PaymentMethod): void {
    this.selectMethod.emit(method);
  }

  onBack(): void {
    this.back.emit();
  }
}

