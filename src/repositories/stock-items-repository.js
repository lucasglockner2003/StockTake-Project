import {
  createStockItem as createStockItemRequest,
  deleteStockItem as deleteStockItemRequest,
  getStockItems as getStockItemsRequest,
  updateStockItem as updateStockItemRequest,
} from "../services/stock-items-service";

let cachedStockItems = [];
let hasLoadedStockItems = false;

const stockItemListeners = new Set();

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeAliases(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((alias) => normalizeString(alias).trim())
    .filter(Boolean);
}

function normalizeStockItem(item = {}) {
  const supplierName = normalizeString(item?.supplierName || item?.supplier);

  return {
    id: normalizeNumber(item?.id, 0),
    name: normalizeString(item?.name),
    aliases: normalizeAliases(item?.aliases),
    supplier: supplierName,
    supplierName,
    unit: normalizeString(item?.unit),
    category: normalizeString(item?.category),
    area: normalizeString(item?.area),
    idealStock: normalizeNumber(item?.idealStock, 0),
    critical: Boolean(item?.critical),
    isActive: item?.isActive !== false,
    createdAt: normalizeString(item?.createdAt),
    updatedAt: normalizeString(item?.updatedAt),
  };
}

function sortStockItems(items = []) {
  return items.slice().sort((left, right) => {
    return (
      String(left.area || "").localeCompare(String(right.area || "")) ||
      String(left.name || "").localeCompare(String(right.name || "")) ||
      Number(left.id || 0) - Number(right.id || 0)
    );
  });
}

function emitStockItemsChange() {
  stockItemListeners.forEach((listener) => {
    listener();
  });
}

function setCachedStockItems(items) {
  cachedStockItems = sortStockItems(
    (items || [])
      .map((item) => normalizeStockItem(item))
      .filter((item) => item.id > 0 && item.name)
  );
  hasLoadedStockItems = true;
  emitStockItemsChange();
}

function buildStockItemPayload(item = {}) {
  return {
    name: normalizeString(item?.name).trim(),
    unit: normalizeString(item?.unit).trim(),
    category: normalizeString(item?.category).trim(),
    supplierName: normalizeString(item?.supplierName || item?.supplier).trim(),
    aliases: normalizeAliases(item?.aliases),
    area: normalizeString(item?.area).trim(),
    idealStock: Math.max(normalizeNumber(item?.idealStock, 0), 0),
    critical: Boolean(item?.critical),
    isActive: item?.isActive !== false,
  };
}

export function subscribeStockItems(listener) {
  stockItemListeners.add(listener);

  return () => {
    stockItemListeners.delete(listener);
  };
}

export function getCachedStockItems() {
  return cachedStockItems.slice();
}

export async function fetchStockItems() {
  const items = await getStockItemsRequest();
  setCachedStockItems(items);
  return getCachedStockItems();
}

export async function ensureStockItemsLoaded() {
  if (hasLoadedStockItems) {
    return getCachedStockItems();
  }

  return fetchStockItems();
}

export async function createStockItem(item) {
  const result = await createStockItemRequest(buildStockItemPayload(item));
  const normalizedItem = normalizeStockItem(result?.item || result);
  setCachedStockItems([...cachedStockItems, normalizedItem]);
  return normalizedItem;
}

export async function updateStockItem(itemId, item) {
  const result = await updateStockItemRequest(itemId, buildStockItemPayload(item));
  const normalizedItem = normalizeStockItem(result?.item || result);
  setCachedStockItems(
    cachedStockItems.map((currentItem) =>
      currentItem.id === itemId ? normalizedItem : currentItem
    )
  );
  return normalizedItem;
}

export async function removeStockItem(itemId) {
  const result = await deleteStockItemRequest(itemId);

  if (result?.ok) {
    setCachedStockItems(
      cachedStockItems.filter((currentItem) => currentItem.id !== itemId)
    );
  }

  return {
    ...result,
  };
}
