import { Injectable } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

@Injectable()
export class PasswordService {
  private readonly keyLength = 64;

  hash(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, this.keyLength).toString('hex');

    return `scrypt:${salt}:${hash}`;
  }

  compare(password: string, storedPassword: string): boolean {
    if (!storedPassword.startsWith('scrypt:')) {
      return password === storedPassword;
    }

    const [, salt, hash] = storedPassword.split(':');
    const passwordHash = scryptSync(password, salt, this.keyLength);
    const hashArmazenado = Buffer.from(hash, 'hex');

    if (passwordHash.length !== hashArmazenado.length) {
      return false;
    }

    return timingSafeEqual(passwordHash, hashArmazenado);
  }
}
