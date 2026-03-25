import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from "./auth-storage";
import {
  clearHttpClientToken,
  httpClient,
  setHttpClientUnauthorizedHandler,
  setHttpClientToken,
} from "./http-client";

export function restoreAuthSession() {
  const session = loadAuthSession();
  setHttpClientToken("");
  return session;
}

export function persistAuthSession(session) {
  saveAuthSession(session);
  setHttpClientToken(session?.token || "");
}

export async function login(credentials) {
  return httpClient.post("/auth/login", credentials);
}

export async function refreshSession() {
  return httpClient.refreshSession();
}

export async function register(payload) {
  return httpClient.post("/auth/register", payload);
}

export async function getMe() {
  return httpClient.get("/auth/me");
}

export async function logout() {
  try {
    await httpClient.post(
      "/auth/logout",
      {},
      {
        skipAuthRefresh: true,
      }
    );
  } finally {
    logoutLocal();
  }
}

export function logoutLocal() {
  clearAuthSession();
  clearHttpClientToken();
}

export function registerAuthSessionExpiredHandler(handler) {
  return setHttpClientUnauthorizedHandler(handler);
}
