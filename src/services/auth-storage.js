import {
  readJsonStorageItem,
  removeStorageItem,
  writeJsonStorageItem,
} from "./browser-storage";

const AUTH_STORAGE_KEY = "smartops-auth-session";

function getEmptyAuthSession() {
  return {
    token: "",
    user: null,
  };
}

export function loadAuthSession() {
  return readJsonStorageItem(AUTH_STORAGE_KEY, getEmptyAuthSession(), (value) => ({
    token: typeof value?.token === "string" ? value.token : "",
    user:
      value?.user && typeof value.user === "object" && !Array.isArray(value.user)
        ? value.user
        : null,
  }));
}

export function saveAuthSession(session) {
  writeJsonStorageItem(AUTH_STORAGE_KEY, {
    ...getEmptyAuthSession(),
    ...session,
  });
}

export function clearAuthSession() {
  removeStorageItem(AUTH_STORAGE_KEY);
}
