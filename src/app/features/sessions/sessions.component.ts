import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
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

  private credentialLabels = new Map<string, { userNome: string; systemNome: string }>();

  async ngOnInit(): Promise<void> {
    await this.loadLookups();
    await this.load();
  }

  private async loadLookups(): Promise<void> {
    const [credentials, users, systems] = await Promise.all([
      firstValueFrom(this.credentialService.findAll(1, 500)).catch(() => ({ data: [] as any[] })),
      firstValueFrom(this.userService.findAllProfiles(1, 500)).catch(() => ({ data: [] as any[] })),
      firstValueFrom(this.systemService.findAll(1, 200)).catch(() => ({ data: [] as any[] })),
    ]);

    const userById = new Map(users.data.map((u: any) => [u.userId, u.employeeNome as string]));
    const systemById = new Map(systems.data.map((s: any) => [s.id, s.nome as string]));

    this.credentialLabels = new Map(
      credentials.data.map((c: any) => [
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
