import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Employer } from '../models/employer.model';
import { BaseLookupService } from './base-lookup.service';

@Injectable({ providedIn: 'root' })
export class EmployerService extends BaseLookupService<Employer> {
  constructor(http: HttpClient) {
    super(http, 'employers');
  }
}
