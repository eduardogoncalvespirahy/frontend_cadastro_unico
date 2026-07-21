import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CredentialRole } from '../models/credential-role.model';

@Injectable({ providedIn: 'root' })
export class CredentialRoleService {
  private readonly baseUrl = `${environment.apiUrl}/credentials-roles`;

  constructor(private readonly http: HttpClient) {}

  findByCredential(credentialId: string): Observable<CredentialRole[]> {
    return this.http.get<CredentialRole[]>(`${this.baseUrl}/${credentialId}`);
  }

  findRoleNamesByCredential(credentialId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/roles/credential/${credentialId}`);
  }

  assign(credentialId: string, roleId: string): Observable<CredentialRole> {
    return this.http.post<CredentialRole>(this.baseUrl, { credentialId, roleId });
  }

  unassign(credentialId: string, roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${credentialId}/${roleId}`);
  }
}
