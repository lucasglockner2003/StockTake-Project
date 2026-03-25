import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';

import { RolesGuard } from '../../common/auth/roles.guard';
import { UsersModule } from '../users/users.module';
import { AuthSessionsRepository } from './auth-sessions.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS = 900;

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<number>(
            'JWT_ACCESS_EXPIRES_IN',
            configService.get<number>(
              'JWT_EXPIRES_IN',
              DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
            ),
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionsRepository,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule {}
