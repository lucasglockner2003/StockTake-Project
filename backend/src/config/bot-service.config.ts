const DEVELOPMENT_BOT_SERVICE_BASE_URL = 'http://localhost:4190';
export const BOT_SERVICE_SHARED_SECRET_HEADER = 'x-bot-service-secret';
export const MINIMUM_BOT_SERVICE_SHARED_SECRET_LENGTH = 32;

export function normalizeOptionalUrl(value: string | undefined) {
  return String(value || '').trim().replace(/\/+$/, '');
}

export function resolveBotServiceBaseUrl(
  value: string | undefined,
  nodeEnv: string | undefined,
) {
  const normalizedValue = normalizeOptionalUrl(value);

  if (normalizedValue) {
    return normalizedValue;
  }

  return nodeEnv === 'development' ? DEVELOPMENT_BOT_SERVICE_BASE_URL : '';
}

export function normalizeBotServiceSharedSecret(value: string | undefined) {
  return String(value || '').trim();
}
