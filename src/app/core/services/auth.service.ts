import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { finalize, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginUserRequest, LoginUserResponse, RefreshResponse } from '../models/auth.model';
import { UserProfile } from '../models/user.model';

const STORAGE_KEY = 'cadastro-unico.session';

interface StoredSession {
  userId: string;
  credentialId: string;
}

/**
 * O backend autentica via cookies httpOnly (`token`/`refreshToken`) — o JS
 * nunca vê o JWT. Por isso guardamos localmente só os IDs (não-sensíveis) e
 * buscamos os papéis/perfil via API sempre que precisamos deles.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly userIdSignal = signal<string | null>(null);
  private readonly credentialIdSignal = signal<string | null>(null);
  private readonly rolesSignal = signal<string[]>([]);
  private readonly profileSignal = signal<UserProfile | null>(null);
  private readonly readySignal = signal(false);

  readonly userId = this.userIdSignal.asReadonly();
  readonly credentialId = this.credentialIdSignal.asReadonly();
  readonly roles = this.rolesSignal.asReadonly();
  readonly profile = this.profileSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();

  readonly isAuthenticated = computed(() => !!this.credentialIdSignal());
  readonly isAdmin = computed(() => this.rolesSignal().includes('ADMIN'));
  readonly displayName = computed(
    () => this.profileSignal()?.employeeNome ?? this.profileSignal()?.userUsername ?? 'Usuário',
  );

  private readyPromise: Promise<void>;
  private refreshInFlight$: Observable<RefreshResponse> | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.readyPromise = this.bootstrap();
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  private async bootstrap(): Promise<void> {
    const stored = this.readStorage();
    if (!stored) {
      this.readySignal.set(true);
      return;
    }

    this.userIdSignal.set(stored.userId);
    this.credentialIdSignal.set(stored.credentialId);

    try {
      await this.loadSession();
    } catch {
      this.clearLocalSession();
    } finally {
      this.readySignal.set(true);
    }
  }

  async login(request: LoginUserRequest): Promise<void> {
    const body: LoginUserRequest = { systemId: environment.systemId, ...request };
    const response = await firstValueFrom(
      this.http.post<LoginUserResponse>(`${this.baseUrl}/user/login`, body),
    );

    this.userIdSignal.set(response.userId);
    this.credentialIdSignal.set(response.credentialId);
    this.persist();

    await this.loadSession();
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/logout`, {}));
    } catch {
      // mesmo se a chamada falhar, limpamos o estado local
    }
    this.clearLocalSession();
    this.router.navigate(['/login']);
  }

  /** Usado pelo interceptor de refresh quando uma chamada volta 401. */
  handleUnauthorized(): Observable<RefreshResponse> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http.post<RefreshResponse>(`${this.baseUrl}/refresh`, {}).pipe(
        shareReplay(1),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
      );
    }
    return this.refreshInFlight$;
  }

  /** Chamado pelo interceptor quando nem o refresh salva a sessão. */
  forceLogout(): void {
    this.clearLocalSession();
    this.router.navigate(['/login']);
  }

  /** true se a credencial logada tem ADMIN ou qualquer um dos papéis informados. */
  can(...allowed: string[]): boolean {
    if (this.isAdmin()) return true;
    const roles = this.rolesSignal();
    return allowed.some((role) => roles.includes(role));
  }

  async refreshProfile(): Promise<void> {
    await this.loadSession();
  }

  private async loadSession(): Promise<void> {
    const credentialId = this.credentialIdSignal();
    const userId = this.userIdSignal();
    if (!credentialId || !userId) return;

    const rolesUrl = `${environment.apiUrl}/credentials-roles/roles/credential/${credentialId}`;
    const profileUrl = `${environment.apiUrl}/users/profile/${userId}`;

    const [roles, profile] = await Promise.all([
      firstValueFrom(this.http.get<string[]>(rolesUrl)),
      firstValueFrom(this.http.get<UserProfile>(profileUrl)).catch(() => null),
    ]);

    this.rolesSignal.set(roles);
    this.profileSignal.set(profile);
  }

  private clearLocalSession(): void {
    this.userIdSignal.set(null);
    this.credentialIdSignal.set(null);
    this.rolesSignal.set([]);
    this.profileSignal.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private persist(): void {
    const userId = this.userIdSignal();
    const credentialId = this.credentialIdSignal();
    if (!userId || !credentialId) return;
    const stored: StoredSession = { userId, credentialId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }

  private readStorage(): StoredSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }
}
