import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ModalService } from './core/services/modal.service';
import { ExitComponent } from './core/modals/exit/exit.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ToastContainerComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly modal = inject(ModalService);
  protected readonly auth = inject(AuthService);
  protected readonly sidebarOpen = signal(false);

  protected readonly initials = computed(() => {
    const name = this.auth.displayName();
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || '?'
    );
  });

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  async logout() {
    if (await this.sair()) {
      this.auth.logout();
    }
  }

  async sair(): Promise<boolean | undefined> {
    const ref = this.modal.openComponent(ExitComponent, {
      title: 'Sair do Sistema',
      centered: true,
      inputs: {
        message: 'Deseja realmente sair do sistema?',
        details: 'Sua sessão será encerrada e será necessário realizar login novamente.',
      },
      buttons: [
        {
          text: 'Cancelar',
          variant: 'secondary',
          value: false,
        },
        {
          text: 'Sair',
          variant: 'danger',
          value: true,
        },
      ],
    });

    const confirmed = await ref.result;

    return confirmed;
  }
}
