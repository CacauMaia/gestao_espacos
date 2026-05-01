import { HttpErrorResponse } from '@angular/common/http';

interface BackendErrorBody {
  message?: string | string[];
  error?: string;
}

export function extractBackendErrorMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  const body = error.error as BackendErrorBody | string | null;

  if (typeof body === 'string') {
    return body.trim() || null;
  }

  if (!body?.message) {
    return body?.error?.trim() || null;
  }

  return Array.isArray(body.message)
    ? body.message.filter(Boolean).join(' ')
    : body.message.trim() || null;
}
