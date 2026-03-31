import { runtimeConfig } from "../services/runtime-config";

const BOT_SERVICE_BASE_URL = runtimeConfig.botServiceBaseUrl;
const API_BASE_URL = runtimeConfig.apiBaseUrl;
const BOT_SERVICE_TIMEOUT_MS = runtimeConfig.botServiceTimeoutMs;
const BOT_ASSET_BASE_URL =
  BOT_SERVICE_BASE_URL || String(API_BASE_URL || "").replace(/\/api$/, "");

function isLegacyMockAssetPath(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return (
    normalizedValue.includes("mock://image") ||
    normalizedValue.includes("mock.png") ||
    normalizedValue.includes("/public/mock.png") ||
    normalizedValue.includes("via.placeholder.com")
  );
}

function buildUrl(pathname) {
  const safePath = String(pathname || "").startsWith("/")
    ? pathname
    : `/${pathname}`;
  return `${BOT_SERVICE_BASE_URL}${safePath}`;
}

export function buildBotAssetUrl(value) {
  const pathValue = String(value || "").trim();
  if (!pathValue || isLegacyMockAssetPath(pathValue)) return "";

  if (
    pathValue.startsWith("http://") ||
    pathValue.startsWith("https://") ||
    pathValue.startsWith("data:image")
  ) {
    return pathValue;
  }

  if (!BOT_ASSET_BASE_URL) {
    return pathValue;
  }

  if (pathValue.startsWith("/")) {
    return `${BOT_ASSET_BASE_URL}${pathValue}`;
  }

  return `${BOT_ASSET_BASE_URL}/${pathValue}`;
}

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeStructuredResponse(data, fallback = {}) {
  const payload = data && typeof data === "object" ? data : {};

  return {
    ok: Boolean(payload.ok),
    status: payload.status || fallback.status || "failed",
    executionId: payload.executionId || fallback.executionId || "",
    phase: payload.phase || fallback.phase || "",
    errorCode: payload.errorCode || fallback.errorCode || "",
    message: payload.message || fallback.message || "",
    ...payload,
    screenshotPath: buildBotAssetUrl(payload.screenshotPath),
    screenshot: buildBotAssetUrl(payload.screenshot),
    reviewScreenshot: buildBotAssetUrl(payload.reviewScreenshot),
    finalScreenshot: buildBotAssetUrl(payload.finalScreenshot),
  };
}

function normalizeTransportError(error) {
  if (error?.name === "AbortError") {
    return {
      ok: false,
      status: "failed",
      executionId: "",
      phase: "transport-timeout",
      errorCode: "BOT_SERVICE_TIMEOUT",
      message: "Bot service request timed out.",
    };
  }

  return {
    ok: false,
    status: "failed",
    executionId: "",
    phase: "transport-error",
    errorCode: "BOT_SERVICE_UNREACHABLE",
    message: error?.message || "Failed to reach bot service.",
  };
}

async function requestBotService(pathname, options = {}) {
  if (!BOT_SERVICE_BASE_URL) {
    return {
      ok: false,
      status: "failed",
      executionId: "",
      phase: "not-configured",
      errorCode: "BOT_SERVICE_NOT_CONFIGURED",
      message: "Bot service base URL is not configured.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    BOT_SERVICE_TIMEOUT_MS
  );

  try {
    const response = await fetch(buildUrl(pathname), {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const parsed = await safeParseJson(response);

    if (response.ok) {
      return normalizeStructuredResponse(parsed, {
        status: "ok",
      });
    }

    return normalizeStructuredResponse(parsed, {
      ok: false,
      status: "failed",
      phase: "http-error",
      errorCode: "BOT_SERVICE_HTTP_ERROR",
      message: `Bot service returned HTTP ${response.status}.`,
    });
  } catch (error) {
    return normalizeTransportError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getBotServiceHealth() {
  return requestBotService("/health");
}

export function getBotServiceExecutionStatus() {
  return requestBotService("/execution-status");
}

export function executeDailyOrderFill(payload) {
  return requestBotService("/execute-daily-order", {
    method: "POST",
    body: payload,
  });
}

export function submitDailyOrder(payload) {
  return requestBotService("/submit-daily-order", {
    method: "POST",
    body: payload,
  });
}

export function executeInvoiceIntake(payload) {
  return requestBotService("/execute-invoice-intake", {
    method: "POST",
    body: payload,
  });
}
