import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { AppModule } from '../app.module';
import { Role } from '../generated/prisma/client';
import { CreateUserDto } from '../modules/users/dto/create-user.dto';
import { UsersService } from '../modules/users/users.service';

function readRequiredSeedValue(configService: ConfigService, key: string) {
  const value = configService.get<string>(key);

  if (!value || !value.trim()) {
    throw new Error(`${key} is required to run the admin seed.`);
  }

  return value.trim();
}

function buildSeedAdminDto(configService: ConfigService) {
  const dto = plainToInstance(CreateUserDto, {
    email: readRequiredSeedValue(configService, 'ADMIN_SEED_EMAIL'),
    password: readRequiredSeedValue(configService, 'ADMIN_SEED_PASSWORD'),
    role: Role.ADMIN,
  });

  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    throw new Error('ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD is invalid.');
  }

  return dto;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const configService = app.get(ConfigService);
    const usersService = app.get(UsersService);
    const seedAdminDto = buildSeedAdminDto(configService);
    const result = await usersService.ensureUserWithPlainPassword(seedAdminDto);
    const action = result.created
      ? 'created'
      : result.updated
        ? 'updated'
        : 'already up to date';

    console.log(`Admin user ${action}: ${result.user.email} (${result.user.role}).`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Failed to run the admin seed.';

  console.error(message);
  process.exitCode = 1;
});
