import { Component, input, output } from '@angular/core';
import { SortState } from '../../../core/models/sort.model';

@Component({
  selector: 'th[appSortHeader]',
  imports: [],
  template: `
    <span class="sort-header" (click)="onClick()">
      <ng-content></ng-content>
      <i class="bi sort-icon" [class]="iconClass()"></i>
    </span>
  `,
})
export class SortHeaderComponent {
  readonly key = input.required<string>({ alias: 'appSortHeader' });
  readonly sort = input<SortState | null>(null);
  readonly sortChange = output<SortState>();

  private isActive(): boolean {
    return this.sort()?.key === this.key();
  }

  iconClass(): string {
    if (!this.isActive()) return 'bi-arrow-down-up';
    return this.sort()?.dir === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  onClick(): void {
    const dir = this.isActive() && this.sort()?.dir === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ key: this.key(), dir });
  }
}
