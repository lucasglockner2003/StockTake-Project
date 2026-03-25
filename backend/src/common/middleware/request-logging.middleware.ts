import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

import {
  AppRequest,
  buildRequestLogMessage,
  sanitizeIncomingRequestId,
} from '../http/request-context';

const logger = new Logger('Http');
const SLOW_REQUEST_THRESHOLD_MS = 1_500;

export function requestLoggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const appRequest = request as AppRequest;
  const headerRequestId = Array.isArray(request.headers['x-request-id'])
    ? request.headers['x-request-id'][0]
    : request.headers['x-request-id'];
  const requestId = sanitizeIncomingRequestId(headerRequestId) || randomUUID();

  appRequest.requestId = requestId;
  appRequest.startedAtMs = Date.now();
  response.setHeader('x-request-id', requestId);

  response.on('finish', () => {
    const durationMs = Math.max(Date.now() - (appRequest.startedAtMs || 0), 0);
    const statusCode = response.statusCode;
    const message = buildRequestLogMessage('request_completed', request, {
      statusCode,
      durationMs,
    });

    if (statusCode >= 500) {
      logger.error(message);
      return;
    }

    if (statusCode >= 400 || durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn(message);
      return;
    }

    logger.log(message);
  });

  next();
}
