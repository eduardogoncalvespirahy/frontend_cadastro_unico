import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WorkstationGroup } from '../models/lookup.model';
import { BaseLookupService } from './base-lookup.service';

@Injectable({ providedIn: 'root' })
export class WorkstationGroupService extends BaseLookupService<WorkstationGroup> {
  constructor(http: HttpClient) {
    super(http, 'workstation-groups');
  }
}
