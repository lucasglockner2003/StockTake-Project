import {
  clearSupplierHistory as clearSupplierHistoryRequest,
  getSupplierHistory as getSupplierHistoryRequest,
  getSupplierHistoryById as getSupplierHistoryByIdRequest,
  getSupplierHistoryBySupplier as getSupplierHistoryBySupplierRequest,
} from "../services/supplier-history-service";

let cachedSupplierHistory = [];
let hasLoadedSupplierHistory = false;

const supplierHistoryListeners = new Set();

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeHistoryItem(item = {}) {
  return {
    name: normalizeString(item?.name || item?.itemName),
    itemId:
      item?.itemId === null || item?.itemId === undefined
        ? null
        : normalizeNumber(item?.itemId, 0),
    quantity: normalizeNumber(item?.quantity, 0),
    unit: normalizeString(item?.unit),
  };
}

function normalizeSupplierHistoryEntry(entry = {}) {
  const items = Array.isArray(entry?.items)
    ? entry.items.map((item) => normalizeHistoryItem(item))
    : [];

  return {
    id: normalizeString(entry?.id),
    dailyOrderId: normalizeString(entry?.dailyOrderId || entry?.jobId) || null,
    jobId: normalizeString(entry?.jobId || entry?.dailyOrderId) || null,
    supplier: normalizeString(entry?.supplier || entry?.supplierName),
    supplierName: normalizeString(entry?.supplierName || entry?.supplier),
    items,
    totalItems: normalizeNumber(entry?.totalItems, items.length),
    totalQuantity: normalizeNumber(entry?.totalQuantity, 0),
    status: normalizeString(entry?.status, "pending"),
    revisionNumber: Math.max(normalizeNumber(entry?.revisionNumber, 1), 1),
    createdAt: normalizeString(entry?.createdAt),
    updatedAt: normalizeString(entry?.updatedAt || entry?.createdAt),
    timestamp: normalizeString(
      entry?.timestamp,
      entry?.updatedAt || entry?.createdAt
    ),
    snapshotTimestamp: normalizeString(
      entry?.snapshotTimestamp,
      entry?.createdAt || entry?.updatedAt
    ),
    dailyOrderStatus: normalizeString(entry?.dailyOrderStatus),
  };
}

function sortSupplierHistory(history = []) {
  return history.slice().sort((left, right) => {
    return (
      new Date(right.snapshotTimestamp || right.createdAt || 0).getTime() -
      new Date(left.snapshotTimestamp || left.createdAt || 0).getTime()
    );
  });
}

function emitSupplierHistoryChange() {
  supplierHistoryListeners.forEach((listener) => {
    listener();
  });
}

function setCachedSupplierHistory(history) {
  cachedSupplierHistory = sortSupplierHistory(
    (history || []).map((entry) => normalizeSupplierHistoryEntry(entry))
  );
  hasLoadedSupplierHistory = true;
  emitSupplierHistoryChange();
}

export function subscribeSupplierHistory(listener) {
  supplierHistoryListeners.add(listener);

  return () => {
    supplierHistoryListeners.delete(listener);
  };
}

export function getCachedSupplierHistory() {
  return cachedSupplierHistory.slice();
}

export async function fetchSupplierHistory() {
  const history = await getSupplierHistoryRequest();
  setCachedSupplierHistory(history);
  return getCachedSupplierHistory();
}

export async function ensureSupplierHistoryLoaded() {
  if (hasLoadedSupplierHistory) {
    return getCachedSupplierHistory();
  }

  return fetchSupplierHistory();
}

export async function fetchSupplierHistoryById(historyId) {
  const history = await getSupplierHistoryByIdRequest(historyId);
  const normalizedHistory = normalizeSupplierHistoryEntry(history);
  const nextHistory = [
    normalizedHistory,
    ...cachedSupplierHistory.filter((entry) => entry.id !== normalizedHistory.id),
  ];
  setCachedSupplierHistory(nextHistory);
  return normalizedHistory;
}

export async function fetchSupplierHistoryBySupplier(supplierId) {
  const history = await getSupplierHistoryBySupplierRequest(supplierId);
  return sortSupplierHistory(
    (history || []).map((entry) => normalizeSupplierHistoryEntry(entry))
  );
}

export async function removeSupplierHistory() {
  const mutation = await clearSupplierHistoryRequest();

  if (mutation?.ok) {
    setCachedSupplierHistory([]);
  }

  return {
    ...mutation,
  };
}
