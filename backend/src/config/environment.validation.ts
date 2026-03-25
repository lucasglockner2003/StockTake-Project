import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

function transformBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  return value;
}

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  BOT_SERVICE_BASE_URL?: string;

  @IsOptional()
  @IsString()
  CORS_ALLOWED_ORIGINS?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  JWT_EXPIRES_IN?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(15)
  PASSWORD_SALT_ROUNDS?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  BOT_SERVICE_TIMEOUT_MS?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV?: 'development' | 'test' | 'production';

  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  AUTH_ALLOW_PUBLIC_REGISTRATION?: boolean;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }

  return validatedConfig;
}
