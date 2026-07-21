import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CostCenter } from '../models/lookup.model';
import { BaseLookupService } from './base-lookup.service';

@Injectable({ providedIn: 'root' })
export class CostCenterService extends BaseLookupService<CostCenter> {
  constructor(http: HttpClient) {
    super(http, 'cost-centers');
  }
}
