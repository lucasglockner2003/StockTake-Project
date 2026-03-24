import {
  normalizeStoredArray,
  readJsonStorageItem,
  writeJsonStorageItem,
} from "../services/browser-storage";

const DAILY_ORDER_QUEUE_STORAGE_KEY = "smartops-daily-order-queue";

export function getStoredDailyOrderQueue() {
  return readJsonStorageItem(
    DAILY_ORDER_QUEUE_STORAGE_KEY,
    [],
    normalizeStoredArray
  );
}

export function saveStoredDailyOrderQueue(queue) {
  writeJsonStorageItem(
    DAILY_ORDER_QUEUE_STORAGE_KEY,
    normalizeStoredArray(queue)
  );
}
