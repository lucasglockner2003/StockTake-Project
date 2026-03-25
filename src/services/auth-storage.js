import {
  readJsonStorageItem,
  removeStorageItem,
  writeJsonStorageItem,
} from "./browser-storage";

const AUTH_STORAGE_KEY = "smartops-auth-session";

function getEmptyAuthSession() {
  return {
    user: null,
  };
}

export function loadAuthSession() {
  return readJsonStorageItem(AUTH_STORAGE_KEY, getEmptyAuthSession(), (value) => ({
    user:
      value?.user && typeof value.user === "object" && !Array.isArray(value.user)
        ? value.user
        : null,
  }));
}

export function saveAuthSession(session) {
  writeJsonStorageItem(AUTH_STORAGE_KEY, {
    user:
      session?.user && typeof session.user === "object" && !Array.isArray(session.user)
        ? session.user
        : null,
  });
}

export function clearAuthSession() {
  removeStorageItem(AUTH_STORAGE_KEY);
}
