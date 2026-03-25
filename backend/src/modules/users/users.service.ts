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

const authUserSelect = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

type EnsureUserWithPlainPasswordResult = {
  user: PublicUser;
  created: boolean;
  updated: boolean;
};

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

  private async hashPassword(password: string) {
    return bcrypt.hash(password, this.getPasswordSaltRounds());
  }

  findByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  countUsers() {
    return this.prismaService.user.count();
  }

  async findUserForAuthById(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: authUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User profile was not found.');
    }

    return user;
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

    const hashedPassword = await this.hashPassword(createUserDto.password);

    return this.createUser(createUserDto.email, hashedPassword, createUserDto.role);
  }

  async ensureUserWithPlainPassword(
    createUserDto: CreateUserDto,
  ): Promise<EnsureUserWithPlainPasswordResult> {
    const normalizedEmail = this.normalizeEmail(createUserDto.email);
    const existingUser = await this.findByEmail(normalizedEmail);

    if (!existingUser) {
      const user = await this.createUserWithPlainPassword({
        ...createUserDto,
        email: normalizedEmail,
      });

      return {
        user,
        created: true,
        updated: false,
      };
    }

    const isPasswordValid = await bcrypt.compare(
      createUserDto.password,
      existingUser.password,
    );

    if (existingUser.role === createUserDto.role && isPasswordValid) {
      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          createdAt: existingUser.createdAt,
        },
        created: false,
        updated: false,
      };
    }

    const nextPassword = isPasswordValid
      ? existingUser.password
      : await this.hashPassword(createUserDto.password);
    const user = await this.prismaService.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        password: nextPassword,
        role: createUserDto.role,
      },
      select: publicUserSelect,
    });

    return {
      user,
      created: false,
      updated: true,
    };
  }
}
