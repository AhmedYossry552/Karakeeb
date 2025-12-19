import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { CartItem } from '../../../../core/services/cart.service';
import { Address } from '../../../../core/services/address.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { getPriceWithMarkup } from '../../../../core/utils/price.utils';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review-form.html',
  styleUrls: ['./review-form.scss']
})
export class ReviewFormComponent {
  @Input() cartItems: CartItem[] = [];
  @Input() addressForm!: FormGroup;
  @Input() selectedAddress: Address | null = null;
  @Input() totalPrice = 0;
  @Input() deliveryFee = 0;
  @Input() totalAmount = 0;
  @Input() paymentMethod: string | null = null;
  @Input() userRole?: string;
  @Input() loading = false;
  @Output() back = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  showAddressDetails = signal(false);

  constructor(public translation: TranslationService) {}

  getItemName(item: CartItem): string {
    if (typeof item.name === 'string') return item.name;
    const locale = this.translation.getLocale();
    return locale === 'ar' ? item.name.ar : item.name.en;
  }

  getItemPrice(item: CartItem): number {
    // Price is already stored with markup for buyers, so return as-is
    return item.price;
  }

  getFormattedAddress(): string {
    // Prefer selected address if available, otherwise use form values
    if (this.selectedAddress) {
      const addr = this.selectedAddress;
      const street = addr.Street || addr.street || '';
      const building = addr.Building || addr.building || '';
      const floor = addr.Floor || addr.floor || '';
      const apartment = addr.Apartment || addr.apartment || '';
      const area = addr.Area || addr.area || '';
      const city = addr.City || addr.city || '';
      
      let formatted = `${street}, Bldg ${building}`;
      if (floor) formatted += `, Floor ${floor}`;
      if (apartment) formatted += `, Apt ${apartment}`;
      formatted += `, ${area}, ${city}`;
      return formatted;
    }
    
    const addr = this.addressForm?.value || {};
    return `${addr.street || ''}, Bldg ${addr.building || ''}, Floor ${addr.floor || ''}, ${addr.area || ''}, ${addr.city || ''}`;
  }

  toggleAddressDetails(): void {
    this.showAddressDetails.set(!this.showAddressDetails());
  }

  getFullAddressDetails(): string {
    if (!this.selectedAddress) return '';
    
    const addr = this.selectedAddress;
    const parts: string[] = [];
    
    if (addr.Street || addr.street) parts.push(`Street: ${addr.Street || addr.street}`);
    if (addr.Building || addr.building) parts.push(`Building: ${addr.Building || addr.building}`);
    if (addr.Floor || addr.floor) parts.push(`Floor: ${addr.Floor || addr.floor}`);
    if (addr.Apartment || addr.apartment) parts.push(`Apartment: ${addr.Apartment || addr.apartment}`);
    if (addr.Area || addr.area) parts.push(`Area: ${addr.Area || addr.area}`);
    if (addr.City || addr.city) parts.push(`City: ${addr.City || addr.city}`);
    if (addr.Landmark || addr.landmark) parts.push(`Landmark: ${addr.Landmark || addr.landmark}`);
    if (addr.Notes || addr.notes) parts.push(`Notes: ${addr.Notes || addr.notes}`);
    
    return parts.join('\n');
  }
}

