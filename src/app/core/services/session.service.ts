import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { Session } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly baseUrl = `${environment.apiUrl}/sessions`;

  constructor(private readonly http: HttpClient) {}

  findAll(page = 1, limit = 20): Observable<PaginatedResult<Session>> {
    return this.http.get<PaginatedResult<Session>>(this.baseUrl, { params: { page, limit } });
  }

  findById(id: string): Observable<Session> {
    return this.http.get<Session>(`${this.baseUrl}/${id}`);
  }

  revoke(id: string): Observable<Session> {
    return this.http.patch<Session>(`${this.baseUrl}/${id}/revoke`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
