import { Component, computed, input, output } from '@angular/core';

/** Paginador genérico dirigido pelo envelope PaginatedResult (page/totalPages/total). */
@Component({
  selector: 'app-pagination',
  imports: [],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input<number | null>(null);
  readonly total = input<number | null>(null);
  readonly pageChange = output<number>();

  protected readonly pages = computed(() => {
    const total = this.totalPages() ?? 1;
    const current = this.page();
    const windowSize = 5;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    const end = Math.min(total, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
  });

  goTo(page: number): void {
    const total = this.totalPages() ?? 1;
    if (page < 1 || page > total || page === this.page()) return;
    this.pageChange.emit(page);
  }
}
