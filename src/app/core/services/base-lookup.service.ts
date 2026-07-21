import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

/**
 * Base para as tabelas de apoio de RH (departamentos, cargos, centros de
 * custo, turnos, grupos de posto): todas seguem o mesmo CRUD raso e são
 * somente leitura nesta aplicação (dados sincronizados do Senior).
 */
export abstract class BaseLookupService<T extends { id: string }> {
  protected readonly baseUrl: string;

  protected constructor(
    protected readonly http: HttpClient,
    resource: string,
  ) {
    this.baseUrl = `${environment.apiUrl}/${resource}`;
  }

  findAll(page = 1, limit = 200): Observable<PaginatedResult<T>> {
    return this.http.get<PaginatedResult<T>>(this.baseUrl, { params: { page, limit } });
  }

  findById(id: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${id}`);
  }
}
