import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Request, Response, json, urlencoded } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { getRequestId, getRequestPath } from './common/http/request-context';
import { requestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { SanitizeInputPipe } from './common/pipes/sanitize-input.pipe';

const DEVELOPMENT_CORS_ALLOWED_ORIGINS = ['http://localhost:5173'];

function parseAllowedOrigins(rawOrigins: string | undefined): string[] {
  return String(rawOrigins || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function getAllowedOrigins(): string[] {
  const configuredOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEVELOPMENT_CORS_ALLOWED_ORIGINS;
  }

  throw new Error(
    'CORS_ALLOWED_ORIGINS must be configured in production with one or more comma-separated origins.',
  );
}

type HttpAdapterApplication = {
  disable?: (setting: string) => void;
  set?: (setting: string, value: unknown) => void;
};

function getNumberEnv(name: string, fallbackValue: number) {
  const numericValue = Number(process.env[name]);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : fallbackValue;
}

function createRateLimitHandler(message: string) {
  return (request: Request, response: Response) => {
    response.status(429).json({
      statusCode: 429,
      error: 'TooManyRequests',
      message,
      timestamp: new Date().toISOString(),
      path: getRequestPath(request),
      requestId: getRequestId(request),
    });
  };
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = getAllowedOrigins();
  const httpApplication = app.getHttpAdapter().getInstance() as HttpAdapterApplication;
  const apiLimiter = rateLimit({
    windowMs: getNumberEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    limit: getNumberEnv('RATE_LIMIT_MAX_REQUESTS', 300),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (request) => request.path === '/health',
    handler: createRateLimitHandler('Too many requests. Please try again later.'),
  });
  const authLimiter = rateLimit({
    windowMs: getNumberEnv('AUTH_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000),
    limit: getNumberEnv('AUTH_RATE_LIMIT_MAX_REQUESTS', 20),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: createRateLimitHandler('Too many authentication attempts. Please try again later.'),
  });

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204,
  });

  app.enableShutdownHooks();
  httpApplication.disable?.('x-powered-by');
  httpApplication.set?.('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestLoggingMiddleware);
  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ApiExceptionFilter(isProduction));
  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
      transform: true,
      disableErrorMessages: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  await app.listen(port, '0.0.0.0');
  logger.log(`Backend running on port ${port}`);
  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  const message =
    error instanceof Error ? error.message : 'Unexpected bootstrap failure.';
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error(message, stack);
  process.exit(1);
});
