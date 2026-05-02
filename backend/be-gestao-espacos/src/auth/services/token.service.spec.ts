import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS;
    delete process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS;
    delete process.env.AUTH_TOKEN_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('deve assinar e verificar token válido', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_767_225_600_000);
    const service = new TokenService();

    const token = service.sign({
      sub: 'user-id',
      email: 'ana@example.com',
      role: UserRole.Student,
    });

    expect(service.verify(token)).toMatchObject({
      sub: 'user-id',
      email: 'ana@example.com',
      role: UserRole.Student,
      iat: 1_767_225_600,
      exp: 1_767_229_200,
    });
  });

  it('deve rejeitar token malformado ou adulterado', () => {
    const service = new TokenService();
    const token = service.sign({
      sub: 'user-id',
      email: 'ana@example.com',
      role: UserRole.Student,
    });
    const [header, body] = token.split('.');

    expect(() => service.verify('token-invalido')).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      service.verify(`${header}.${body}.assinatura-invalida`),
    ).toThrow('Token inválido.');
  });

  it('deve rejeitar token expirado', () => {
    process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS = '-1';
    const service = new TokenService();

    const token = service.sign({
      sub: 'user-id',
      email: 'ana@example.com',
      role: UserRole.Student,
    });

    expect(() => service.verify(token)).toThrow('Token expirado.');
  });

  it('deve gerar hash e expiração de refresh token', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_767_225_600_000);
    process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS = '60';
    const service = new TokenService();

    expect(service.generateRefreshToken()).toHaveLength(86);
    expect(service.hashRefreshToken('refresh-token')).toHaveLength(64);
    expect(service.getRefreshTokenExpiresAt()).toEqual(
      new Date('2026-01-01T00:01:00.000Z'),
    );
  });
});
