import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.ADMIN)
  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUserWithPlainPassword(createUserDto);
  }

  @Roles(Role.ADMIN)
  @Get()
  findAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Get('me')
  getCurrentUserProfile(
    @Req()
    request: Request & {
      user?: {
        sub: string;
      };
    },
  ) {
    if (!request.user) {
      throw new UnauthorizedException('Authenticated user was not found in the request.');
    }

    return this.usersService.findUserProfileById(request.user.sub);
  }
}
