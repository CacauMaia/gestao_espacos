import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken])],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService],
  exports: [PasswordService, TokenService],
})
export class AuthModule {}
