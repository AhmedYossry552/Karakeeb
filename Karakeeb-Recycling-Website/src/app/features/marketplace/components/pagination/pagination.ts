import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pagination } from '../../../../core/services/marketplace.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss'
})
export class PaginationComponent {
  @Input() pagination!: Pagination;
  @Output() pageChange = new EventEmitter<number>();

  constructor(public translation: TranslationService) {}

  get pages(): number[] {
    const total = this.pagination.totalPages;
    const current = this.pagination.currentPage;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(total);
      }
    }

    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages && page !== this.pagination.currentPage) {
      this.pageChange.emit(page);
    }
  }

  previousPage(): void {
    if (this.pagination.hasPreviousPage) {
      this.goToPage(this.pagination.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.pagination.hasNextPage) {
      this.goToPage(this.pagination.currentPage + 1);
    }
  }
}

