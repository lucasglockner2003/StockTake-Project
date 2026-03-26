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

import {
  MINIMUM_BOT_SERVICE_SHARED_SECRET_LENGTH,
  normalizeOptionalUrl,
} from './bot-service.config';

const MINIMUM_JWT_SECRET_LENGTH = 32;
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

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

function validateProductionServiceUrl(value: string, fieldName: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${fieldName} contains an invalid URL: ${value}`);
  }

  if (LOCALHOST_HOSTNAMES.has(url.hostname)) {
    throw new Error(
      `${fieldName} cannot point to localhost in production. Configure a reachable service URL.`,
    );
  }

  if (url.protocol !== 'https:') {
    throw new Error(
      `${fieldName} must use https in production. Configure the bot-service URL with an https endpoint.`,
    );
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
  BOT_SERVICE_SHARED_SECRET?: string;

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

  const nodeEnv = validatedConfig.NODE_ENV || 'development';
  const botServiceBaseUrl = normalizeOptionalUrl(
    validatedConfig.BOT_SERVICE_BASE_URL,
  );
  const botServiceSharedSecret = String(
    validatedConfig.BOT_SERVICE_SHARED_SECRET || '',
  ).trim();
  const legacySecret = String(validatedConfig.JWT_SECRET || '').trim();
  const accessSecret = String(validatedConfig.JWT_ACCESS_SECRET || '').trim();
  const refreshSecret = String(validatedConfig.JWT_REFRESH_SECRET || '').trim();
  const canUseLegacySecretFallback =
    nodeEnv === 'development' && legacySecret.length > 0;
  const resolvedAccessSecret =
    accessSecret || (canUseLegacySecretFallback ? legacySecret : '');
  const resolvedRefreshSecret =
    refreshSecret || (canUseLegacySecretFallback ? legacySecret : '');

  if (
    nodeEnv !== 'development' &&
    legacySecret &&
    (!accessSecret || !refreshSecret)
  ) {
    throw new Error(
      'JWT_SECRET fallback is allowed only in development. Configure both JWT_ACCESS_SECRET and JWT_REFRESH_SECRET explicitly.',
    );
  }

  if (!resolvedAccessSecret || !resolvedRefreshSecret) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required. In development only, JWT_SECRET can be used as a legacy fallback.',
    );
  }

  if (
    resolvedAccessSecret.length < MINIMUM_JWT_SECRET_LENGTH ||
    resolvedRefreshSecret.length < MINIMUM_JWT_SECRET_LENGTH
  ) {
    throw new Error(
      `JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must each contain at least ${MINIMUM_JWT_SECRET_LENGTH} characters.`,
    );
  }

  validatedConfig.JWT_ACCESS_SECRET = resolvedAccessSecret;
  validatedConfig.JWT_REFRESH_SECRET = resolvedRefreshSecret;
  validatedConfig.BOT_SERVICE_BASE_URL = botServiceBaseUrl;
  validatedConfig.BOT_SERVICE_SHARED_SECRET = botServiceSharedSecret;

  if (
    botServiceSharedSecret &&
    botServiceSharedSecret.length < MINIMUM_BOT_SERVICE_SHARED_SECRET_LENGTH
  ) {
    throw new Error(
      `BOT_SERVICE_SHARED_SECRET must contain at least ${MINIMUM_BOT_SERVICE_SHARED_SECRET_LENGTH} characters when configured.`,
    );
  }

  if (nodeEnv === 'production') {
    if (botServiceBaseUrl) {
      validateProductionServiceUrl(botServiceBaseUrl, 'BOT_SERVICE_BASE_URL');
    }

    if (botServiceBaseUrl && !botServiceSharedSecret) {
      throw new Error(
        'BOT_SERVICE_SHARED_SECRET must be configured in production when BOT_SERVICE_BASE_URL is set.',
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
