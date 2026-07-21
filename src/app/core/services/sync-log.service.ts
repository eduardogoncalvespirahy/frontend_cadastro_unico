import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { SyncLogRecord } from '../models/sync-log.model';

@Injectable({ providedIn: 'root' })
export class SyncLogService {
  private readonly baseUrl = `${environment.apiUrl}/sync-logs`;

  constructor(private readonly http: HttpClient) {}

  findAll(page = 1, limit = 20): Observable<PaginatedResult<SyncLogRecord>> {
    return this.http.get<PaginatedResult<SyncLogRecord>>(this.baseUrl, { params: { page, limit } });
  }

  findById(id: string): Observable<SyncLogRecord> {
    return this.http.get<SyncLogRecord>(`${this.baseUrl}/${id}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
