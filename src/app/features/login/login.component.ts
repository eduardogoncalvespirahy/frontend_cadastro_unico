import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoginUserRequest } from '../../core/models/auth.model';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  identifier = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (!this.identifier.trim() || !this.password) return;

    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.login({ ...this.buildIdentifier(), password: this.password });
      this.router.navigateByUrl('/');
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Não foi possível entrar. Verifique suas credenciais.');
    } finally {
      this.loading.set(false);
    }
  }

  private buildIdentifier(): Pick<LoginUserRequest, 'username' | 'email' | 'registerNumber'> {
    const value = this.identifier.trim();

    if (value.includes('@')) {
      return { email: value };
    }

    if (/^\d+$/.test(value)) {
      return { registerNumber: Number(value) };
    }

    return { username: value };
  }
}
