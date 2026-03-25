import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { Public } from '../../common/auth/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';

type AuthenticatedRequest = Request & {
  user?: {
    sub: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  getCurrentSession(@Req() request: AuthenticatedRequest) {
    if (!request.user) {
      throw new UnauthorizedException('Authenticated user was not found in the request.');
    }

    return this.authService.getAuthenticatedProfile(request.user.sub);
  }
}
