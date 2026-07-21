import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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

@Component({
  selector: 'app-locations',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent, LoadingBlockComponent],
  templateUrl: './locations.component.html',
})
export class LocationsComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly employerService = inject(EmployerService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  protected readonly locations = signal<Location[]>([]);
  protected readonly employers = signal<Employer[]>([]);
  protected readonly loading = signal(true);
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);

  form: CreateLocationRequest = { employerId: '', nome: '', descricao: '' };

  async ngOnInit(): Promise<void> {
    const employers = await firstValueFrom(this.employerService.findAll()).catch(() => ({ data: [] as Employer[] }));
    this.employers.set(employers.data);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.locationService.findAll(1, 200).subscribe({
      next: (result) => {
        this.locations.set(result.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.apiError('Não foi possível carregar os locais', err);
      },
    });
  }

  employerName(employerId: string): string {
    return this.employers().find((e) => e.id === employerId)?.tradingName ?? employerId;
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
