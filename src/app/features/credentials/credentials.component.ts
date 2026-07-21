import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { CredentialService } from '../../core/services/credential.service';
import { CredentialRoleService } from '../../core/services/credential-role.service';
import { CredentialLocationService } from '../../core/services/credential-location.service';
import { UserService } from '../../core/services/user.service';
import { SystemService } from '../../core/services/system.service';
import { LocationService } from '../../core/services/location.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  Credential,
  CreateCredentialRequest,
  CredentialView,
} from '../../core/models/credential.model';
import { UserProfile } from '../../core/models/user-profile.model';
import { System } from '../../core/models/system.model';
import { Location } from '../../core/models/location.model';
import { SortState } from '../../core/models/sort.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SortHeaderComponent } from '../../shared/components/sort-header/sort-header.component';
import { CredentialRowComponent } from '../../shared/components/credential-row/credential-row.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingBlockComponent } from '../../shared/components/loading-block/loading-block.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

const PAGE_SIZE = 20;
// Tamanho de página usado para varrer listas completas (o backend só pagina, não filtra).
const FETCH_PAGE_SIZE = 200;

/** Estrutura mínima de uma resposta paginada, usada pelo fetchAll genérico. */
interface Paginated<T> {
  data: T[];
  total?: number | null;
}

@Component({
  selector: 'app-credentials',
  imports: [
    FormsModule,
    PageHeaderComponent,
    SortHeaderComponent,
    CredentialRowComponent,
    EmptyStateComponent,
    LoadingBlockComponent,
    PaginationComponent,
  ],
  templateUrl: './credentials.component.html',
})
export class CredentialsComponent implements OnInit {
  private readonly credentialService = inject(CredentialService);
  private readonly credentialRoleService = inject(CredentialRoleService);
  private readonly credentialLocationService = inject(CredentialLocationService);
  private readonly userService = inject(UserService);
  private readonly systemService = inject(SystemService);
  private readonly locationService = inject(LocationService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly rowsLoading = signal(false);
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);

  private readonly rawCredentials = signal<Credential[]>([]);
  protected readonly users = signal<UserProfile[]>([]);
  protected readonly systems = signal<System[]>([]);
  protected readonly allLocations = signal<Location[]>([]);

  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly filterSystemId = signal('');
  protected readonly filterUserId = signal('');
  protected readonly filterUserNome = signal<string | null>(null);
  protected readonly filterStatus = signal('');
  protected readonly sort = signal<SortState>({ key: 'usuario', dir: 'asc' });

