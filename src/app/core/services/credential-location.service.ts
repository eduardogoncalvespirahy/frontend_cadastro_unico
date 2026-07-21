import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CredentialLocation } from '../models/credential-location.model';

@Injectable({ providedIn: 'root' })
export class CredentialLocationService {
  private readonly baseUrl = `${environment.apiUrl}/credentials-locations`;

  constructor(private readonly http: HttpClient) {}

  findByCredential(credentialId: string): Observable<CredentialLocation[]> {
    return this.http.get<CredentialLocation[]>(`${this.baseUrl}/${credentialId}`);
  }

  findLocationNamesByCredential(credentialId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/locations/credential/${credentialId}`);
  }

  assign(credentialId: string, locationId: string): Observable<CredentialLocation> {
    return this.http.post<CredentialLocation>(this.baseUrl, { credentialId, locationId });
  }

  unassign(credentialId: string, locationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${credentialId}/${locationId}`);
  }
}
