import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SystemService } from '../../core/services/system.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CreateSystemRequest, System } from '../../core/models/system.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingBlockComponent } from '../../shared/components/loading-block/loading-block.component';
import { SystemRolesPanelComponent } from './system-roles-panel.component';

@Component({
  selector: 'app-systems',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent, LoadingBlockComponent, SystemRolesPanelComponent],
  templateUrl: './systems.component.html',
})
export class SystemsComponent implements OnInit {
  private readonly systemService = inject(SystemService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  protected readonly systems = signal<System[]>([]);
  protected readonly loading = signal(true);
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);
  protected readonly expandedSystemId = signal<string | null>(null);

  form: CreateSystemRequest = { nome: '', descricao: '', url: '' };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.systemService.findAll(1, 200).subscribe({
      next: (result) => {
        this.systems.set(result.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.apiError('Não foi possível carregar os sistemas', err);
      },
    });
  }

  toggleExpand(systemId: string): void {
    this.expandedSystemId.set(this.expandedSystemId() === systemId ? null : systemId);
  }

  openForm(): void {
    this.form = { nome: '', descricao: '', url: '' };
    this.showForm.set(true);
  }

  save(): void {
    if (!this.form.nome.trim()) {
      this.toast.error('Informe o nome do sistema.');
      return;
    }
    this.saving.set(true);
    this.systemService.create(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success('Sistema cadastrado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.apiError('Não foi possível cadastrar o sistema', err);
      },
    });
  }

  toggleStatus(system: System): void {
    const status = system.status === 1 ? 0 : 1;
    this.systemService.update(system.id, { status }).subscribe({
      next: () => {
        this.toast.success(status === 1 ? 'Sistema ativado' : 'Sistema desativado');
        this.load();
      },
      error: (err) => this.toast.apiError('Não foi possível atualizar o sistema', err),
    });
  }

  async remove(system: System): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remover sistema',
      message: `Remover o sistema "${system.nome}"? Isso só é possível se não houver papéis ou credenciais vinculadas.`,
      confirmText: 'Remover',
    });
    if (!ok) return;

    this.systemService.delete(system.id).subscribe({
      next: () => {
        this.toast.success('Sistema removido');
        this.load();
      },
      error: (err) => this.toast.apiError('Não foi possível remover o sistema', err),
    });
  }
}
