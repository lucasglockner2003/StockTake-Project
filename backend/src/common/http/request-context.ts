import { Request } from 'express';

import { AccessTokenPayload } from '../../modules/auth/auth.types';

const MAX_LOG_FIELD_LENGTH = 256;
const REQUEST_ID_PATTERN = /[^a-zA-Z0-9\-_.:]/g;

export type AppRequest = Request & {
  requestId?: string;
  startedAtMs?: number;
  user?: AccessTokenPayload;
};

function normalizeLogValue(value: unknown, fallback: string) {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue.slice(0, MAX_LOG_FIELD_LENGTH);
}

export function sanitizeIncomingRequestId(value: unknown) {
  const normalizedValue = normalizeLogValue(value, '').replace(
    REQUEST_ID_PATTERN,
    '',
  );

  return normalizedValue.slice(0, 128);
}

export function getRequestId(request: Request) {
  return normalizeLogValue((request as AppRequest).requestId, 'unknown');
}

export function getRequestUserId(request: Request) {
  return normalizeLogValue((request as AppRequest).user?.sub, 'anonymous');
}

export function getRequestPath(request: Request) {
  return normalizeLogValue(request.originalUrl || request.url, '/');
}

export function getRequestIp(request: Request) {
  return normalizeLogValue(request.ip, 'unknown');
}

export function buildRequestLogMessage(
  event: string,
  request: Request,
  extraFields: Record<string, string | number | boolean | undefined> = {},
) {
  const baseFields: Record<string, string | number | boolean> = {
    event,
    requestId: getRequestId(request),
    userId: getRequestUserId(request),
    method: normalizeLogValue(request.method, 'UNKNOWN'),
    path: getRequestPath(request),
    ip: getRequestIp(request),
  };

  const fields = {
    ...baseFields,
    ...extraFields,
  };

  return Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
}