  protected readonly visibleRows = signal<CredentialView[]>([]);
  protected readonly totalFiltered = signal(0);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalFiltered() / PAGE_SIZE)),
  );

  // Filtros de página (o filtro por usuário vem da rota e tem UI própria).
  protected readonly hasActiveFilters = computed(
    () => this.search().trim() !== '' || this.filterSystemId() !== '' || this.filterStatus() !== '',
  );

  form: CreateCredentialRequest = { userId: '', systemId: '', senha: '' };

  private usersById = new Map<string, UserProfile>();
  private systemsById = new Map<string, System>();

  async ngOnInit(): Promise<void> {
    const [users, systems, locations] = await Promise.all([
      this.fetchAll((p, l) => this.userService.findAllProfiles(p, l)).catch(() => [] as UserProfile[]),
      firstValueFrom(this.systemService.findAll(1, 200)).catch(() => ({ data: [] as System[] })),
      firstValueFrom(this.locationService.findAll(1, 200)).catch(() => ({
        data: [] as Location[],
      })),
    ]);

    this.users.set(users);
    this.systems.set(systems.data);
    this.allLocations.set(locations.data);
    this.usersById = new Map(users.map((u) => [u.userId, u]));
    this.systemsById = new Map(systems.data.map((s) => [s.id, s]));

    this.route.queryParamMap.subscribe((params) => {
      const userId = params.get('userId') ?? '';
      this.filterUserId.set(userId);
      this.filterUserNome.set(userId ? (this.usersById.get(userId)?.employeeNome ?? null) : null);
      this.page.set(1);
      this.reload();
    });
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

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      this.rawCredentials.set(await this.fetchAll((p, l) => this.credentialService.findAll(p, l)));
      await this.applyFilters();
    } catch (err) {
      this.toast.apiError('Não foi possível carregar as credenciais', err);
    } finally {
      this.loading.set(false);
    }
  }

  private baseView(c: Credential): CredentialView {
    const user = this.usersById.get(c.userId);
    const system = this.systemsById.get(c.systemId);
    return {
      ...c,
      userNome: user?.employeeNome ?? null,
      username: user?.userUsername ?? null,
      email: user?.userEmail ?? null,
      systemNome: system?.nome ?? null,
      roles: [],
      locations: [],
    };
  }

  async applyFilters(): Promise<void> {
    const term = this.search().trim().toLowerCase();
    const systemId = this.filterSystemId();
    const userId = this.filterUserId();
    const status = this.filterStatus();

    let list = this.rawCredentials().map((c) => this.baseView(c));

    if (systemId) list = list.filter((c) => c.systemId === systemId);
    if (userId) list = list.filter((c) => c.userId === userId);
    if (status !== '') list = list.filter((c) => String(c.status) === status);
    if (term) {
      list = list.filter(
        (c) =>
          c.userNome?.toLowerCase().includes(term) ||
          c.username?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term),
      );
    }

    const { key, dir } = this.sort();
    list.sort((a, b) => {
      const cmp = this.compareBySortKey(a, b, key);
      return dir === 'asc' ? cmp : -cmp;
    });

    this.totalFiltered.set(list.length);

    // Reposiciona a página caso o filtro reduza o total abaixo da página atual.
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (this.page() > pages) this.page.set(pages);

    const start = (this.page() - 1) * PAGE_SIZE;
    const pageSlice = list.slice(start, start + PAGE_SIZE);

    this.visibleRows.set(pageSlice);
    await this.enrichVisible(pageSlice);
  }

  private async enrichVisible(slice: CredentialView[]): Promise<void> {
    if (slice.length === 0) return;
    this.rowsLoading.set(true);
    try {
      const enriched = await Promise.all(
        slice.map(async (c) => {
          const [roles, locations] = await Promise.all([
            firstValueFrom(this.credentialRoleService.findRoleNamesByCredential(c.id)).catch(
              () => [],
            ),
            firstValueFrom(
              this.credentialLocationService.findLocationNamesByCredential(c.id),
            ).catch(() => []),
          ]);
          return { ...c, roles, locations };
        }),
      );
      this.visibleRows.set(enriched);
    } finally {
      this.rowsLoading.set(false);
    }
  }

  private compareBySortKey(a: CredentialView, b: CredentialView, key: string): number {
    switch (key) {
      case 'usuario':
        return (a.userNome ?? a.username ?? '').localeCompare(b.userNome ?? b.username ?? '');
      case 'sistema':
        return (a.systemNome ?? '').localeCompare(b.systemNome ?? '');
      case 'status':
        return a.status - b.status;
      case 'ultimoLogin':
        return new Date(a.dataUltimoLogin).getTime() - new Date(b.dataUltimoLogin).getTime();
      default:
        return 0;
    }
  }

  onFilterChange(): void {
    this.page.set(1);
    this.applyFilters();
  }

  onSort(sort: SortState): void {
    this.sort.set(sort);
    this.applyFilters();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.applyFilters();
  }

  clearFilters(): void {
    this.search.set('');
    this.filterSystemId.set('');
    this.filterStatus.set('');
    this.page.set(1);
    this.applyFilters();
  }

  clearUserFilter(): void {
    this.router.navigate(['/credenciais']);
  }

  openForm(): void {
    this.form = { userId: this.filterUserId() || '', systemId: '', senha: '' };
    this.showForm.set(true);
  }

  save(): void {
    if (!this.form.userId || !this.form.systemId || !this.form.senha) {
      this.toast.error('Preencha usuário, sistema e senha.');
      return;
    }
    this.saving.set(true);
    this.credentialService.create(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success('Credencial criada');
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.apiError('Não foi possível criar a credencial', err);
      },
    });
  }
}
