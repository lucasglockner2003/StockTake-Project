function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage || null;
}

export function normalizeStoredArray(value) {
  return Array.isArray(value) ? value : [];
}

export function readJsonStorageItem(storageKey, fallbackValue, normalizeValue) {
  const storage = getBrowserStorage();

  if (!storage) {
    return typeof normalizeValue === "function"
      ? normalizeValue(fallbackValue)
      : fallbackValue;
  }

  try {
    const rawValue = storage.getItem(storageKey);

    if (!rawValue) {
      return typeof normalizeValue === "function"
        ? normalizeValue(fallbackValue)
        : fallbackValue;
    }

    const parsedValue = JSON.parse(rawValue);
    return typeof normalizeValue === "function"
      ? normalizeValue(parsedValue)
      : parsedValue;
  } catch {
    return typeof normalizeValue === "function"
      ? normalizeValue(fallbackValue)
      : fallbackValue;
  }
}

export function writeJsonStorageItem(storageKey, value) {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function removeStorageItem(storageKey) {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(storageKey);
  } catch {
    // ignore storage errors
  }
}
