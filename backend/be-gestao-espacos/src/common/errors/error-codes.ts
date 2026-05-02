import { HttpStatus } from '@nestjs/common';

export function errorCodeFor(statusCode: number, message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('presença ativa não encontrada')) {
    return 'ATTENDANCE_ACTIVE_NOT_FOUND';
  }

  if (normalizedMessage.includes('monitor só pode encerrar')) {
    return 'ATTENDANCE_MONITOR_SCOPE_DENIED';
  }

  if (normalizedMessage.includes('permissão para encerrar presença')) {
    return 'ATTENDANCE_FORCE_CHECKOUT_FORBIDDEN';
  }

  if (normalizedMessage.includes('space está cheio')) {
    return 'ATTENDANCE_SPACE_FULL';
  }

  if (normalizedMessage.includes('já possui presença ativa')) {
    return 'ATTENDANCE_ALREADY_ACTIVE';
  }

  if (normalizedMessage.includes('usuário desativado')) {
    return 'USER_INACTIVE';
  }

  if (normalizedMessage.includes('credenciais inválidas')) {
    return 'AUTH_INVALID_CREDENTIALS';
  }

  if (normalizedMessage.includes('token expirado')) {
    return 'AUTH_TOKEN_EXPIRED';
  }

  if (normalizedMessage.includes('token inválido')) {
    return 'AUTH_TOKEN_INVALID';
  }

  if (statusCode === Number(HttpStatus.BAD_REQUEST)) {
    return 'VALIDATION_ERROR';
  }

  if (statusCode === Number(HttpStatus.UNAUTHORIZED)) {
    return 'AUTH_UNAUTHORIZED';
  }

  if (statusCode === Number(HttpStatus.FORBIDDEN)) {
    return 'AUTH_FORBIDDEN';
  }

  if (statusCode === Number(HttpStatus.NOT_FOUND)) {
    return 'RESOURCE_NOT_FOUND';
  }

  if (statusCode === Number(HttpStatus.CONFLICT)) {
    return 'RESOURCE_CONFLICT';
  }

  return 'INTERNAL_ERROR';
}
