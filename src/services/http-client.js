import axios from "axios";

import { runtimeConfig } from "./runtime-config";

const API_BASE_URL = runtimeConfig.apiBaseUrl;

let authToken = "";
let unauthorizedHandler = null;
let refreshRequestPromise = null;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

function isAuthEndpoint(url) {
  const normalizedUrl = String(url || "");

  return (
    normalizedUrl.includes("/auth/login") ||
    normalizedUrl.includes("/auth/register") ||
    normalizedUrl.includes("/auth/refresh") ||
    normalizedUrl.includes("/auth/logout")
  );
}

function normalizeErrorMessage(status, payload, fallbackMessage) {
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

  if (typeof fallbackMessage === "string" && fallbackMessage.trim()) {
    return fallbackMessage;
  }

  return status
    ? `API request failed with HTTP ${status}.`
    : "Failed to reach the API.";
}

function createNormalizedError(error) {
  const payload = error?.response?.data || null;
  const status = Number(error?.response?.status || 0) || undefined;
  const normalizedError = new Error(
    normalizeErrorMessage(status, payload, error?.message)
  );

  normalizedError.status = status;
  normalizedError.payload = payload;

  return normalizedError;
}

async function refreshAccessToken() {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  if (!refreshRequestPromise) {
    refreshRequestPromise = axiosClient
      .post(
        "/auth/refresh",
        {},
        {
          skipAuthRefresh: true,
          skipAuthToken: true,
        }
      )
      .then((response) => {
        const nextAccessToken =
          typeof response?.data?.accessToken === "string"
            ? response.data.accessToken
            : "";

        if (!nextAccessToken) {
          throw new Error("Authentication token was not returned by the API.");
        }

        setHttpClientToken(nextAccessToken);
        return response.data;
      })
      .catch((error) => {
        clearHttpClientToken();
        throw createNormalizedError(error);
      })
      .finally(() => {
        refreshRequestPromise = null;
      });
  }

  return refreshRequestPromise;
}

axiosClient.interceptors.request.use((config) => {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  const nextConfig = {
    ...config,
    headers: config.headers || {},
  };

  if (authToken && !nextConfig.skipAuthToken) {
    nextConfig.headers.Authorization = `Bearer ${authToken}`;
  }

  return nextConfig;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const shouldAttemptRefresh =
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !isAuthEndpoint(originalRequest.url);

    if (shouldAttemptRefresh) {
      originalRequest._retry = true;

      try {
        await refreshAccessToken();
        return axiosClient.request(originalRequest);
      } catch (refreshError) {
        if (typeof unauthorizedHandler === "function") {
          try {
            unauthorizedHandler(refreshError);
          } catch {
            // ignore logout handler failures
          }
        }

        throw refreshError;
      }
    }

    throw createNormalizedError(error);
  }
);

async function request(method, pathname, body, options = {}) {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  try {
    const response = await axiosClient.request({
      url: pathname,
      method,
      data: body,
      signal: options.signal,
      headers: options.headers,
      skipAuthRefresh: options.skipAuthRefresh,
      skipAuthToken: options.skipAuthToken,
    });

    return response.data;
  } catch (error) {
    throw error instanceof Error ? error : createNormalizedError(error);
  }
}

export function setHttpClientToken(token) {
  authToken = typeof token === "string" ? token.trim() : "";
}

export function clearHttpClientToken() {
  authToken = "";
}

export function setHttpClientUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export const httpClient = {
  get(pathname, options = {}) {
    return request("GET", pathname, undefined, options);
  },
  post(pathname, body, options = {}) {
    return request("POST", pathname, body, options);
  },
  put(pathname, body, options = {}) {
    return request("PUT", pathname, body, options);
  },
  patch(pathname, body, options = {}) {
    return request("PATCH", pathname, body, options);
  },
  delete(pathname, options = {}) {
    return request("DELETE", pathname, undefined, options);
  },
  refreshSession() {
    return refreshAccessToken();
  },
};
