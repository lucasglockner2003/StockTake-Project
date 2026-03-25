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

function parseList(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function validateUrlList(values: string[], fieldName: string) {
  for (const value of values) {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error(`${fieldName} contains an invalid URL: ${value}`);
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`${fieldName} must use http or https URLs.`);
    }
  }
}

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_SECRET?: string;

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
  @Min(1)
  JWT_ACCESS_EXPIRES_IN?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  JWT_REFRESH_EXPIRES_IN?: number;

  @IsOptional()
  @IsString()
  AUTH_REFRESH_COOKIE_NAME?: string;

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
  @Min(1000)
  RATE_LIMIT_WINDOW_MS?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  RATE_LIMIT_MAX_REQUESTS?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  AUTH_RATE_LIMIT_WINDOW_MS?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  AUTH_RATE_LIMIT_MAX_REQUESTS?: number;

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

  if (validatedConfig.BOT_SERVICE_BASE_URL) {
    validateUrlList(
      [validatedConfig.BOT_SERVICE_BASE_URL],
      'BOT_SERVICE_BASE_URL',
    );
  }

  if (validatedConfig.CORS_ALLOWED_ORIGINS) {
    validateUrlList(
      parseList(validatedConfig.CORS_ALLOWED_ORIGINS),
      'CORS_ALLOWED_ORIGINS',
    );
  }

  const accessSecret = String(
    validatedConfig.JWT_ACCESS_SECRET || validatedConfig.JWT_SECRET || '',
  ).trim();
  const refreshSecret = String(
    validatedConfig.JWT_REFRESH_SECRET || validatedConfig.JWT_SECRET || '',
  ).trim();

  if (!accessSecret || !refreshSecret) {
    throw new Error(
      'JWT access and refresh secrets must be configured through JWT_ACCESS_SECRET/JWT_REFRESH_SECRET or JWT_SECRET.',
    );
  }

  if (validatedConfig.NODE_ENV === 'production') {
    if (
      accessSecret.length < 32 ||
      refreshSecret.length < 32 ||
      accessSecret === 'change-this-before-production' ||
      refreshSecret === 'change-this-before-production'
    ) {
      throw new Error(
        'JWT access and refresh secrets must be at least 32 characters and not use the default placeholder in production.',
      );
    }

    if (parseList(validatedConfig.CORS_ALLOWED_ORIGINS).length === 0) {
      throw new Error(
        'CORS_ALLOWED_ORIGINS must be configured in production.',
      );
    }
  }

  return validatedConfig;
}
