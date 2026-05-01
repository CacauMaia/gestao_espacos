import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    LucideAngularModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  private readonly formStatus = toSignal(this.form.statusChanges, {
    initialValue: this.form.status,
  });

  protected readonly isSubmitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly canSubmit = computed(() => this.formStatus() === 'VALID' && !this.isSubmitting());

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorKey.set(null);

    this.authService
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: () => this.errorKey.set('login.error'),
      });
  }
}
