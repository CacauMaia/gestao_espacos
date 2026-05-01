import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
    });

    if (
      !user ||
      !this.passwordService.compare(loginDto.password, user.password)
    ) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.criarRespostaAutenticada(user);
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const refreshToken = await this.buscarRefreshTokenValido(
      refreshTokenDto.refreshToken,
    );

    const authenticatedResponse = await this.criarRespostaAutenticada(
      refreshToken.user,
    );

    refreshToken.revokedAt = new Date();
    await this.refreshTokensRepository.save(refreshToken);

    return authenticatedResponse;
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = this.validarRefreshTokenInformado(
      refreshTokenDto.refreshToken,
    );

    const refreshToken = await this.refreshTokensRepository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
      },
    });

    if (refreshToken) {
      refreshToken.revokedAt = new Date();
      await this.refreshTokensRepository.save(refreshToken);
    }

    return { message: 'Logout realizado com sucesso.' };
  }

  private async criarRespostaAutenticada(user: User) {
    const refreshToken = this.tokenService.generateRefreshToken();
    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        user,
        userId: user.id,
        tokenHash: this.tokenService.hashRefreshToken(refreshToken),
        expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
        revokedAt: null,
      }),
    );

    return {
      accessToken: this.tokenService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      refreshToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async buscarRefreshTokenValido(
    rawRefreshToken?: string,
  ): Promise<RefreshToken> {
    const tokenHash = this.validarRefreshTokenInformado(rawRefreshToken);

    const refreshToken = await this.refreshTokensRepository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: {
        user: true,
      },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    return refreshToken;
  }

  private validarRefreshTokenInformado(refreshToken?: string): string {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException('Refresh token não informado.');
    }

    return this.tokenService.hashRefreshToken(refreshToken);
  }
}
