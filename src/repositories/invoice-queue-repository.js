import {
  normalizeStoredArray,
  readJsonStorageItem,
  writeJsonStorageItem,
} from "../services/browser-storage";

const INVOICE_QUEUE_STORAGE_KEY = "smartops-invoice-intake-queue";

export function getStoredInvoiceQueue() {
  return readJsonStorageItem(
    INVOICE_QUEUE_STORAGE_KEY,
    [],
    normalizeStoredArray
  );
}

export function saveStoredInvoiceQueue(queue) {
  writeJsonStorageItem(
    INVOICE_QUEUE_STORAGE_KEY,
    normalizeStoredArray(queue)
  );
}
