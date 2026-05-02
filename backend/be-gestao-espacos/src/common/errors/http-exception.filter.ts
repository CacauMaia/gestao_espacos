import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { errorCodeFor } from './error-codes';

type ErrorResponseBody = {
  code: string;
  error: string;
  message: string | string[];
  path: string;
  statusCode: number;
  timestamp: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message = this.resolveMessage(exception, exceptionResponse);
    const error = this.resolveError(statusCode, exceptionResponse);
    const body: ErrorResponseBody = {
      code: errorCodeFor(
        statusCode,
        Array.isArray(message) ? message.join(' ') : message,
      ),
      error,
      message,
      path: request.originalUrl,
      statusCode,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        JSON.stringify({
          event: 'http_exception',
          error,
          message,
          method: request.method,
          path: request.originalUrl,
          statusCode,
        }),
      );
    }

    response.status(statusCode).json(body);
  }

  private resolveMessage(
    exception: unknown,
    exceptionResponse: string | object | null,
  ): string | string[] {
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      return (exceptionResponse as { message: string | string[] }).message;
    }

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    return exception instanceof Error
      ? exception.message
      : 'Erro interno no servidor.';
  }

  private resolveError(
    statusCode: number,
    exceptionResponse: string | object | null,
  ): string {
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'error' in exceptionResponse
    ) {
      return String((exceptionResponse as { error: string }).error);
    }

    return statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)
      ? 'Internal Server Error'
      : 'Error';
  }
}
