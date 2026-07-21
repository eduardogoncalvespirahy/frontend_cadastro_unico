import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Workshift } from '../models/lookup.model';
import { BaseLookupService } from './base-lookup.service';

@Injectable({ providedIn: 'root' })
export class WorkshiftService extends BaseLookupService<Workshift> {
  constructor(http: HttpClient) {
    super(http, 'workshifts');
  }
}
