import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { CredentialService } from '../../core/services/credential.service';
import { CredentialRoleService } from '../../core/services/credential-role.service';
import { CredentialLocationService } from '../../core/services/credential-location.service';
import { SystemService } from '../../core/services/system.service';
import { LocationService } from '../../core/services/location.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UpdateUserRequest, UserProfile } from '../../core/models/user.model';
import { CreateCredentialRequest, CredentialView } from '../../core/models/credential.model';
import { System } from '../../core/models/system.model';
import { Location } from '../../core/models/location.model';
import { SortState } from '../../core/models/sort.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SortHeaderComponent } from '../../shared/components/sort-header/sort-header.component';
import { CredentialRowComponent } from '../../shared/components/credential-row/credential-row.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingBlockComponent } from '../../shared/components/loading-block/loading-block.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-users',
  imports: [
    FormsModule,
    DatePipe,
    PageHeaderComponent,
    SortHeaderComponent,
    CredentialRowComponent,
    EmptyStateComponent,
    LoadingBlockComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly credentialService = inject(CredentialService);
  private readonly credentialRoleService = inject(CredentialRoleService);
  private readonly credentialLocationService = inject(CredentialLocationService);
  private readonly systemService = inject(SystemService);
  private readonly locationService = inject(LocationService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  private readonly allProfiles = signal<UserProfile[]>([]);
  protected readonly visibleRows = signal<UserProfile[]>([]);
  protected readonly totalFiltered = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalFiltered() / PAGE_SIZE)));

  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly sort = signal<SortState>({ key: 'nome', dir: 'asc' });
  protected readonly editingId = signal<string | null>(null);

  protected readonly selectedUser = signal<UserProfile | null>(null);
  protected readonly userCredentials = signal<CredentialView[]>([]);
  protected readonly userCredentialsLoading = signal(false);
  protected readonly systems = signal<System[]>([]);
  protected readonly allLocations = signal<Location[]>([]);
  protected readonly showAccessForm = signal(false);
  protected readonly savingAccess = signal(false);

  editForm: UpdateUserRequest = {};
  accessForm: CreateCredentialRequest = { userId: '', systemId: '', senha: '' };

  async ngOnInit(): Promise<void> {
    const [systems, locations] = await Promise.all([
      firstValueFrom(this.systemService.findAll(1, 200)).catch(() => ({ data: [] as System[] })),
      firstValueFrom(this.locationService.findAll(1, 200)).catch(() => ({ data: [] as Location[] })),
    ]);
    this.systems.set(systems.data);
    this.allLocations.set(locations.data);
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.userService.findAllProfiles(1, 500));
      this.allProfiles.set(result.data);
      this.applyFilters();
    } catch (err) {
      this.toast.apiError('Não foi possível carregar os usuários', err);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters(): void {
    const term = this.search().trim().toLowerCase();
    let list = this.allProfiles();

    if (term) {
      list = list.filter(
        (u) =>
          u.employeeNome?.toLowerCase().includes(term) ||
          u.userUsername?.toLowerCase().includes(term) ||
          u.userEmail?.toLowerCase().includes(term) ||
          String(u.employeeMatricula ?? '').includes(term),
      );
    }

    const { key, dir } = this.sort();
    list = [...list].sort((a, b) => {
      const cmp = this.compareBySortKey(a, b, key);
      return dir === 'asc' ? cmp : -cmp;
    });

    this.totalFiltered.set(list.length);
    const start = (this.page() - 1) * PAGE_SIZE;
    this.visibleRows.set(list.slice(start, start + PAGE_SIZE));
  }

  private compareBySortKey(a: UserProfile, b: UserProfile, key: string): number {
    switch (key) {
      case 'nome':
        return (a.employeeNome ?? '').localeCompare(b.employeeNome ?? '');
      case 'matricula':
        return Number(a.employeeMatricula ?? 0) - Number(b.employeeMatricula ?? 0);
      case 'usuario':
        return (a.userUsername ?? '').localeCompare(b.userUsername ?? '');
      case 'email':
        return (a.userEmail ?? '').localeCompare(b.userEmail ?? '');
      default:
        return 0;
    }
  }

  onSearchChange(term: string): void {
    this.search.set(term);
    this.page.set(1);
    this.applyFilters();
  }

  onSort(sort: SortState): void {
    this.sort.set(sort);
    this.page.set(1);
    this.applyFilters();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.applyFilters();
  }

  startEdit(user: UserProfile): void {
    this.editingId.set(user.userId);
    this.editForm = { username: user.userUsername, email: user.userEmail, status: user.userStatus };
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  save(user: UserProfile): void {
    this.userService.update(user.userId, this.editForm).subscribe({
      next: () => {
        this.editingId.set(null);
        this.toast.success('Usuário atualizado');
        this.load();
      },
      error: (err) => this.toast.apiError('Não foi possível atualizar o usuário', err),
    });
  }

  openDetails(user: UserProfile): void {
    this.selectedUser.set(user);
    this.showAccessForm.set(false);
    this.loadUserCredentials();
  }

  closeDetails(): void {
    this.selectedUser.set(null);
  }

  async loadUserCredentials(): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    this.userCredentialsLoading.set(true);
    try {
      const result = await firstValueFrom(this.credentialService.findAll(1, 500));
      const mine = result.data.filter((c) => c.userId === user.userId);

      const enriched = await Promise.all(
        mine.map(async (c) => {
          const [roles, locations] = await Promise.all([
            firstValueFrom(this.credentialRoleService.findRoleNamesByCredential(c.id)).catch(() => []),
            firstValueFrom(this.credentialLocationService.findLocationNamesByCredential(c.id)).catch(() => []),
          ]);
          const system = this.systems().find((s) => s.id === c.systemId);
          return {
            ...c,
            userNome: user.employeeNome,
            username: user.userUsername,
            email: user.userEmail,
            systemNome: system?.nome ?? null,
            roles,
            locations,
          };
        }),
      );

      this.userCredentials.set(enriched);
    } catch (err) {
      this.toast.apiError('Não foi possível carregar os acessos deste usuário', err);
    } finally {
      this.userCredentialsLoading.set(false);
    }
  }

  openAccessForm(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.accessForm = { userId: user.userId, systemId: '', senha: '' };
    this.showAccessForm.set(true);
  }

  saveAccess(): void {
    if (!this.accessForm.systemId || !this.accessForm.senha) {
      this.toast.error('Selecione o sistema e defina uma senha.');
      return;
    }
    this.savingAccess.set(true);
    this.credentialService.create(this.accessForm).subscribe({
      next: () => {
        this.savingAccess.set(false);
        this.showAccessForm.set(false);
        this.toast.success('Acesso concedido');
        this.loadUserCredentials();
      },
      error: (err) => {
        this.savingAccess.set(false);
        this.toast.apiError('Não foi possível conceder o acesso', err);
      },
    });
  }
}
