import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findOne: jest.Mock;
  };
  let refreshTokensRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  const passwordService = {
    compare: jest.fn(),
  };
  const tokenService = {
    sign: jest.fn(),
    generateRefreshToken: jest.fn(),
    hashRefreshToken: jest.fn(),
    getRefreshTokenExpiresAt: jest.fn(),
  };

  const user: User = {
    id: 'user-id',
    name: 'Ana Souza',
    email: 'ana.souza@example.com',
    password: 'password-hasheada',
    role: UserRole.Student,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    usersRepository = {
      findOne: jest.fn(),
    };
    refreshTokensRepository = {
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(),
    };
    passwordService.compare.mockReset();
    tokenService.sign.mockReset();
    tokenService.generateRefreshToken.mockReset();
    tokenService.hashRefreshToken.mockReset();
    tokenService.getRefreshTokenExpiresAt.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokensRepository,
        },
        {
          provide: PasswordService,
          useValue: passwordService,
        },
        {
          provide: TokenService,
          useValue: tokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('deve autenticar user e retornar token', async () => {
    usersRepository.findOne.mockResolvedValue(user);
    passwordService.compare.mockReturnValue(true);
    tokenService.sign.mockReturnValue('token-assinado');
    tokenService.generateRefreshToken.mockReturnValue('refresh-token');
    tokenService.hashRefreshToken.mockReturnValue('refresh-token-hash');
    tokenService.getRefreshTokenExpiresAt.mockReturnValue(
      new Date('2026-01-08T00:00:00.000Z'),
    );

    const result = await service.login({
      email: user.email,
      password: 'password-teste',
    });

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { email: user.email },
    });
    expect(passwordService.compare).toHaveBeenCalledWith(
      'password-teste',
      user.password,
    );
    expect(tokenService.sign).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    expect(refreshTokensRepository.create).toHaveBeenCalledWith({
      user,
      userId: user.id,
      tokenHash: 'refresh-token-hash',
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
      revokedAt: null,
    });
    expect(refreshTokensRepository.save).toHaveBeenCalledWith({
      user,
      userId: user.id,
      tokenHash: 'refresh-token-hash',
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
      revokedAt: null,
    });
    expect(result).toEqual({
      accessToken: 'token-assinado',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });

  it('deve lançar erro com credenciais inválidas', async () => {
    usersRepository.findOne.mockResolvedValue(user);
    passwordService.compare.mockReturnValue(false);

    await expect(
      service.login({ email: user.email, password: 'password-errada' }),
    ).rejects.toThrow('Credenciais inválidas.');
    expect(tokenService.sign).not.toHaveBeenCalled();
    expect(refreshTokensRepository.save).not.toHaveBeenCalled();
  });

  it('deve bloquear login de user desativado', async () => {
    usersRepository.findOne.mockResolvedValue({
      ...user,
      active: false,
    });
    passwordService.compare.mockReturnValue(true);

    await expect(
      service.login({ email: user.email, password: 'password-teste' }),
    ).rejects.toThrow('Credenciais inválidas.');
    expect(tokenService.sign).not.toHaveBeenCalled();
    expect(refreshTokensRepository.save).not.toHaveBeenCalled();
  });

  it('deve rotacionar refresh token e retornar nova sessão', async () => {
    const refreshToken = {
      id: 'refresh-id',
      userId: user.id,
      user,
      tokenHash: 'old-refresh-token-hash',
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
      revokedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    tokenService.hashRefreshToken
      .mockReturnValueOnce('old-refresh-token-hash')
      .mockReturnValueOnce('new-refresh-token-hash');
    tokenService.generateRefreshToken.mockReturnValue('new-refresh-token');
    tokenService.getRefreshTokenExpiresAt.mockReturnValue(
      new Date('2026-01-08T00:00:00.000Z'),
    );
    tokenService.sign.mockReturnValue('novo-access-token');
    refreshTokensRepository.findOne.mockResolvedValue(refreshToken);

    const result = await service.refresh({ refreshToken: 'old-refresh-token' });

    expect(refreshTokensRepository.findOne).toHaveBeenCalledWith({
      where: {
        tokenHash: 'old-refresh-token-hash',
        revokedAt: expect.any(Object),
        expiresAt: expect.any(Object),
      },
      relations: { user: true },
    });
    expect(refreshTokensRepository.save).toHaveBeenCalledWith({
      ...refreshToken,
      revokedAt: expect.any(Date),
    });
    expect(refreshTokensRepository.save).toHaveBeenCalledWith({
      user,
      userId: user.id,
      tokenHash: 'new-refresh-token-hash',
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
      revokedAt: null,
    });
    expect(result).toMatchObject({
      accessToken: 'novo-access-token',
      refreshToken: 'new-refresh-token',
      tokenType: 'Bearer',
    });
  });

  it('deve revogar refresh token no logout', async () => {
    const refreshToken = {
      id: 'refresh-id',
      userId: user.id,
      tokenHash: 'refresh-token-hash',
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
      revokedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    tokenService.hashRefreshToken.mockReturnValue('refresh-token-hash');
    refreshTokensRepository.findOne.mockResolvedValue(refreshToken);

    const result = await service.logout({ refreshToken: 'refresh-token' });

    expect(refreshTokensRepository.findOne).toHaveBeenCalledWith({
      where: {
        tokenHash: 'refresh-token-hash',
        revokedAt: expect.any(Object),
      },
    });
    expect(refreshTokensRepository.save).toHaveBeenCalledWith({
      ...refreshToken,
      revokedAt: expect.any(Date),
    });
    expect(result).toEqual({ message: 'Logout realizado com sucesso.' });
  });
});
