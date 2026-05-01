import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, shareReplay, tap, throwError } from 'rxjs';
import type { AuthenticatedUser, LoginPayload, LoginResponse } from './auth.interfaces';

const STORAGE_KEY = 'gestao-espacos-auth';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

interface LegacyStoredSession {
  token: string;
  user?: AuthenticatedUser;
  student?: AuthenticatedUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<StoredSession | null>(this.readSession());
  private refreshRequest: Observable<string> | null = null;

  public readonly token = computed(() => this.session()?.accessToken ?? null);
  public readonly currentUser = computed(() => this.session()?.user ?? null);
  public readonly isAuthenticated = computed(() => Boolean(this.session()?.accessToken));

  public login(payload: LoginPayload) {
    return this.http.post<LoginResponse>('/auth/login', payload).pipe(
      tap((response) => this.storeSession(response)),
    );
  }

  public logout(): void {
    const refreshToken = this.session()?.refreshToken;
    this.clearSession();

    if (refreshToken) {
      this.http.post('/auth/logout', { refreshToken }).subscribe({ error: () => undefined });
    }
  }

  public refreshSession(): Observable<string> {
    if (this.refreshRequest) {
      return this.refreshRequest;
    }

    const refreshToken = this.session()?.refreshToken;

    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('Missing refresh token.'));
    }

    this.refreshRequest = this.http.post<LoginResponse>('/auth/refresh', { refreshToken }).pipe(
      tap((response) => this.storeSession(response)),
      map((response) => response.accessToken),
      catchError((error: unknown) => {
        this.clearSession();
        return throwError(() => error);
      }),
      finalize(() => {
        this.refreshRequest = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshRequest;
  }

  private readSession(): StoredSession | null {
    const storedSession = localStorage.getItem(STORAGE_KEY);

    if (!storedSession) {
      return null;
    }

    try {
      const parsedSession = JSON.parse(storedSession) as StoredSession | LegacyStoredSession;

      if ('accessToken' in parsedSession && 'refreshToken' in parsedSession) {
        return parsedSession;
      }

      const legacyUser = parsedSession.user ?? parsedSession.student;

      if (legacyUser) {
        const migratedSession = {
          accessToken: parsedSession.token,
          refreshToken: '',
          user: legacyUser,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedSession));
        return migratedSession;
      }

      localStorage.removeItem(STORAGE_KEY);
      return null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private storeSession(response: LoginResponse): void {
    const session = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.session.set(session);
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
  }
}
