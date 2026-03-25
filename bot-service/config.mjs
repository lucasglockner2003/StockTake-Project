export const DEFAULT_MOCK_PORTAL_URL = "http://localhost:4177";
export const BOT_SERVICE_SHARED_SECRET_HEADER = "x-bot-service-secret";
export const MINIMUM_BOT_SERVICE_SHARED_SECRET_LENGTH = 32;

export function getNodeEnv() {
  return String(process.env.NODE_ENV || "development").trim().toLowerCase() || "development";
}

export function isDevelopmentLike(nodeEnv = getNodeEnv()) {
  return nodeEnv !== "production";
}

export function resolveMockPortalBaseUrl(
  value,
  nodeEnv = getNodeEnv()
) {
  const normalizedValue = String(value || "").trim().replace(/\/+$/, "");

  if (normalizedValue) {
    return normalizedValue;
  }

  return isDevelopmentLike(nodeEnv) ? DEFAULT_MOCK_PORTAL_URL : "";
}

export function normalizeBotServiceSharedSecret(value) {
  return String(value || "").trim();
}
