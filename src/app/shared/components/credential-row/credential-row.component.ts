import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CredentialRoleService } from '../../../core/services/credential-role.service';
import { CredentialLocationService } from '../../../core/services/credential-location.service';
import { CredentialService } from '../../../core/services/credential.service';
import { RoleService } from '../../../core/services/role.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { CredentialView } from '../../../core/models/credential.model';
import { Role } from '../../../core/models/role.model';
import { Location } from '../../../core/models/location.model';

/**
 * Uma linha <tr> de credencial, com edição inline de status/senha e os
 * dropdowns de atribuição de papéis/locais. Usada em Credenciais e no
 * detalhe de Usuários.
 */
@Component({
  selector: 'tr[app-credential-row]',
  imports: [FormsModule, DatePipe],
  templateUrl: './credential-row.component.html',
})
export class CredentialRowComponent implements OnChanges {
  @Input() credential!: CredentialView;
  @Input() allLocations: Location[] = [];
  @Input() showUser = false;
  @Input() showLastLogin = false;
  @Output() changed = new EventEmitter<void>();

  private readonly credentialService = inject(CredentialService);
  private readonly credentialRoleService = inject(CredentialRoleService);
  private readonly credentialLocationService = inject(CredentialLocationService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly editStatus = signal(1);
  protected readonly passwordDraft = signal('');
  protected readonly rolesForSystem = signal<Role[]>([]);
  protected readonly rolesLoading = signal(false);

  ngOnChanges(): void {
    this.editStatus.set(this.credential.status);
  }

  loadRoles(): void {
    this.rolesLoading.set(true);
    this.roleService.findBySystem(this.credential.systemId).subscribe({
      next: (list) => {
        this.rolesForSystem.set(list);
        this.rolesLoading.set(false);
      },
      error: () => this.rolesLoading.set(false),
    });
  }

  hasRole(roleName: string): boolean {
    return this.credential.roles.includes(roleName);
  }

  toggleRole(role: Role): void {
    const action: Observable<unknown> = this.hasRole(role.nome)
      ? this.credentialRoleService.unassign(this.credential.id, role.id)
      : this.credentialRoleService.assign(this.credential.id, role.id);

    action.subscribe({
      next: () => this.changed.emit(),
      error: (err: unknown) => this.toast.apiError('Não foi possível atualizar o papel', err),
    });
  }

  hasLocation(locationName: string): boolean {
    return this.credential.locations.includes(locationName);
  }

  toggleLocation(location: Location): void {
    const action: Observable<unknown> = this.hasLocation(location.nome)
      ? this.credentialLocationService.unassign(this.credential.id, location.id)
      : this.credentialLocationService.assign(this.credential.id, location.id);

    action.subscribe({
      next: () => this.changed.emit(),
      error: (err: unknown) => this.toast.apiError('Não foi possível atualizar o local', err),
    });
  }

  startEdit(): void {
    this.editStatus.set(this.credential.status);
    this.passwordDraft.set('');
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    this.saving.set(true);
    this.credentialService
      .update(this.credential.id, {
        status: this.editStatus(),
        senha: this.passwordDraft() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing.set(false);
          this.toast.success('Credencial atualizada');
          this.changed.emit();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.apiError('Não foi possível atualizar a credencial', err);
        },
      });
  }

  async remove(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remover credencial',
      message: `Remover o acesso de "${this.credential.userNome ?? this.credential.username}" ao sistema "${this.credential.systemNome}"? Essa ação não pode ser desfeita.`,
      confirmText: 'Remover',
    });
    if (!ok) return;

    this.credentialService.delete(this.credential.id).subscribe({
      next: () => {
        this.toast.success('Credencial removida');
        this.changed.emit();
      },
      error: (err) => this.toast.apiError('Não foi possível remover a credencial', err),
    });
  }
}
