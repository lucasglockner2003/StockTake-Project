import {
  getTodayStockTake,
  getTodayStockTakeSummary,
  resetTodayStockTake,
  updateStockTakeItem,
} from "../services/stock-take-service";

function normalizeTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function buildStockItemSnapshot(item) {
  return {
    name: item.name,
    supplier: item.supplier || "",
    unit: item.unit,
    area: item.area,
    idealStock: Number(item.idealStock || 0),
    critical: Boolean(item.critical),
  };
}

function mapStockTakeItemsToQuantities(items = []) {
  return items.reduce((accumulator, item) => {
    const quantity = normalizeNumber(item?.quantity);

    if (quantity !== null) {
      accumulator[item.itemId] = quantity;
    }

    return accumulator;
  }, {});
}

function normalizeStockTakePayload(payload) {
  return {
    stockTakeId: payload?.stockTakeId || "",
    takeDate: String(payload?.takeDate || ""),
    lastSavedAt: normalizeTimestamp(payload?.lastUpdatedAt),
    summary: payload?.summary || null,
    quantities: mapStockTakeItemsToQuantities(payload?.items),
  };
}

function normalizeStockTakeMutationPayload(payload) {
  return {
    itemId: Number(payload?.itemId || 0),
    quantity: normalizeNumber(payload?.quantity),
    lastSavedAt: normalizeTimestamp(payload?.updatedAt),
    summary: payload?.summary || null,
  };
}

function normalizeStockTakeSummaryPayload(payload) {
  return {
    ...payload,
    lastSavedAt: normalizeTimestamp(payload?.lastUpdatedAt),
  };
}

export async function fetchTodayStockTake() {
  const payload = await getTodayStockTake();
  return normalizeStockTakePayload(payload);
}

export async function saveStockTakeItemQuantity(item, quantity) {
  const payload = await updateStockTakeItem(item.id, {
    quantity: normalizeNumber(quantity),
    stockItem: buildStockItemSnapshot(item),
  });

  return normalizeStockTakeMutationPayload(payload);
}

export async function resetStockTake() {
  const payload = await resetTodayStockTake();
  return normalizeStockTakePayload(payload);
}

export async function fetchTodayStockTakeSummary() {
  const payload = await getTodayStockTakeSummary();
  return normalizeStockTakeSummaryPayload(payload);
}
