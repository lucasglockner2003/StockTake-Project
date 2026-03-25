import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { Prisma, Role } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const DEFAULT_PASSWORD_SALT_ROUNDS = 12;

const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private normalizeEmail(email: string) {
    return String(email || '').trim().toLowerCase();
  }

  private getPasswordSaltRounds() {
    return this.configService.get<number>(
      'PASSWORD_SALT_ROUNDS',
      DEFAULT_PASSWORD_SALT_ROUNDS,
    );
  }

  findByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  countUsers() {
    return this.prismaService.user.count();
  }

  findAllUsers() {
    return this.prismaService.user.findMany({
      select: publicUserSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findUserProfileById(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User profile was not found.');
    }

    return user;
  }

  createUser(email: string, password: string, role: Role = Role.CHEF) {
    return this.prismaService.user.create({
      data: {
        email: this.normalizeEmail(email),
        password,
        role,
      },
      select: publicUserSelect,
    });
  }

  async createUserWithPlainPassword(createUserDto: CreateUserDto) {
    const existingUser = await this.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.getPasswordSaltRounds(),
    );

    return this.createUser(createUserDto.email, hashedPassword, createUserDto.role);
  }
}
