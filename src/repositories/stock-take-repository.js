import {
  readJsonStorageItem,
  removeStorageItem,
  writeJsonStorageItem,
} from "../services/browser-storage";

const STOCK_TAKE_STORAGE_KEY = "smartops-quantities";

function normalizeQuantities(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function getStockTakeQuantities() {
  return readJsonStorageItem(STOCK_TAKE_STORAGE_KEY, {}, normalizeQuantities);
}

export function saveStockTakeQuantities(quantities) {
  writeJsonStorageItem(STOCK_TAKE_STORAGE_KEY, normalizeQuantities(quantities));
}

export function clearStockTakeQuantities() {
  removeStorageItem(STOCK_TAKE_STORAGE_KEY);
}
