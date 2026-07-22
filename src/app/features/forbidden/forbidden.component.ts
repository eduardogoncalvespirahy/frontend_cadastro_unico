import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  templateUrl: './forbidden.component.html',
})
export class ForbiddenComponent {
  protected readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
