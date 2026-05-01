import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../services/token.service';

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Token não informado.');
    }

    request.user = this.tokenService.verify(token);

    return true;
  }
}
