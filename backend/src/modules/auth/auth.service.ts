import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { Role } from '../../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private isPublicRegistrationEnabled() {
    return this.configService.get<boolean>('AUTH_ALLOW_PUBLIC_REGISTRATION', false);
  }

  async register(registerDto: RegisterDto) {
    if (!this.isPublicRegistrationEnabled()) {
      throw new ForbiddenException(
        'Public registration is disabled. Seed the initial admin account instead.',
      );
    }

    const usersCount = await this.usersService.countUsers();

    if (usersCount > 0) {
      throw new ForbiddenException(
        'Bootstrap registration is only available before the first user exists.',
      );
    }

    const createUserDto: CreateUserDto = {
      email: registerDto.email,
      password: registerDto.password,
      role: Role.ADMIN,
    };
    const user = await this.usersService.createUserWithPlainPassword(createUserDto);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<number>('JWT_EXPIRES_IN', 86400),
    };
  }

  getAuthenticatedProfile(userId: string) {
    return this.usersService.findUserProfileById(userId);
  }
}
