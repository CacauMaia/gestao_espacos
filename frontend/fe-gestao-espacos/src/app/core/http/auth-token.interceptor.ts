import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  if (!token || isAuthEndpoint(request.url)) {
    return next(request);
  }

  return next(addAuthHeader(request, token)).pipe(
    catchError((error: unknown) => {
      if (!shouldRefresh(error, request)) {
        return throwError(() => error);
      }

      return authService.refreshSession().pipe(
        switchMap((accessToken) => next(addAuthHeader(request, accessToken))),
      );
    }),
  );
};

function addAuthHeader(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function shouldRefresh(error: unknown, request: HttpRequest<unknown>): boolean {
  return error instanceof HttpErrorResponse && error.status === 401 && !isAuthEndpoint(request.url);
}

function isAuthEndpoint(url: string): boolean {
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}
