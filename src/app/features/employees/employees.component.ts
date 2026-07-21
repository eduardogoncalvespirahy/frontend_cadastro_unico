import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeService } from '../../core/services/employee.service';
import { EmployerService } from '../../core/services/employer.service';
import { DepartmentService } from '../../core/services/department.service';
import { JobPositionService } from '../../core/services/job-position.service';
import { CostCenterService } from '../../core/services/cost-center.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { Employee } from '../../core/models/employee.model';
import { CreateUserRequest } from '../../core/models/user.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingBlockComponent } from '../../shared/components/loading-block/loading-block.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

const PAGE_SIZE = 20;
// Tamanho de página usado para varrer listas completas (o backend só pagina, não filtra).
const FETCH_PAGE_SIZE = 200;

type AccountFilter = 'all' | 'with' | 'without';

/** Estrutura mínima de uma resposta paginada, usada pelo fetchAll genérico. */
interface Paginated<T> {
  data: T[];
  total?: number | null;
}

@Component({
  selector: 'app-employees',
  imports: [DatePipe, FormsModule, PageHeaderComponent, EmptyStateComponent, LoadingBlockComponent, PaginationComponent],
  templateUrl: './employees.component.html',
})
export class EmployeesComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly employerService = inject(EmployerService);
  private readonly departmentService = inject(DepartmentService);
  private readonly jobPositionService = inject(JobPositionService);
  private readonly costCenterService = inject(CostCenterService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  private readonly allEmployees = signal<Employee[]>([]);
  protected readonly visibleRows = signal<Employee[]>([]);
  protected readonly totalFiltered = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalFiltered() / PAGE_SIZE)));
  protected readonly page = signal(1);

  // Filtros
  protected readonly search = signal('');
  protected readonly filterEmployerId = signal('');
  protected readonly filterDepartmentId = signal('');
  protected readonly accountFilter = signal<AccountFilter>('all');
  protected readonly hasActiveFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.filterEmployerId() !== '' ||
      this.filterDepartmentId() !== '' ||
      this.accountFilter() !== 'all',
  );

  // Listas para os dropdowns de filtro.
  protected readonly employersList = signal<{ id: string; name: string }[]>([]);
  protected readonly departmentsList = signal<{ id: string; name: string }[]>([]);

  private employerNames = new Map<string, string>();
  private departmentNames = new Map<string, string>();
  private jobPositionNames = new Map<string, string>();
  private costCenterNames = new Map<string, string>();
  private employeeIdsWithUser = new Set<string>();

  protected readonly creatingUserFor = signal<Employee | null>(null);
  protected readonly savingUser = signal(false);
  userForm: CreateUserRequest = { employeeId: '', username: '', email: '' };

  async ngOnInit(): Promise<void> {
    await this.loadLookups();
    await this.load();
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

  private async loadLookups(): Promise<void> {
    // employers/departments/jobPositions/costCenters usam findAll() sem paginação (retornam tudo).
    const [employers, departments, jobPositions, costCenters, users] = await Promise.all([
      firstValueFrom(this.employerService.findAll()).catch(() => ({ data: [] as { id: string; tradingName: string | null }[] })),
      firstValueFrom(this.departmentService.findAll()).catch(() => ({ data: [] as { id: string; name: string | null }[] })),
      firstValueFrom(this.jobPositionService.findAll()).catch(() => ({ data: [] as { id: string; name: string | null }[] })),
      firstValueFrom(this.costCenterService.findAll()).catch(() => ({ data: [] as { id: string; name: string | null }[] })),
      // Usuários podem passar de 1000 — varre até o fim para não perder o marcador "tem usuário".
      this.fetchAll<{ employeeId: string }>((p, l) => this.userService.findAll(p, l)).catch(() => [] as { employeeId: string }[]),
    ]);

    this.employerNames = new Map(employers.data.map((e) => [e.id, e.tradingName ?? e.id]));
    this.departmentNames = new Map(departments.data.map((d) => [d.id, d.name ?? d.id]));
    this.jobPositionNames = new Map(jobPositions.data.map((j) => [j.id, j.name ?? j.id]));
    this.costCenterNames = new Map(costCenters.data.map((c) => [c.id, c.name ?? c.id]));
    this.employeeIdsWithUser = new Set(users.map((u) => u.employeeId));

    this.employersList.set(
      employers.data
        .map((e) => ({ id: e.id, name: e.tradingName ?? e.id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    this.departmentsList.set(
      departments.data
        .map((d) => ({ id: d.id, name: d.name ?? d.id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.allEmployees.set(await this.fetchAll((p, l) => this.employeeService.findAll(p, l)));
      this.applyFilters();
    } catch (err) {
      this.toast.apiError('Não foi possível carregar os colaboradores', err);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters(): void {
    const term = this.search().trim().toLowerCase();
    const employerId = this.filterEmployerId();
    const departmentId = this.filterDepartmentId();
    const account = this.accountFilter();

    let list = this.allEmployees();

    if (term) {
      list = list.filter(
        (e) => e.personName?.toLowerCase().includes(term) || String(e.registerNumber ?? '').includes(term),
      );
    }
    if (employerId) list = list.filter((e) => e.employerId === employerId);
    if (departmentId) list = list.filter((e) => e.departmentId === departmentId);
    if (account === 'with') list = list.filter((e) => this.hasUser(e));
    else if (account === 'without') list = list.filter((e) => !this.hasUser(e));

    list = [...list].sort((a, b) => (a.personName ?? '').localeCompare(b.personName ?? ''));

    this.totalFiltered.set(list.length);

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

  onEmployerChange(value: string): void {
    this.filterEmployerId.set(value);
    this.page.set(1);
    this.applyFilters();
  }

  onDepartmentChange(value: string): void {
    this.filterDepartmentId.set(value);
    this.page.set(1);
    this.applyFilters();
  }

  onAccountChange(value: AccountFilter): void {
    this.accountFilter.set(value);
    this.page.set(1);
    this.applyFilters();
  }

  clearFilters(): void {
    this.search.set('');
    this.filterEmployerId.set('');
    this.filterDepartmentId.set('');
    this.accountFilter.set('all');
    this.page.set(1);
    this.applyFilters();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.applyFilters();
  }

  hasUser(employee: Employee): boolean {
    return this.employeeIdsWithUser.has(employee.id);
  }

  employerName(id: string | null): string {
    return id ? this.employerNames.get(id) ?? id : '—';
  }

  departmentName(id: string | null): string {
    return id ? this.departmentNames.get(id) ?? id : '—';
  }

  jobPositionName(id: string | null): string {
    return id ? this.jobPositionNames.get(id) ?? id : '—';
  }

  costCenterName(id: string | null): string {
    return id ? this.costCenterNames.get(id) ?? id : '—';
  }

  openCreateUser(employee: Employee): void {
    this.userForm = { employeeId: employee.id, username: '', email: '' };
    this.creatingUserFor.set(employee);
  }

  saveUser(): void {
    if (!this.userForm.username.trim() || !this.userForm.email.trim()) {
      this.toast.error('Informe usuário e e-mail.');
      return;
    }
    this.savingUser.set(true);
    this.userService.create(this.userForm).subscribe({
      next: () => {
        this.savingUser.set(false);
        this.creatingUserFor.set(null);
        this.toast.success('Usuário criado. Agora é possível conceder acessos a ele em Usuários/Credenciais.');
        this.loadLookups().then(() => this.applyFilters());
      },
      error: (err) => {
        this.savingUser.set(false);
        this.toast.apiError('Não foi possível criar o usuário', err);
      },
    });
  }
}
