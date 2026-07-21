import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'usuarios',
    canActivate: [authGuard, permissionGuard('READ')],
    loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent),
  },
  {
    path: 'credenciais',
    canActivate: [authGuard, permissionGuard('READ')],
    loadComponent: () => import('./features/credentials/credentials.component').then((m) => m.CredentialsComponent),
  },
  {
    path: 'sistemas',
    canActivate: [authGuard, permissionGuard('READ')],
    loadComponent: () => import('./features/systems/systems.component').then((m) => m.SystemsComponent),
  },
  {
    path: 'locais',
    canActivate: [authGuard, permissionGuard('READ')],
    loadComponent: () => import('./features/locations/locations.component').then((m) => m.LocationsComponent),
  },
  {
    path: 'sessoes',
    canActivate: [authGuard, permissionGuard('READ')],
    loadComponent: () => import('./features/sessions/sessions.component').then((m) => m.SessionsComponent),
  },
  {
    path: 'colaboradores',
    canActivate: [authGuard, permissionGuard('READ')],
    loadComponent: () => import('./features/employees/employees.component').then((m) => m.EmployeesComponent),
  },
  {
    path: 'tabelas-apoio',
    canActivate: [authGuard, permissionGuard('READ')],
    loadComponent: () => import('./features/lookups/lookups.component').then((m) => m.LookupsComponent),
  },
  {
    path: 'sincronizacoes',
    canActivate: [authGuard, permissionGuard('READ')],
    loadComponent: () => import('./features/sync-logs/sync-logs.component').then((m) => m.SyncLogsComponent),
  },
  { path: '**', redirectTo: '' },
];
