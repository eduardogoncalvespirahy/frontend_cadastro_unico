import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { CreateSystemRequest, System, UpdateSystemRequest } from '../models/system.model';

@Injectable({ providedIn: 'root' })
export class SystemService {
  private readonly baseUrl = `${environment.apiUrl}/systems`;

  constructor(private readonly http: HttpClient) {}

  findAll(page = 1, limit = 200): Observable<PaginatedResult<System>> {
    return this.http.get<PaginatedResult<System>>(this.baseUrl, { params: { page, limit } });
  }

  findById(id: string): Observable<System> {
    return this.http.get<System>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateSystemRequest): Observable<System> {
    return this.http.post<System>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateSystemRequest): Observable<System> {
    return this.http.put<System>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
