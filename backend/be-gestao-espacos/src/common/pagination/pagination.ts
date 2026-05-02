import { BadRequestException } from '@nestjs/common';

export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export function parsePaginationQuery(
  query: PaginationQuery,
): PaginationOptions | null {
  if (query.page === undefined && query.limit === undefined) {
    return null;
  }

  const page = parsePositiveInteger(query.page, DEFAULT_PAGE, 'page');
  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, 'limit');

  if (limit > MAX_LIMIT) {
    throw new BadRequestException(
      `limit deve ser menor ou igual a ${MAX_LIMIT}.`,
    );
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPaginatedResponse<T>(
  items: T[],
  totalItems: number,
  options: PaginationOptions,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalItems / options.limit);

  return {
    items,
    meta: {
      page: options.page,
      limit: options.limit,
      totalItems,
      totalPages,
      hasNextPage: options.page < totalPages,
      hasPreviousPage: options.page > 1,
    },
  };
}

function parsePositiveInteger(
  value: string | number | undefined,
  fallback: number,
  field: string,
): number {
  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new BadRequestException(
      `${field} deve ser um número inteiro maior que zero.`,
    );
  }

  return parsedValue;
}
