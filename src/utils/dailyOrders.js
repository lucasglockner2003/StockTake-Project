import { DAILY_ORDER_STATUSES } from "../constants/app";
import {
  createDailyOrdersFromPhoto,
  createDailyOrdersFromSuggestedOrder,
  ensureDailyOrdersLoaded,
  fetchDailyOrders,
  fetchDailyOrdersSummary,
  getCachedDailyOrderQueue,
  getCachedDailyOrderSummary,
  markDailyOrderReady as markDailyOrderReadyRequest,
  resetDailyOrders,
  runDailyOrderBotFill as runDailyOrderBotFillRequest,
  submitDailyOrderAfterChefApproval as submitDailyOrderAfterChefApprovalRequest,
  subscribeDailyOrderQueue as subscribeDailyOrderQueueRequest,
  unlockDailyOrder as unlockDailyOrderRequest,
  updateDailyOrderItemQuantity as updateDailyOrderItemQuantityRequest,
} from "../repositories/daily-order-repository";
import { UNKNOWN_SUPPLIER_LABEL } from "./stock";

function normalizeQuantity(value) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(numericValue, 0);
}

function getItemsById(itemsCatalog = []) {
  return (itemsCatalog || []).reduce((accumulator, item) => {
    accumulator[item.id] = item;
    return accumulator;
  }, {});
}

export function subscribeDailyOrderQueue(listener) {
  return subscribeDailyOrderQueueRequest(listener);
}

export function ensureDailyOrderQueueLoaded() {
  return ensureDailyOrdersLoaded();
}

export function refreshDailyOrderQueue() {
  return fetchDailyOrders();
}

export function refreshDailyOrderSummary() {
  return fetchDailyOrdersSummary();
}

export function getDailyOrderQueue() {
  return getCachedDailyOrderQueue();
}

export function getDailyOrderSummary() {
  return getCachedDailyOrderSummary();
}

export async function addDailyConfirmedOrdersFromPhoto(
  confirmedEntries,
  itemsCatalog = []
) {
  const itemsById = getItemsById(itemsCatalog);
  const entries = (confirmedEntries || []).map((entry) => {
    const catalogItem = itemsById[entry.itemId] || {};

    return {
      itemId: entry.itemId,
      itemName: entry.itemName || entry.displayName || "",
      quantity: normalizeQuantity(entry.quantity),
      supplier: entry.supplier || UNKNOWN_SUPPLIER_LABEL,
      unit: catalogItem.unit || "",
    };
  });

  return createDailyOrdersFromPhoto(entries);
}

export async function addDailyConfirmedOrdersFromSuggestedOrder(suggestedOrder = []) {
  const items = (suggestedOrder || []).map((item) => ({
    id: item.id,
    name: item.name || item.itemName || "",
    orderAmount: normalizeQuantity(item.orderAmount),
    unit: item.unit || "",
    supplier: item.supplier || UNKNOWN_SUPPLIER_LABEL,
  }));

  return createDailyOrdersFromSuggestedOrder(items);
}

export function getDailyOrderQueueCounts(queue = []) {
  return (queue || []).reduce(
    (counts, order) => {
      counts.total += 1;

      if (order.status === DAILY_ORDER_STATUSES.DRAFT) counts.draft += 1;
      if (order.status === DAILY_ORDER_STATUSES.READY) counts.ready += 1;
      if (order.status === DAILY_ORDER_STATUSES.FILLING_ORDER) {
        counts.fillingOrder += 1;
      }
      if (order.status === DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW) {
        counts.readyForChefReview += 1;
      }
      if (order.status === DAILY_ORDER_STATUSES.EXECUTED) counts.executed += 1;
      if (order.status === DAILY_ORDER_STATUSES.FAILED) counts.failed += 1;

      return counts;
    },
    {
      total: 0,
      draft: 0,
      ready: 0,
      fillingOrder: 0,
      readyForChefReview: 0,
      executed: 0,
      failed: 0,
    }
  );
}

export function getManualExecutionEligibleCount() {
  const summary = getDailyOrderSummary();
  return summary.ready + summary.failed;
}

export function getReadyOrdersCount() {
  return getDailyOrderSummary().ready;
}

export function hasExecutableOrders() {
  const summary = getDailyOrderSummary();
  return summary.ready > 0 || summary.failed > 0;
}

export function updateDailyOrderItemQuantity(orderId, itemIndex, nextQuantity) {
  return updateDailyOrderItemQuantityRequest(orderId, itemIndex, {
    quantity: normalizeQuantity(nextQuantity),
  });
}

export function markDailyOrderReady(orderId) {
  return markDailyOrderReadyRequest(orderId);
}

export function unlockDailyOrder(orderId) {
  return unlockDailyOrderRequest(orderId);
}

export function runDailyOrderBotFill(orderId) {
  return runDailyOrderBotFillRequest(orderId);
}

export function submitDailyOrderAfterChefApproval(orderId) {
  return submitDailyOrderAfterChefApprovalRequest(orderId);
}

export function resetDailyOrderExecutionState() {
  return resetDailyOrders();
}
