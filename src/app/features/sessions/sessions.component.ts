import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { CredentialService } from '../../core/services/credential.service';
import { UserService } from '../../core/services/user.service';
import { SystemService } from '../../core/services/system.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { Session } from '../../core/models/session.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingBlockComponent } from '../../shared/components/loading-block/loading-block.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

interface SessionView extends Session {
  userNome: string;
  systemNome: string;
}

const PAGE_SIZE = 20;
// Tamanho de página usado para varrer as listas de referência (lookups).
const FETCH_PAGE_SIZE = 200;

/** Estrutura mínima de uma resposta paginada, usada pelo fetchAll genérico. */
interface Paginated<T> {
  data: T[];
  total?: number | null;
}

@Component({
  selector: 'app-sessions',
  imports: [DatePipe, PageHeaderComponent, EmptyStateComponent, LoadingBlockComponent, PaginationComponent],
  templateUrl: './sessions.component.html',
})
export class SessionsComponent implements OnInit {
  private readonly sessionService = inject(SessionService);
  private readonly credentialService = inject(CredentialService);
  private readonly userService = inject(UserService);
  private readonly systemService = inject(SystemService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly sessions = signal<SessionView[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly total = signal(0);

  // Seleção múltipla (por página atual).
  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly bulkBusy = signal(false);
  protected readonly selectedCount = computed(() => this.selectedIds().size);
  protected readonly allSelected = computed(() => {
    const rows = this.sessions();
    return rows.length > 0 && rows.every((s) => this.selectedIds().has(s.id));
  });

  private credentialLabels = new Map<string, { userNome: string; systemNome: string }>();

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
    const [credentials, users, systems] = await Promise.all([
      // Credenciais e perfis podem passar de 500 — varre até o fim para não perder rótulos.
      this.fetchAll<any>((p, l) => this.credentialService.findAll(p, l)).catch(() => [] as any[]),
      this.fetchAll<any>((p, l) => this.userService.findAllProfiles(p, l)).catch(() => [] as any[]),
      // Sistemas é conjunto pequeno de referência.
      firstValueFrom(this.systemService.findAll(1, 200)).catch(() => ({ data: [] as any[] })),
    ]);

    const userById = new Map(users.map((u: any) => [u.userId, u.employeeNome as string]));
    const systemById = new Map(systems.data.map((s: any) => [s.id, s.nome as string]));

    this.credentialLabels = new Map(
      credentials.map((c: any) => [
        c.id,
        {
          userNome: userById.get(c.userId) ?? c.userId,
          systemNome: systemById.get(c.systemId) ?? c.systemId,
        },
      ]),
    );
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.clearSelection();
    try {
      const result = await firstValueFrom(this.sessionService.findAll(this.page(), PAGE_SIZE));
      const views = result.data.map((s) => ({
        ...s,
        userNome: this.credentialLabels.get(s.credentialId)?.userNome ?? s.credentialId,
        systemNome: this.credentialLabels.get(s.credentialId)?.systemNome ?? '—',
      }));
      this.sessions.set(views);
      this.totalPages.set(result.totalPages ?? 1);
      this.total.set(result.total);
    } catch (err) {
      this.toast.apiError('Não foi possível carregar as sessões', err);
    } finally {
      this.loading.set(false);
    }
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  // --- Seleção ---

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.sessions().map((s) => s.id)));
    }
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  // --- Ações em lote ---

  async revokeSelected(): Promise<void> {
    // Só faz sentido revogar sessões ainda ativas.
    const targets = this.sessions().filter((s) => this.selectedIds().has(s.id) && !s.revogado);
    if (targets.length === 0) {
      this.toast.error('Nenhuma sessão ativa selecionada para revogar.');
      return;
    }

    const ok = await this.confirm.ask({
      title: 'Revogar sessões',
      message: `Revogar ${targets.length} sessão(ões) selecionada(s)? Os dispositivos precisarão fazer login novamente.`,
      confirmText: 'Revogar',
      variant: 'primary',
    });
    if (!ok) return;

    this.bulkBusy.set(true);
    try {
      const results = await Promise.allSettled(
        targets.map((s) => firstValueFrom(this.sessionService.revoke(s.id))),
      );
      const { done, failed } = this.countSettled(results);
      if (done > 0) this.toast.success(`${done} sessão(ões) revogada(s)`);
      if (failed > 0) this.toast.error(`Não foi possível revogar ${failed} sessão(ões)`);
    } finally {
      this.bulkBusy.set(false);
      await this.load();
    }
  }

  async removeSelected(): Promise<void> {
    const targets = this.sessions().filter((s) => this.selectedIds().has(s.id));
    if (targets.length === 0) return;

    const ok = await this.confirm.ask({
      title: 'Excluir sessões',
      message: `Excluir permanentemente ${targets.length} registro(s) de sessão selecionado(s)?`,
      confirmText: 'Excluir',
    });
    if (!ok) return;

    this.bulkBusy.set(true);
    try {
      const results = await Promise.allSettled(
        targets.map((s) => firstValueFrom(this.sessionService.delete(s.id))),
      );
      const { done, failed } = this.countSettled(results);
      if (done > 0) this.toast.success(`${done} sessão(ões) excluída(s)`);
      if (failed > 0) this.toast.error(`Não foi possível excluir ${failed} sessão(ões)`);
    } finally {
      this.bulkBusy.set(false);
      await this.load();
    }
  }

  private countSettled(results: PromiseSettledResult<unknown>[]): { done: number; failed: number } {
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { done: results.length - failed, failed };
  }

  // --- Ações individuais ---

  isExpired(session: Session): boolean {
    return new Date(session.expira).getTime() <= Date.now();
  }

  async revoke(session: SessionView): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Revogar sessão',
      message: `Revogar a sessão de "${session.userNome}"? O dispositivo precisará fazer login novamente.`,
      confirmText: 'Revogar',
      variant: 'primary',
    });
    if (!ok) return;

    this.sessionService.revoke(session.id).subscribe({
      next: () => {
        this.toast.success('Sessão revogada');
        this.load();
      },
      error: (err) => this.toast.apiError('Não foi possível revogar a sessão', err),
    });
  }

  async remove(session: SessionView): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Excluir sessão',
      message: `Excluir permanentemente o registro de sessão de "${session.userNome}"?`,
      confirmText: 'Excluir',
    });
    if (!ok) return;

    this.sessionService.delete(session.id).subscribe({
      next: () => {
        this.toast.success('Sessão excluída');
        this.load();
      },
      error: (err) => this.toast.apiError('Não foi possível excluir a sessão', err),
    });
  }
}
