import { Component, input } from '@angular/core';

/** Badge Ativo/Inativo a partir da convenção `status: 1 | 0` usada em toda a API. */
@Component({
  selector: 'app-status-badge',
  imports: [],
  template: `
    <span class="badge" [class.bg-success]="status() === 1" [class.bg-secondary]="status() !== 1">
      <i class="bi" [class.bi-check-circle]="status() === 1" [class.bi-slash-circle]="status() !== 1"></i>
      {{ status() === 1 ? (activeLabel() ?? 'Ativo') : (inactiveLabel() ?? 'Inativo') }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<number>();
  readonly activeLabel = input<string>();
  readonly inactiveLabel = input<string>();
}
