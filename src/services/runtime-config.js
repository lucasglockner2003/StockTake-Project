const DEFAULT_PRODUCTION_API_BASE_URL = "https://stocktake-project.onrender.com/api";
const DEFAULT_DEVELOPMENT_API_BASE_URL = "http://localhost:3000/api";
const DEFAULT_DEVELOPMENT_BOT_SERVICE_URL = "http://localhost:4190";
const DEFAULT_DEVELOPMENT_MOCK_PORTAL_URL = "http://localhost:4177";
const DEFAULT_DEVELOPMENT_PHOTO_OCR_API_BASE_URL = "http://localhost:3001";
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
    devDefault: DEFAULT_DEVELOPMENT_API_BASE_URL,
    prodDefault: DEFAULT_PRODUCTION_API_BASE_URL,
  }),
  photoOcrApiBaseUrl: resolveBaseUrl(import.meta.env.VITE_PHOTO_OCR_API_BASE_URL, {
    devDefault: DEFAULT_DEVELOPMENT_PHOTO_OCR_API_BASE_URL,
  }),
  botServiceBaseUrl: resolveBaseUrl(import.meta.env.VITE_DAILY_ORDER_BOT_SERVICE_URL, {
    devDefault: DEFAULT_DEVELOPMENT_BOT_SERVICE_URL,
  }),
  mockPortalUrl: resolveBaseUrl(import.meta.env.VITE_MOCK_PORTAL_URL, {
    devDefault: DEFAULT_DEVELOPMENT_MOCK_PORTAL_URL,
  }),
  botServiceTimeoutMs: resolveNumber(
    import.meta.env.VITE_BOT_SERVICE_TIMEOUT_MS,
    DEFAULT_BOT_SERVICE_TIMEOUT_MS
  ),
};
