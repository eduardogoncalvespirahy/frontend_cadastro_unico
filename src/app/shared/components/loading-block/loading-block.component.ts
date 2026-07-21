import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-block',
  imports: [],
  template: `
    <div class="loading-block">
      <span class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
      <span>{{ label() }}</span>
    </div>
  `,
})
export class LoadingBlockComponent {
  readonly label = input('Carregando…');
}
