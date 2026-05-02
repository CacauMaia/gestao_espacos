import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { UserRole } from '../../entities/user.entity';

export type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
};

@Injectable()
export class TokenService {
  private readonly secret = this.resolveSecret();
  private readonly expiresInSeconds = Number(
    process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS ?? 60 * 60,
  );
  private readonly refreshExpiresInSeconds = Number(
    process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 7,
  );

  sign(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.expiresInSeconds,
    };

    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const body = this.encode(fullPayload);
    const signature = this.signData(`${header}.${body}`);

    return `${header}.${body}.${signature}`;
  }

  verify(token: string): TokenPayload {
    const [header, body, signature] = token.split('.');

    if (!header || !body || !signature) {
      throw new UnauthorizedException('Token inválido.');
    }

    const expectedSignature = this.signData(`${header}.${body}`);

    if (!this.safeCompare(signature, expectedSignature)) {
      throw new UnauthorizedException('Token inválido.');
    }

    let payload: TokenPayload;

    try {
      payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as TokenPayload;
    } catch {
      throw new UnauthorizedException('Token inválido.');
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expirado.');
    }

    return payload;
  }

  generateRefreshToken(): string {
    return randomBytes(64).toString('base64url');
  }

  hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  getRefreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.refreshExpiresInSeconds * 1000);
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private signData(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }

  private safeCompare(value: string, expectedValue: string): boolean {
    const valueBuffer = Buffer.from(value);
    const expectedValueBuffer = Buffer.from(expectedValue);

    if (valueBuffer.length !== expectedValueBuffer.length) {
      return false;
    }

    return timingSafeEqual(valueBuffer, expectedValueBuffer);
  }

  private resolveSecret(): string {
    const secret = process.env.AUTH_TOKEN_SECRET;

    if (secret) {
      return secret;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_TOKEN_SECRET deve ser definido em produção.');
    }

    return 'gestao-espacos-dev-secret';
  }
}
