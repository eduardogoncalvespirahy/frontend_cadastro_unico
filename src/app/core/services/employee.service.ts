import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Employee } from '../models/employee.model';
import { BaseLookupService } from './base-lookup.service';

@Injectable({ providedIn: 'root' })
export class EmployeeService extends BaseLookupService<Employee> {
  constructor(http: HttpClient) {
    super(http, 'employees');
  }
}
