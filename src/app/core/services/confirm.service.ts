import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Dialogo de confirmação assíncrono (substitui `window.confirm`). Renderizado
 * uma única vez em ConfirmDialogComponent, no shell do app.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly requestSignal = signal<ConfirmRequest | null>(null);
  readonly request = this.requestSignal.asReadonly();

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.requestSignal.set({ ...options, resolve });
    });
  }

  resolve(value: boolean): void {
    this.requestSignal()?.resolve(value);
    this.requestSignal.set(null);
  }
}
