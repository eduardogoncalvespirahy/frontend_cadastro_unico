import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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
  protected readonly search = signal('');

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

  private async loadLookups(): Promise<void> {
    const [employers, departments, jobPositions, costCenters, users] = await Promise.all([
      firstValueFrom(this.employerService.findAll()).catch(() => ({ data: [] as { id: string; tradingName: string | null }[] })),
      firstValueFrom(this.departmentService.findAll()).catch(() => ({ data: [] as { id: string; name: string | null }[] })),
      firstValueFrom(this.jobPositionService.findAll()).catch(() => ({ data: [] as { id: string; name: string | null }[] })),
      firstValueFrom(this.costCenterService.findAll()).catch(() => ({ data: [] as { id: string; name: string | null }[] })),
      firstValueFrom(this.userService.findAll(1, 1000)).catch(() => ({ data: [] as { employeeId: string }[] })),
    ]);

    this.employerNames = new Map(employers.data.map((e) => [e.id, e.tradingName ?? e.id]));
    this.departmentNames = new Map(departments.data.map((d) => [d.id, d.name ?? d.id]));
    this.jobPositionNames = new Map(jobPositions.data.map((j) => [j.id, j.name ?? j.id]));
    this.costCenterNames = new Map(costCenters.data.map((c) => [c.id, c.name ?? c.id]));
    this.employeeIdsWithUser = new Set(users.data.map((u) => u.employeeId));
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.employeeService.findAll(1, 1000));
      this.allEmployees.set(result.data);
      this.applyFilters();
    } catch (err) {
      this.toast.apiError('Não foi possível carregar os colaboradores', err);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters(): void {
    const term = this.search().trim().toLowerCase();
    let list = this.allEmployees();
    if (term) {
      list = list.filter(
        (e) => e.personName?.toLowerCase().includes(term) || String(e.registerNumber ?? '').includes(term),
      );
    }
    list = [...list].sort((a, b) => (a.personName ?? '').localeCompare(b.personName ?? ''));

    this.totalFiltered.set(list.length);
    const start = (this.page() - 1) * PAGE_SIZE;
    this.visibleRows.set(list.slice(start, start + PAGE_SIZE));
  }

  onSearchChange(term: string): void {
    this.search.set(term);
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
