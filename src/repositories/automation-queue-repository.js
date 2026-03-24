import {
  normalizeStoredArray,
  readJsonStorageItem,
  removeStorageItem,
  writeJsonStorageItem,
} from "../services/browser-storage";

const AUTOMATION_QUEUE_STORAGE_KEY = "smartops-automation-queue";
const SUPPLIER_ORDER_HISTORY_STORAGE_KEY = "smartops-supplier-order-history";

export function getStoredAutomationQueue() {
  return readJsonStorageItem(
    AUTOMATION_QUEUE_STORAGE_KEY,
    [],
    normalizeStoredArray
  );
}

export function saveStoredAutomationQueue(queue) {
  writeJsonStorageItem(
    AUTOMATION_QUEUE_STORAGE_KEY,
    normalizeStoredArray(queue)
  );
}

export function clearStoredAutomationQueue() {
  removeStorageItem(AUTOMATION_QUEUE_STORAGE_KEY);
}

export function getStoredSupplierOrderHistory() {
  return readJsonStorageItem(
    SUPPLIER_ORDER_HISTORY_STORAGE_KEY,
    [],
    normalizeStoredArray
  );
}

export function saveStoredSupplierOrderHistory(history) {
  writeJsonStorageItem(
    SUPPLIER_ORDER_HISTORY_STORAGE_KEY,
    normalizeStoredArray(history)
  );
}

export function clearStoredSupplierOrderHistory() {
  removeStorageItem(SUPPLIER_ORDER_HISTORY_STORAGE_KEY);
}
