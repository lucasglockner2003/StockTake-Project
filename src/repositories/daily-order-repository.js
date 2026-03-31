import {
  createDailyOrdersFromPhoto as createDailyOrdersFromPhotoRequest,
  createDailyOrdersFromSuggestedOrder as createDailyOrdersFromSuggestedOrderRequest,
  getDailyOrders as getDailyOrdersRequest,
  getDailyOrdersSummary as getDailyOrdersSummaryRequest,
  markDailyOrderReady as markDailyOrderReadyRequest,
  resetDailyOrders as resetDailyOrdersRequest,
  runDailyOrderBotFill as runDailyOrderBotFillRequest,
  submitDailyOrderAfterChefApproval as submitDailyOrderAfterChefApprovalRequest,
  unlockDailyOrder as unlockDailyOrderRequest,
  updateDailyOrderItemQuantity as updateDailyOrderItemQuantityRequest,
} from "../services/daily-orders-service";
import { buildBotAssetUrl } from "../utils/botServiceClient";

const EMPTY_SUMMARY = Object.freeze({
  total: 0,
  draft: 0,
  ready: 0,
  fillingOrder: 0,
  readyForChefReview: 0,
  executed: 0,
  failed: 0,
});

let cachedDailyOrders = [];
let cachedDailyOrdersSummary = { ...EMPTY_SUMMARY };
let hasLoadedDailyOrders = false;
const listeners = new Set();
let mutationSequence = 0;
const latestItemMutationSequenceByKey = {};

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeNullableNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeNullableString(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function normalizeDailyOrderItem(item, fallbackIndex = 0) {
  return {
    itemIndex: normalizeNumber(item?.itemIndex, fallbackIndex),
    itemId: normalizeNumber(item?.itemId, 0),
    itemName: normalizeString(item?.itemName),
    quantity: normalizeNumber(item?.quantity, 0),
    unit: normalizeString(item?.unit),
  };
}

function normalizeDailyOrder(order) {
  const items = Array.isArray(order?.items)
    ? order.items.map((item, index) => normalizeDailyOrderItem(item, index))
    : [];

  return {
    id: normalizeString(order?.id),
    supplier: normalizeString(order?.supplier, "Unknown Supplier"),
    source: normalizeString(order?.source),
    items,
    totalQuantity: normalizeNumber(
      order?.totalQuantity,
      items.reduce((sum, item) => sum + item.quantity, 0)
    ),
    createdAt: normalizeString(order?.createdAt),
    status: normalizeString(order?.status, "draft"),
    isLocked: Boolean(order?.isLocked),
    attempts: normalizeNumber(order?.attempts, 0),
    readyAt: normalizeNullableString(order?.readyAt),
    executionStartedAt: normalizeNullableString(order?.executionStartedAt),
    executionFinishedAt: normalizeNullableString(order?.executionFinishedAt),
    executionDuration: normalizeNullableNumber(order?.executionDuration),
    filledAt: normalizeNullableString(order?.filledAt),
    readyForReviewAt: normalizeNullableString(order?.readyForReviewAt),
    executionNotes: normalizeString(order?.executionNotes),
    reviewScreenshot: buildBotAssetUrl(order?.reviewScreenshot),
    chefApprovedAt: normalizeNullableString(order?.chefApprovedAt),
    submittedAt: normalizeNullableString(order?.submittedAt),
    submitStartedAt: normalizeNullableString(order?.submitStartedAt),
    submitFinishedAt: normalizeNullableString(order?.submitFinishedAt),
    submitDuration: normalizeNullableNumber(order?.submitDuration),
    finalExecutionNotes: normalizeString(order?.finalExecutionNotes),
    finalScreenshot: buildBotAssetUrl(order?.finalScreenshot),
    orderNumber: normalizeString(order?.orderNumber),
    lastExecutionId: normalizeString(order?.lastExecutionId),
    lastExecutionPhase: normalizeString(order?.lastExecutionPhase),
    lastErrorCode: normalizeString(order?.lastErrorCode),
    lastErrorMessage: normalizeString(order?.lastErrorMessage),
  };
}

function normalizeDailyOrdersQueue(queue = []) {
  return queue.map((order) => normalizeDailyOrder(order));
}

function normalizeDailyOrdersSummary(summary = {}) {
  return {
    total: normalizeNumber(summary?.total, 0),
    draft: normalizeNumber(summary?.draft, 0),
    ready: normalizeNumber(summary?.ready, 0),
    fillingOrder: normalizeNumber(summary?.fillingOrder, 0),
    readyForChefReview: normalizeNumber(summary?.readyForChefReview, 0),
    executed: normalizeNumber(summary?.executed, 0),
    failed: normalizeNumber(summary?.failed, 0),
  };
}

function buildSummaryFromQueue(queue = []) {
  return queue.reduce(
    (summary, order) => {
      summary.total += 1;

      if (order.status === "draft") summary.draft += 1;
      if (order.status === "ready-to-execute") summary.ready += 1;
      if (order.status === "filling-order") summary.fillingOrder += 1;
      if (order.status === "ready-for-chef-review") {
        summary.readyForChefReview += 1;
      }
      if (order.status === "executed") summary.executed += 1;
      if (order.status === "failed") summary.failed += 1;

      return summary;
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

function sortDailyOrders(queue = []) {
  return queue.slice().sort((left, right) => {
    return (
      new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
    );
  });
}

function emitChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

function setCachedDailyOrders(queue, summary) {
  cachedDailyOrders = sortDailyOrders(normalizeDailyOrdersQueue(queue));
  cachedDailyOrdersSummary = summary
    ? normalizeDailyOrdersSummary(summary)
    : buildSummaryFromQueue(cachedDailyOrders);
  hasLoadedDailyOrders = true;
  emitChange();
}

function upsertCachedDailyOrder(order, summary) {
  const normalizedOrder = normalizeDailyOrder(order);
  const nextQueue = [
    normalizedOrder,
    ...cachedDailyOrders.filter((entry) => entry.id !== normalizedOrder.id),
  ];

  setCachedDailyOrders(nextQueue, summary);
}

function prependCachedDailyOrders(orders, summary) {
  const normalizedOrders = normalizeDailyOrdersQueue(orders);
  const nextQueue = [
    ...normalizedOrders,
    ...cachedDailyOrders.filter(
      (entry) => !normalizedOrders.some((order) => order.id === entry.id)
    ),
  ];

  setCachedDailyOrders(nextQueue, summary);
}

export function subscribeDailyOrderQueue(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getCachedDailyOrderQueue() {
  return cachedDailyOrders.slice();
}

export function getCachedDailyOrderSummary() {
  return {
    ...cachedDailyOrdersSummary,
  };
}

export async function fetchDailyOrders() {
  const queue = await getDailyOrdersRequest();
  setCachedDailyOrders(queue);
  return getCachedDailyOrderQueue();
}

export async function ensureDailyOrdersLoaded() {
  if (hasLoadedDailyOrders) {
    return getCachedDailyOrderQueue();
  }

  return fetchDailyOrders();
}

export async function fetchDailyOrdersSummary() {
  const summary = await getDailyOrdersSummaryRequest();
  cachedDailyOrdersSummary = normalizeDailyOrdersSummary(summary);
  emitChange();
  return getCachedDailyOrderSummary();
}

export async function createDailyOrdersFromPhoto(entries) {
  const payload = await createDailyOrdersFromPhotoRequest({
    entries,
  });

  prependCachedDailyOrders(payload?.createdOrders || [], payload?.summary);

  return {
    createdOrders: normalizeDailyOrdersQueue(payload?.createdOrders || []),
    summary: getCachedDailyOrderSummary(),
  };
}

export async function createDailyOrdersFromSuggestedOrder(items) {
  const payload = await createDailyOrdersFromSuggestedOrderRequest({
    items,
  });

  prependCachedDailyOrders(payload?.createdOrders || [], payload?.summary);

  return {
    createdOrders: normalizeDailyOrdersQueue(payload?.createdOrders || []),
    summary: getCachedDailyOrderSummary(),
  };
}

export async function updateDailyOrderItemQuantity(orderId, itemIndex, payload) {
  const mutationKey = `${orderId}:${itemIndex}`;
  const sequence = mutationSequence + 1;
  mutationSequence = sequence;
  latestItemMutationSequenceByKey[mutationKey] = sequence;

  const mutation = await updateDailyOrderItemQuantityRequest(orderId, itemIndex, payload);

  if (
    mutation?.order &&
    latestItemMutationSequenceByKey[mutationKey] === sequence
  ) {
    upsertCachedDailyOrder(mutation.order, mutation.summary);
  } else if (mutation?.summary) {
    cachedDailyOrdersSummary = normalizeDailyOrdersSummary(mutation.summary);
    emitChange();
  }

  return mutation;
}

export async function markDailyOrderReady(orderId) {
  const mutation = await markDailyOrderReadyRequest(orderId);

  if (mutation?.order) {
    upsertCachedDailyOrder(mutation.order, mutation.summary);
  }

  return mutation;
}

export async function unlockDailyOrder(orderId) {
  const mutation = await unlockDailyOrderRequest(orderId);

  if (mutation?.order) {
    upsertCachedDailyOrder(mutation.order, mutation.summary);
  }

  return mutation;
}

export async function runDailyOrderBotFill(orderId) {
  const mutation = await runDailyOrderBotFillRequest(orderId);

  if (mutation?.order) {
    upsertCachedDailyOrder(mutation.order, mutation.summary);
  }

  return mutation;
}

export async function submitDailyOrderAfterChefApproval(orderId) {
  const mutation = await submitDailyOrderAfterChefApprovalRequest(orderId);

  if (mutation?.order) {
    upsertCachedDailyOrder(mutation.order, mutation.summary);
  }

  return mutation;
}

export async function resetDailyOrders() {
  const result = await resetDailyOrdersRequest();

  if (result?.ok) {
    cachedDailyOrders = [];
    cachedDailyOrdersSummary = normalizeDailyOrdersSummary(result.summary || EMPTY_SUMMARY);
    hasLoadedDailyOrders = true;
    emitChange();
  }

  return result;
}
