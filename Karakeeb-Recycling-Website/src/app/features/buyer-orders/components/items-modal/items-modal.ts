import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';
import { OrderItem } from '../../../../core/services/orders.service';
import { getPriceWithMarkup } from '../../../../core/utils/price.utils';

@Component({
  selector: 'app-items-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './items-modal.html',
  styleUrls: ['./items-modal.scss']
})
export class ItemsModalComponent {
  @Input() show = false;
  @Input() items: OrderItem[] = [];
  @Input() userRole?: string;
  @Output() close = new EventEmitter<void>();

  constructor(public translation: TranslationService) {}

  onClose(): void {
    this.close.emit();
  }

  getItemName(item: OrderItem): string {
    if (typeof item.name === 'string') return item.name;
    const locale = this.translation.getLocale();
    return locale === 'ar' ? item.name.ar : item.name.en;
  }

  getTotalQuantity(): number {
    return this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  getItemPrice(item: OrderItem): number {
    // Apply markup for buyers to match marketplace prices
    return getPriceWithMarkup(item.price || 0, this.userRole);
  }

  getTotalPrice(): number {
    return this.items.reduce((sum, item) => {
      const itemPrice = this.getItemPrice(item);
      return sum + itemPrice * (item.quantity || 0);
    }, 0);
  }

  getTotalPoints(): number {
    return this.items.reduce((sum, item) => sum + (item.points || 0) * (item.quantity || 0), 0);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #e5e7eb, #d1d5db); border-radius: 0.75rem;">
          <svg style="width: 2rem; height: 2rem; color: #9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0H4m16 0l-2-2m-14 2l2-2" />
          </svg>
        </div>
      `;
    }
  }
}

