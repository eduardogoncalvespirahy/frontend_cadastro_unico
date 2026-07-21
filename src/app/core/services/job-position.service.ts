import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JobPosition } from '../models/lookup.model';
import { BaseLookupService } from './base-lookup.service';

@Injectable({ providedIn: 'root' })
export class JobPositionService extends BaseLookupService<JobPosition> {
  constructor(http: HttpClient) {
    super(http, 'job-positions');
  }
}
