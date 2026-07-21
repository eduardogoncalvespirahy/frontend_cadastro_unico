import { Component, OnChanges, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../core/services/role.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { Role } from '../../core/models/role.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-system-roles-panel',
  imports: [FormsModule, EmptyStateComponent],
  templateUrl: './system-roles-panel.component.html',
})
export class SystemRolesPanelComponent implements OnChanges {
  readonly systemId = input.required<string>();

  private readonly roleService = inject(RoleService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  protected readonly roles = signal<Role[]>([]);
  protected readonly loading = signal(true);
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);

  form = { nome: '', descricao: '' };

  ngOnChanges(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.roleService.findBySystem(this.systemId()).subscribe({
      next: (list) => {
        this.roles.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.apiError('Não foi possível carregar os papéis', err);
      },
    });
  }

  openForm(): void {
    this.form = { nome: '', descricao: '' };
    this.showForm.set(true);
  }

  save(): void {
    if (!this.form.nome.trim()) {
      this.toast.error('Informe o nome do papel.');
      return;
    }
    this.saving.set(true);
    this.roleService.create({ systemId: this.systemId(), ...this.form }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success('Papel criado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.apiError('Não foi possível criar o papel', err);
      },
    });
  }

  async remove(role: Role): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remover papel',
      message: `Remover o papel "${role.nome}"? Credenciais que o possuem perdem essa permissão.`,
      confirmText: 'Remover',
    });
    if (!ok) return;

    this.roleService.delete(role.id).subscribe({
      next: () => {
        this.toast.success('Papel removido');
        this.load();
      },
      error: (err) => this.toast.apiError('Não foi possível remover o papel', err),
    });
  }
}
