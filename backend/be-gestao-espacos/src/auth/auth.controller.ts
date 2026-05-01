import { Body, Controller, Post } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Public()
  @Post('logout')
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto);
  }
}
