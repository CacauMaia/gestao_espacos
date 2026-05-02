import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginResponse } from './auth.interfaces';

const STORAGE_KEY = 'gestao-espacos-auth';

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-02T12:00:00.000Z'));
    localStorage.clear();
    router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('refreshes immediately when the stored access token is already expired', () => {
    storeSession(createToken(-10), 'old-refresh-token');

    TestBed.inject(AuthService);

    const request = httpMock.expectOne('/auth/refresh');
    expect(request.request.body).toEqual({ refreshToken: 'old-refresh-token' });

    request.flush(createLoginResponse(createToken(3600), 'new-refresh-token'));

    const storedSession = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { accessToken: string; refreshToken: string };
    expect(storedSession.accessToken).toBe(createToken(3600));
    expect(storedSession.refreshToken).toBe('new-refresh-token');
  });

  it('schedules refresh before the stored access token expires', () => {
    storeSession(createToken(120), 'refresh-token');

    TestBed.inject(AuthService);

    httpMock.expectNone('/auth/refresh');

    vi.advanceTimersByTime(60_000);

    const request = httpMock.expectOne('/auth/refresh');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-token' });

    request.flush(createLoginResponse(createToken(3600), 'rotated-refresh-token'));
  });

  it('clears the session and redirects to login when refresh fails', () => {
    storeSession(createToken(-10), 'expired-refresh-token');

    TestBed.inject(AuthService);

    const request = httpMock.expectOne('/auth/refresh');
    request.flush({ message: 'invalid refresh token' }, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});

function storeSession(accessToken: string, refreshToken: string): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken,
      refreshToken,
      user: { id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'STUDENT' },
    }),
  );
}

function createLoginResponse(accessToken: string, refreshToken: string): LoginResponse {
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    user: { id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'STUDENT' },
  };
}

function createToken(expiresInSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = base64UrlEncode({ sub: 'user-1', email: 'ana@example.com', role: 'STUDENT', iat: exp - 3600, exp });
  return `header.${payload}.signature`;
}

function base64UrlEncode(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
