import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SystemService } from '../../core/services/system.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CreateSystemRequest, System } from '../../core/models/system.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingBlockComponent } from '../../shared/components/loading-block/loading-block.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SystemRolesPanelComponent } from './system-roles-panel.component';

const PAGE_SIZE = 20;
// Tamanho de página usado para varrer a lista completa (o backend só pagina, não filtra).
const FETCH_PAGE_SIZE = 200;

type StatusFilter = 'all' | '1' | '0';

/** Estrutura mínima de uma resposta paginada, usada pelo fetchAll genérico. */
interface Paginated<T> {
  data: T[];
  total?: number | null;
}

@Component({
  selector: 'app-systems',
  imports: [
    FormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingBlockComponent,
    PaginationComponent,
    SystemRolesPanelComponent,
  ],
  templateUrl: './systems.component.html',
})
export class SystemsComponent implements OnInit {
  private readonly systemService = inject(SystemService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  private readonly allSystems = signal<System[]>([]);
  protected readonly visibleRows = signal<System[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  protected readonly loading = signal(true);
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);
  protected readonly expandedSystemId = signal<string | null>(null);

  // Filtros
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly hasActiveFilters = computed(
    () => this.search().trim() !== '' || this.statusFilter() !== 'all',
  );

  form: CreateSystemRequest = { nome: '', descricao: '', url: '' };

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.allSystems.set(await this.fetchAll((p, l) => this.systemService.findAll(p, l)));
      this.applyFilters();
    } catch (err) {
      this.toast.apiError('Não foi possível carregar os sistemas', err);
    } finally {
      this.loading.set(false);
    }
  }

  /** Varre todas as páginas de um endpoint paginado (page/limit) e junta o resultado. */
  private async fetchAll<T>(
    fetchPage: (page: number, limit: number) => Observable<Paginated<T>>,
  ): Promise<T[]> {
    const first = await firstValueFrom(fetchPage(1, FETCH_PAGE_SIZE));
    // Ajuste o campo conforme o seu PaginatedResult (total / totalItems / meta.total…).
    const total = first.total ?? first.data.length;
    const all = [...first.data];
    const pages = Math.ceil(total / FETCH_PAGE_SIZE);
    for (let p = 2; p <= pages; p++) {
      const next = await firstValueFrom(fetchPage(p, FETCH_PAGE_SIZE));
      all.push(...next.data);
    }
    return all;
  }

  applyFilters(): void {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();

    let list = this.allSystems();

    if (term) {
      list = list.filter(
        (s) =>
          s.nome?.toLowerCase().includes(term) ||
          s.descricao?.toLowerCase().includes(term) ||
          s.url?.toLowerCase().includes(term),
      );
    }

    if (status !== 'all') {
      const value = Number(status);
      list = list.filter((s) => s.status === value);
    }

    this.total.set(list.length);

    // Reposiciona a página caso o filtro reduza o total abaixo da página atual.
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (this.page() > pages) this.page.set(pages);

    const start = (this.page() - 1) * PAGE_SIZE;
    this.visibleRows.set(list.slice(start, start + PAGE_SIZE));
  }

  onSearchChange(term: string): void {
    this.search.set(term);
    this.page.set(1);
    this.applyFilters();
  }

  onStatusChange(value: StatusFilter): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.applyFilters();
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.page.set(1);
    this.applyFilters();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.applyFilters();
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
