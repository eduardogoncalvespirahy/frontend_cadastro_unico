import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateCredentialRequest, Credential, UpdateCredentialRequest } from '../models/credential.model';
import { PaginatedResult } from '../models/paginated.model';

/**
 * A API só entende `page`/`limit` para /credentials (sem filtro por
 * systemId/userId) — quem precisa de um recorte filtra no cliente.
 */
@Injectable({ providedIn: 'root' })
export class CredentialService {
  private readonly baseUrl = `${environment.apiUrl}/credentials`;

  constructor(private readonly http: HttpClient) {}

  findAll(page = 1, limit = 500): Observable<PaginatedResult<Credential>> {
    return this.http.get<PaginatedResult<Credential>>(this.baseUrl, { params: { page, limit } });
  }

  findById(id: string): Observable<Credential> {
    return this.http.get<Credential>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateCredentialRequest): Observable<Credential> {
    return this.http.post<Credential>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateCredentialRequest): Observable<Credential> {
    return this.http.put<Credential>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
