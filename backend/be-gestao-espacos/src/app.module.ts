import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { SpacesModule } from './spaces/spaces.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthTokenGuard } from './auth/guards/auth-token.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AttendancesModule } from './attendances/attendances.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? 'Root@123',
      database: process.env.DB_DATABASE ?? 'gestao_espacos',
      autoLoadEntities: true,
      synchronize: false,
    }),
    AuthModule,
    UsersModule,
    SpacesModule,
    AttendancesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
