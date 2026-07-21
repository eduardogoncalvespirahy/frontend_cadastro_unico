import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'danger' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

/** Fila de notificações toast exibidas no canto da tela (ver ToastContainerComponent). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly toastsSignal = signal<ToastMessage[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  show(kind: ToastKind, title: string, message?: string, timeoutMs = 5000): void {
    const toast: ToastMessage = { id: this.nextId++, kind, title, message };
    this.toastsSignal.update((list) => [...list, toast]);
    if (timeoutMs > 0) {
      setTimeout(() => this.dismiss(toast.id), timeoutMs);
    }
  }

  success(title: string, message?: string): void {
    this.show('success', title, message);
  }

  error(title: string, message?: string): void {
    this.show('danger', title, message, 8000);
  }

  info(title: string, message?: string): void {
    this.show('info', title, message);
  }

  /** Extrai a mensagem de erro do backend (`{ message }`) com um fallback amigável. */
  apiError(fallback: string, error: unknown): void {
    const message = (error as { error?: { message?: string } })?.error?.message ?? fallback;
    this.error('Ops, algo deu errado', message);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }
}
