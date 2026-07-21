import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { SystemService } from '../../core/services/system.service';
import { CredentialService } from '../../core/services/credential.service';
import { SessionService } from '../../core/services/session.service';
import { SyncLogService } from '../../core/services/sync-log.service';
import { SyncLogRecord } from '../../core/models/sync-log.model';
import { LoadingBlockComponent } from '../../shared/components/loading-block/loading-block.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

interface DashboardKpis {
  users: number;
  systems: number;
  credentials: number;
  activeSessions: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, LoadingBlockComponent, EmptyStateComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly systemService = inject(SystemService);
  private readonly credentialService = inject(CredentialService);
  private readonly sessionService = inject(SessionService);
  private readonly syncLogService = inject(SyncLogService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly kpis = signal<DashboardKpis | null>(null);
  protected readonly lastSync = signal<SyncLogRecord | null>(null);
  protected readonly lastSyncError = signal(false);

  async ngOnInit(): Promise<void> {
    const [usersTotal, systemsTotal, credentialsTotal, activeSessions, lastSync] = await Promise.all([
      firstValueFrom(this.userService.findAllProfiles(1, 1))
        .then((r) => r.total)
        .catch(() => 0),
      firstValueFrom(this.systemService.findAll(1, 1))
        .then((r) => r.total)
        .catch(() => 0),
      firstValueFrom(this.credentialService.findAll(1, 1))
        .then((r) => r.total)
        .catch(() => 0),
      firstValueFrom(this.sessionService.findAll(1, 100))
        .then((r) => r.data.filter((s) => !s.revogado && new Date(s.expira).getTime() > Date.now()).length)
        .catch(() => 0),
      firstValueFrom(this.syncLogService.findAll(1, 1))
        .then((r) => r.data[0] ?? null)
        .catch(() => {
          this.lastSyncError.set(true);
          return null;
        }),
    ]);

    this.kpis.set({
      users: usersTotal,
      systems: systemsTotal,
      credentials: credentialsTotal,
      activeSessions,
    });
    this.lastSync.set(lastSync);
    this.loading.set(false);
  }
}
