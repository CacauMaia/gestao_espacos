import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader, Translation } from '@jsverse/transloco';
import { byText, createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { LogIn, LucideAngularModule, ShieldCheck } from 'lucide-angular';
import { of } from 'rxjs';
import { LoginComponent } from './login.component';

class InlineLoader implements TranslocoLoader {
  public getTranslation() {
    return of({
      app: { subtitle: 'Teaching spaces' },
      login: {
        title: 'Access the panel',
        description: 'Use your institutional credentials.',
        formLabel: 'Login form',
        email: 'Email',
        emailPlaceholder: 'name@school.edu',
        password: 'Password',
        passwordPlaceholder: 'Password',
        submit: 'Sign in',
        loading: 'Signing in',
        error: 'Invalid credentials',
      },
    } satisfies Translation);
  }
}

describe('LoginComponent', () => {
  let spectator: Spectator<LoginComponent>;

  const createComponent = createComponentFactory({
    component: LoginComponent,
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick({ LogIn, ShieldCheck })),
      provideTransloco({
        config: { availableLangs: ['en'], defaultLang: 'en' },
        loader: InlineLoader,
      }),
    ],
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should render the login form and action', () => {
    expect(spectator.query('[data-test="login-form"]')).toBeTruthy();
    expect(spectator.query('[data-test="login-email-input"]')).toBeTruthy();
    expect(spectator.query('[data-test="login-password-input"]')).toBeTruthy();
    expect(spectator.query(byText('Sign in'))).toBeTruthy();
  });
});
