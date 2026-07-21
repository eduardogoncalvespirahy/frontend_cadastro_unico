import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateLocationRequest, Location, UpdateLocationRequest } from '../models/location.model';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly baseUrl = `${environment.apiUrl}/locations`;

  constructor(private readonly http: HttpClient) {}

  findAll(page = 1, limit = 200): Observable<PaginatedResult<Location>> {
    return this.http.get<PaginatedResult<Location>>(this.baseUrl, { params: { page, limit } });
  }

  findById(id: string): Observable<Location> {
    return this.http.get<Location>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateLocationRequest): Observable<Location> {
    return this.http.post<Location>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateLocationRequest): Observable<Location> {
    return this.http.put<Location>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
