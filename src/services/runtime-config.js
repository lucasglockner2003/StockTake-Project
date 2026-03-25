const DEFAULT_PRODUCTION_API_BASE_URL = "https://stocktake-project.onrender.com/api";
const DEVELOPMENT_API_PROXY_PATH = "/api";
const DEVELOPMENT_BOT_SERVICE_PROXY_PATH = "/bot-service";
const DEVELOPMENT_MOCK_PORTAL_PROXY_PATH = "/mock-portal";
const DEVELOPMENT_PHOTO_OCR_PROXY_PATH = "/photo-ocr";
const DEFAULT_BOT_SERVICE_TIMEOUT_MS = 30000;

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveBaseUrl(value, options = {}) {
  const normalizedValue = normalizeBaseUrl(value);

  if (normalizedValue) {
    return normalizedValue;
  }

  if (import.meta.env.PROD) {
    return normalizeBaseUrl(options.prodDefault);
  }

  return normalizeBaseUrl(options.devDefault);
}

function resolveNumber(value, fallbackValue) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : fallbackValue;
}

export const runtimeConfig = {
  apiBaseUrl: resolveBaseUrl(import.meta.env.VITE_API_BASE_URL, {
    devDefault: DEVELOPMENT_API_PROXY_PATH,
    prodDefault: DEFAULT_PRODUCTION_API_BASE_URL,
  }),
  photoOcrApiBaseUrl: resolveBaseUrl(import.meta.env.VITE_PHOTO_OCR_API_BASE_URL, {
    devDefault: DEVELOPMENT_PHOTO_OCR_PROXY_PATH,
  }),
  botServiceBaseUrl: resolveBaseUrl(import.meta.env.VITE_DAILY_ORDER_BOT_SERVICE_URL, {
    devDefault: DEVELOPMENT_BOT_SERVICE_PROXY_PATH,
  }),
  mockPortalUrl: resolveBaseUrl(import.meta.env.VITE_MOCK_PORTAL_URL, {
    devDefault: DEVELOPMENT_MOCK_PORTAL_PROXY_PATH,
  }),
  botServiceTimeoutMs: resolveNumber(
    import.meta.env.VITE_BOT_SERVICE_TIMEOUT_MS,
    DEFAULT_BOT_SERVICE_TIMEOUT_MS
  ),
};
