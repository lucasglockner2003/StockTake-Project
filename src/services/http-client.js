const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/+$/, "");

let authToken = "";

function buildUrl(pathname) {
  const safePath = String(pathname || "").startsWith("/")
    ? pathname
    : `/${pathname}`;

  return `${API_BASE_URL}${safePath}`;
}

function buildHeaders(body, headers = {}) {
  const nextHeaders = new Headers(headers);

  if (!(body instanceof FormData) && body !== undefined && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }

  if (authToken) {
    nextHeaders.set("Authorization", `Bearer ${authToken}`);
  }

  return nextHeaders;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
}

function normalizeErrorMessage(response, payload) {
  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (Array.isArray(payload.message) && payload.message.length > 0) {
      return payload.message.join(", ");
    }

    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  }

  return `API request failed with HTTP ${response.status}.`;
}

async function request(pathname, options = {}) {
  const body = options.body;

  let response;

  try {
    response = await fetch(buildUrl(pathname), {
      method: options.method || "GET",
      headers: buildHeaders(body, options.headers),
      body:
        body === undefined || body instanceof FormData
          ? body
          : JSON.stringify(body),
      signal: options.signal,
    });
  } catch (error) {
    throw new Error(error?.message || "Failed to reach the API.");
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const nextError = new Error(normalizeErrorMessage(response, payload));
    nextError.status = response.status;
    nextError.payload = payload;
    throw nextError;
  }

  return payload;
}

export function setHttpClientToken(token) {
  authToken = typeof token === "string" ? token.trim() : "";
}

export function clearHttpClientToken() {
  authToken = "";
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export const httpClient = {
  get(pathname, options = {}) {
    return request(pathname, {
      ...options,
      method: "GET",
    });
  },
  post(pathname, body, options = {}) {
    return request(pathname, {
      ...options,
      method: "POST",
      body,
    });
  },
  put(pathname, body, options = {}) {
    return request(pathname, {
      ...options,
      method: "PUT",
      body,
    });
  },
  patch(pathname, body, options = {}) {
    return request(pathname, {
      ...options,
      method: "PATCH",
      body,
    });
  },
  delete(pathname, options = {}) {
    return request(pathname, {
      ...options,
      method: "DELETE",
    });
  },
};
