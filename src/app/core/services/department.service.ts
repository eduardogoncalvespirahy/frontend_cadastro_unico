import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Department } from '../models/lookup.model';
import { BaseLookupService } from './base-lookup.service';

@Injectable({ providedIn: 'root' })
export class DepartmentService extends BaseLookupService<Department> {
  constructor(http: HttpClient) {
    super(http, 'departments');
  }
}
