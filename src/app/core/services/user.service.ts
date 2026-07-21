import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { CreateUserRequest, UpdateUserRequest, User, UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  /** Lista "crua" (sem join de RH) — útil para saber quais colaboradores já têm usuário. */
  findAll(page = 1, limit = 20): Observable<PaginatedResult<User>> {
    return this.http.get<PaginatedResult<User>>(this.baseUrl, { params: { page, limit } });
  }

  findAllProfiles(page = 1, limit = 20): Observable<PaginatedResult<UserProfile>> {
    return this.http.get<PaginatedResult<UserProfile>>(`${this.baseUrl}/profiles`, {
      params: { page, limit },
    });
  }

  create(dto: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.baseUrl, dto);
  }

  findProfileById(id: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/profile/${id}`);
  }

  findById(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  update(id: string, dto: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
