import { Component, input } from '@angular/core';

/** Cabeçalho padrão das páginas: título + subtítulo + slot de ações (botões). */
@Component({
  selector: 'app-page-header',
  imports: [],
  template: `
    <div class="page-header">
      <div>
        <h4 class="page-title">{{ title() }}</h4>
        @if (subtitle()) {
          <p class="page-subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header-actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
