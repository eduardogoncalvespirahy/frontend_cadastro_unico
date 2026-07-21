import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SyncLogService } from '../../core/services/sync-log.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { SyncLogRecord } from '../../core/models/sync-log.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingBlockComponent } from '../../shared/components/loading-block/loading-block.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-sync-logs',
  imports: [DatePipe, PageHeaderComponent, EmptyStateComponent, LoadingBlockComponent, PaginationComponent],
  templateUrl: './sync-logs.component.html',
})
export class SyncLogsComponent implements OnInit {
  private readonly syncLogService = inject(SyncLogService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly logs = signal<SyncLogRecord[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.syncLogService.findAll(this.page(), PAGE_SIZE));
      this.logs.set(result.data);
      this.totalPages.set(result.totalPages ?? 1);
      this.total.set(result.total);
    } catch (err) {
      this.toast.apiError('Não foi possível carregar o histórico de sincronização', err);
    } finally {
      this.loading.set(false);
    }
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  async remove(log: SyncLogRecord): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Excluir registro',
      message: 'Excluir este registro de sincronização do histórico?',
      confirmText: 'Excluir',
    });
    if (!ok) return;

    this.syncLogService.delete(log.id).subscribe({
      next: () => {
        this.toast.success('Registro excluído');
        this.load();
      },
      error: (err) => this.toast.apiError('Não foi possível excluir o registro', err),
    });
  }
}
