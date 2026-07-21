import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';
import { EmployerService } from '../../core/services/employer.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CreateLocationRequest, Location } from '../../core/models/location.model';
import { Employer } from '../../core/models/employer.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingBlockComponent } from '../../shared/components/loading-block/loading-block.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

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
  selector: 'app-locations',
  imports: [
    FormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingBlockComponent,
    PaginationComponent,
  ],
  templateUrl: './locations.component.html',
})
export class LocationsComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly employerService = inject(EmployerService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  private readonly allLocations = signal<Location[]>([]);
  protected readonly visibleRows = signal<Location[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  protected readonly employers = signal<Employer[]>([]);
  protected readonly loading = signal(true);
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);

  // Filtros
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly filterEmployerId = signal('');
  protected readonly hasActiveFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.statusFilter() !== 'all' ||
      this.filterEmployerId() !== '',
  );

  form: CreateLocationRequest = { employerId: '', nome: '', descricao: '' };

  private employersById = new Map<string, Employer>();

  async ngOnInit(): Promise<void> {
    const employers = await firstValueFrom(this.employerService.findAll()).catch(() => ({
      data: [] as Employer[],
    }));
    this.employers.set(employers.data);
    this.employersById = new Map(employers.data.map((e) => [e.id, e]));
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.allLocations.set(await this.fetchAll((p, l) => this.locationService.findAll(p, l)));
      this.applyFilters();
    } catch (err) {
      this.toast.apiError('Não foi possível carregar os locais', err);
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
    const employerId = this.filterEmployerId();

    let list = this.allLocations();

    if (term) {
      list = list.filter(
        (l) =>
          l.nome?.toLowerCase().includes(term) ||
          l.descricao?.toLowerCase().includes(term) ||
          this.employerName(l.employerId).toLowerCase().includes(term),
      );
    }

    if (status !== 'all') {
      const value = Number(status);
      list = list.filter((l) => l.status === value);
    }

    if (employerId) {
      list = list.filter((l) => l.employerId === employerId);
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

  onEmployerChange(value: string): void {
    this.filterEmployerId.set(value);
    this.page.set(1);
    this.applyFilters();
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.filterEmployerId.set('');
    this.page.set(1);
    this.applyFilters();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.applyFilters();
  }

  employerName(employerId: string): string {
    return this.employersById.get(employerId)?.tradingName ?? employerId;
  }

  openForm(): void {
    this.form = { employerId: this.employers()[0]?.id ?? '', nome: '', descricao: '' };
    this.showForm.set(true);
  }

  save(): void {
    if (!this.form.employerId || !this.form.nome.trim()) {
      this.toast.error('Selecione a empresa e informe o nome do local.');
      return;
    }
    this.saving.set(true);
    this.locationService.create(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success('Local cadastrado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.apiError('Não foi possível cadastrar o local', err);
      },
    });
  }

  async remove(location: Location): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remover local',
      message: `Remover o local "${location.nome}"?`,
      confirmText: 'Remover',
    });
    if (!ok) return;

    this.locationService.delete(location.id).subscribe({
      next: () => {
        this.toast.success('Local removido');
        this.load();
      },
      error: (err) => this.toast.apiError('Não foi possível remover o local', err),
    });
  }
}
