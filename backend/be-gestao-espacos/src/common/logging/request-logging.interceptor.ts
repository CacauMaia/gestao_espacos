import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logRequest(request, response, startedAt),
        error: (error: unknown) =>
          this.logRequest(request, response, startedAt, error),
      }),
    );
  }

  private logRequest(
    request: Request,
    response: Response,
    startedAt: number,
    error?: unknown,
  ): void {
    const statusCode =
      error instanceof HttpException ? error.getStatus() : response.statusCode;
    const payload = {
      durationMs: Date.now() - startedAt,
      event: 'http_request',
      method: request.method,
      path: request.originalUrl,
      statusCode,
      userId: (request as Request & { user?: { sub?: string } }).user?.sub,
      ...(error instanceof Error ? { error: error.message } : {}),
    };
    const message = JSON.stringify(payload);

    if (statusCode >= 500 || error) {
      this.logger.error(message);
      return;
    }

    this.logger.log(message);
  }
}
