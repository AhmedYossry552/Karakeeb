import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '../../../../core/services/ewallet.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-transactions-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transactions-modal.html',
  styleUrls: ['./transactions-modal.scss']
})
export class TransactionsModalComponent {
  @Input() show = false;
  @Input() transactions: Transaction[] = [];
  @Output() close = new EventEmitter<void>();

  currentPage = signal(0);
  itemsPerPage = 5;

  constructor(public translation: TranslationService) {}

  get paginatedTransactions(): Transaction[] {
    const start = this.currentPage() * this.itemsPerPage;
    return this.transactions.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.transactions.length / this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages - 1) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
    }
  }

  getTransactionTypeLabel(type: string): string {
    const key = `ewallet.transactions.types.${type}`;
    return this.translation.t(key) || type;
  }

  getTransactionIcon(type: string): string {
    const icons: Record<string, string> = {
      cashback: '💰',
      withdrawal: '📤',
      deposit: '📥',
      recycle: '♻️',
      redeem: '🎁',
      purchase: '🛒'
    };
    return icons[type] || '💳';
  }
}

