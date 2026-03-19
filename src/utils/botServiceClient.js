const BOT_SERVICE_BASE_URL = String(
  import.meta.env.VITE_DAILY_ORDER_BOT_SERVICE_URL || "http://localhost:4190"
).replace(/\/+$/, "");

const BOT_SERVICE_TIMEOUT_MS = Number(
  import.meta.env.VITE_BOT_SERVICE_TIMEOUT_MS || 30000
);

function buildUrl(pathname) {
  const safePath = String(pathname || "").startsWith("/")
    ? pathname
    : `/${pathname}`;
  return `${BOT_SERVICE_BASE_URL}${safePath}`;
}

function toAbsoluteAssetPath(value) {
  const pathValue = String(value || "").trim();
  if (!pathValue) return "";

  if (
    pathValue.startsWith("http://") ||
    pathValue.startsWith("https://") ||
    pathValue.startsWith("data:image")
  ) {
    return pathValue;
  }

  if (pathValue.startsWith("/")) {
    return `${BOT_SERVICE_BASE_URL}${pathValue}`;
  }

  return `${BOT_SERVICE_BASE_URL}/${pathValue}`;
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
    screenshotPath: toAbsoluteAssetPath(payload.screenshotPath),
    screenshot: toAbsoluteAssetPath(payload.screenshot),
    reviewScreenshot: toAbsoluteAssetPath(payload.reviewScreenshot),
    finalScreenshot: toAbsoluteAssetPath(payload.finalScreenshot),
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
