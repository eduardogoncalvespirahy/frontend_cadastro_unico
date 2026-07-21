import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  imports: [],
  template: `
    <div class="empty-state">
      <i class="bi" [class]="icon()"></i>
      <p class="mb-0">{{ message() }}</p>
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('bi-inbox');
  readonly message = input('Nada encontrado.');
}
