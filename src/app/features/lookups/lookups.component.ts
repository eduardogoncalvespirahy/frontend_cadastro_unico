import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, firstValueFrom } from 'rxjs';
import { DepartmentService } from '../../core/services/department.service';
import { JobPositionService } from '../../core/services/job-position.service';
import { CostCenterService } from '../../core/services/cost-center.service';
import { WorkshiftService } from '../../core/services/workshift.service';
import { WorkstationGroupService } from '../../core/services/workstation-group.service';
import { EmployerService } from '../../core/services/employer.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginatedResult } from '../../core/models/paginated.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingBlockComponent } from '../../shared/components/loading-block/loading-block.component';

interface LookupRow {
  id: string;
  label: string;
}

interface LookupTab {
  key: string;
  title: string;
  icon: string;
  fetch: () => Observable<PaginatedResult<any>>;
  labelOf: (item: any) => string;
}

@Component({
  selector: 'app-lookups',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent, LoadingBlockComponent],
  templateUrl: './lookups.component.html',
})
export class LookupsComponent implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly departmentService = inject(DepartmentService);
  private readonly jobPositionService = inject(JobPositionService);
  private readonly costCenterService = inject(CostCenterService);
  private readonly workshiftService = inject(WorkshiftService);
  private readonly workstationGroupService = inject(WorkstationGroupService);
  private readonly employerService = inject(EmployerService);

  protected readonly tabs: LookupTab[] = [
    {
      key: 'departments',
      title: 'Departamentos',
      icon: 'bi-diagram-3',
      fetch: () => this.departmentService.findAll(1, 500),
      labelOf: (item) => item.name ?? item.id,
    },
    {
      key: 'job-positions',
      title: 'Cargos',
      icon: 'bi-briefcase',
      fetch: () => this.jobPositionService.findAll(1, 500),
      labelOf: (item) => item.name ?? item.id,
    },
    {
      key: 'cost-centers',
      title: 'Centros de custo',
      icon: 'bi-cash-coin',
      fetch: () => this.costCenterService.findAll(1, 500),
      labelOf: (item) => item.name ?? item.id,
    },
    {
      key: 'workshifts',
      title: 'Turnos',
      icon: 'bi-clock',
      fetch: () => this.workshiftService.findAll(1, 500),
      labelOf: (item) => item.description ?? item.id,
    },
    {
      key: 'workstation-groups',
      title: 'Grupos de posto',
      icon: 'bi-diagram-2',
      fetch: () => this.workstationGroupService.findAll(1, 500),
      labelOf: (item) => item.name ?? item.id,
    },
    {
      key: 'employers',
      title: 'Empresas',
      icon: 'bi-building',
      fetch: () => this.employerService.findAll(1, 500),
      labelOf: (item) => item.tradingName ?? item.id,
    },
  ];

  protected readonly activeTabKey = signal(this.tabs[0].key);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly rows = signal<LookupRow[]>([]);

  private readonly cache = new Map<string, LookupRow[]>();

  ngOnInit(): void {
    this.selectTab(this.tabs[0].key);
  }

  protected get activeTab(): LookupTab {
    return this.tabs.find((t) => t.key === this.activeTabKey())!;
  }

  protected get filteredRows(): LookupRow[] {
    const term = this.search().trim().toLowerCase();
    const rows = this.rows();
    if (!term) return rows;
    return rows.filter((r) => r.label.toLowerCase().includes(term) || r.id.toLowerCase().includes(term));
  }

  async selectTab(key: string): Promise<void> {
    this.activeTabKey.set(key);
    this.search.set('');

    const cached = this.cache.get(key);
    if (cached) {
      this.rows.set(cached);
      return;
    }

    this.loading.set(true);
    const tab = this.tabs.find((t) => t.key === key)!;
    try {
      const result = await firstValueFrom(tab.fetch());
      const rows = result.data
        .map((item: any) => ({ id: item.id, label: tab.labelOf(item) }))
        .sort((a: LookupRow, b: LookupRow) => a.label.localeCompare(b.label));
      this.cache.set(key, rows);
      this.rows.set(rows);
    } catch (err) {
      this.toast.apiError(`Não foi possível carregar "${tab.title}"`, err);
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
