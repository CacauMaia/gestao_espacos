import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from './api.config';

export const apiUrlInterceptor: HttpInterceptorFn = (request, next) => {
  if (/^https?:\/\//.test(request.url) || request.url.startsWith('/assets/')) {
    return next(request);
  }

  const apiBaseUrl = inject(API_BASE_URL);
  return next(request.clone({ url: `${apiBaseUrl}${request.url}` }));
};
