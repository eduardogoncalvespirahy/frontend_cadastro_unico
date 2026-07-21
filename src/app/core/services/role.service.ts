import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { CreateRoleRequest, Role, UpdateRoleRequest } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly baseUrl = `${environment.apiUrl}/roles`;

  constructor(private readonly http: HttpClient) {}

  findAll(page = 1, limit = 200): Observable<PaginatedResult<Role>> {
    return this.http.get<PaginatedResult<Role>>(this.baseUrl, { params: { page, limit } });
  }

  /** Conveniência: papéis de um sistema específico, já filtrados no cliente. */
  findBySystem(systemId: string): Observable<Role[]> {
    return this.findAll(1, 500).pipe(map((result) => result.data.filter((r) => r.systemId === systemId)));
  }

  findById(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateRoleRequest): Observable<Role> {
    return this.http.post<Role>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateRoleRequest): Observable<Role> {
    return this.http.put<Role>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
