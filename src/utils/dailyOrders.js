import { DAILY_ORDER_STATUSES } from "../constants/app";
import { UNKNOWN_SUPPLIER_LABEL } from "./stock";

const DAILY_ORDER_QUEUE_KEY = "smartops-daily-order-queue";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelayMs() {
  return 700 + Math.floor(Math.random() * 1300);
}

function buildMockReviewScreenshot(order) {
  const title = `${order.supplier} - Chef Review`;
  const total = `Total Qty: ${order.totalQuantity}`;
  const created = `Created: ${new Date().toLocaleString()}`;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='980' height='560'>
    <rect width='100%' height='100%' fill='#1a1a1a' />
    <rect x='24' y='24' width='932' height='512' rx='10' fill='#111' stroke='#444' />
    <text x='50' y='86' font-size='32' fill='#fff' font-family='Arial'>${title}</text>
    <text x='50' y='130' font-size='22' fill='#ccc' font-family='Arial'>${total}</text>
    <text x='50' y='168' font-size='18' fill='#999' font-family='Arial'>${created}</text>
    <text x='50' y='520' font-size='16' fill='#f5d98b' font-family='Arial'>Bot filled items and stopped before submit.</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getItemsById(itemsCatalog = []) {
  return (itemsCatalog || []).reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

function normalizeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
}

function getTotalQuantity(items = []) {
  return (items || []).reduce(
    (sum, item) => sum + normalizeQuantity(item.quantity),
    0
  );
}

function normalizeStatus(status) {
  if (status === "pending") return DAILY_ORDER_STATUSES.DRAFT;
  if (status === "running" || status === "executing") {
    return DAILY_ORDER_STATUSES.FILLING_ORDER;
  }
  return status || DAILY_ORDER_STATUSES.DRAFT;
}

function normalizeExecutionFields(order) {
  const executionResult = order.executionResult || {};
  const executionStartedAt =
    order.executionStartedAt ||
    executionResult.startedAt ||
    executionResult.timestamp ||
    null;
  const executionFinishedAt =
    order.executionFinishedAt || executionResult.timestamp || null;
  const executionDuration =
    order.executionDuration || executionResult.duration || null;
  const reviewScreenshot = order.reviewScreenshot || executionResult.reviewScreenshot || "";
  const filledAt = order.filledAt || executionResult.filledAt || null;
  const readyForReviewAt =
    order.readyForReviewAt || executionResult.readyForReviewAt || null;
  const executionNotes =
    order.executionNotes || executionResult.message || "No execution notes.";

  return {
    executionStartedAt,
    executionFinishedAt,
    executionDuration,
    reviewScreenshot,
    filledAt,
    readyForReviewAt,
    executionNotes,
  };
}

function normalizeOrder(order) {
  const status = normalizeStatus(order.status);
  const normalizedItems = (order.items || []).map((item, index) => ({
    itemId: item.itemId ?? `${order.id}-item-${index}`,
    itemName: item.itemName || item.name || "",
    quantity: normalizeQuantity(item.quantity),
    unit: item.unit || "",
  }));

  const executionFields = normalizeExecutionFields(order);

  return {
    ...order,
    supplier: order.supplier || UNKNOWN_SUPPLIER_LABEL,
    status,
    isLocked: Boolean(
      order.isLocked ||
        status === DAILY_ORDER_STATUSES.READY ||
        status === DAILY_ORDER_STATUSES.FILLING_ORDER ||
        status === DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW ||
        status === DAILY_ORDER_STATUSES.EXECUTED ||
        status === DAILY_ORDER_STATUSES.FAILED
    ),
    items: normalizedItems,
    totalQuantity: getTotalQuantity(normalizedItems),
    attempts: Number(order.attempts || 0),
    executionResult: order.executionResult || null,
    ...executionFields,
  };
}

function canExecuteStatus(status) {
  return (
    status === DAILY_ORDER_STATUSES.READY || status === DAILY_ORDER_STATUSES.FAILED
  );
}

function hasAnyExecutableStatus(queue = []) {
  return queue.some((order) => canExecuteStatus(order.status));
}

export function loadDailyOrderQueueFromStorage() {
  try {
    const saved = localStorage.getItem(DAILY_ORDER_QUEUE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeOrder) : [];
  } catch {
    return [];
  }
}

export function saveDailyOrderQueueToStorage(queue) {
  try {
    localStorage.setItem(DAILY_ORDER_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage errors
  }
}

export function getDailyOrderQueue() {
  return loadDailyOrderQueueFromStorage();
}

export function replaceDailyOrderQueue(queue) {
  const normalizedQueue = (queue || []).map(normalizeOrder);
  saveDailyOrderQueueToStorage(normalizedQueue);
  return normalizedQueue;
}

export function buildDailyConfirmedOrdersFromConfirmedEntries(
  confirmedEntries,
  itemsCatalog = []
) {
  const itemsById = getItemsById(itemsCatalog);
  const groups = {};

  (confirmedEntries || []).forEach((entry) => {
    const quantity = normalizeQuantity(entry.quantity);
    if (!(quantity > 0)) return;

    const supplier = entry.supplier || UNKNOWN_SUPPLIER_LABEL;
    const catalogItem = itemsById[entry.itemId] || {};

    if (!groups[supplier]) {
      groups[supplier] = [];
    }

    groups[supplier].push({
      itemId: entry.itemId,
      itemName: entry.itemName,
      quantity,
      unit: catalogItem.unit || "",
    });
  });

  const now = new Date().toISOString();
  return Object.entries(groups).map(([supplier, items], index) =>
    normalizeOrder({
      id: `${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}`,
      supplier,
      items,
      totalQuantity: getTotalQuantity(items),
      createdAt: now,
      status: DAILY_ORDER_STATUSES.DRAFT,
      isLocked: false,
      attempts: 0,
      executionResult: null,
      executionStartedAt: null,
      executionFinishedAt: null,
      executionDuration: null,
      reviewScreenshot: "",
      filledAt: null,
      readyForReviewAt: null,
      executionNotes: "",
    })
  );
}

export function enqueueDailyConfirmedOrders(orders) {
  const validOrders = Array.isArray(orders) ? orders : [];
  if (validOrders.length === 0) return [];

  const queue = getDailyOrderQueue();
  const nextQueue = [...validOrders, ...queue];
  replaceDailyOrderQueue(nextQueue);
  return validOrders;
}

export function addDailyConfirmedOrdersFromPhoto(confirmedEntries, itemsCatalog = []) {
  const orders = buildDailyConfirmedOrdersFromConfirmedEntries(
    confirmedEntries,
    itemsCatalog
  );

  enqueueDailyConfirmedOrders(orders);
  return orders;
}

export function updateDailyOrder(orderId, updater) {
  const queue = getDailyOrderQueue();
  const nextQueue = queue.map((order) => {
    if (order.id !== orderId) return order;

    const updated =
      typeof updater === "function"
        ? updater(order)
        : {
            ...order,
            ...updater,
          };

    return normalizeOrder(updated);
  });

  replaceDailyOrderQueue(nextQueue);
  return nextQueue;
}

export function updateDailyOrderItemQuantity(orderId, itemIndex, nextQuantity) {
  return updateDailyOrder(orderId, (order) => {
    if (order.isLocked) return order;

    const items = (order.items || []).map((item, index) =>
      index === itemIndex
        ? {
            ...item,
            quantity: normalizeQuantity(nextQuantity),
          }
        : item
    );

    return {
      ...order,
      items,
      totalQuantity: getTotalQuantity(items),
    };
  });
}

export function markDailyOrderReady(orderId) {
  return updateDailyOrder(orderId, (order) => {
    if (order.status === DAILY_ORDER_STATUSES.EXECUTED) return order;

    return {
      ...order,
      status: DAILY_ORDER_STATUSES.READY,
      isLocked: true,
      readyAt: new Date().toISOString(),
    };
  });
}

export function unlockDailyOrder(orderId) {
  return updateDailyOrder(orderId, (order) => {
    if (order.status === DAILY_ORDER_STATUSES.FILLING_ORDER) return order;
    if (order.status === DAILY_ORDER_STATUSES.EXECUTED) return order;

    return {
      ...order,
      status: DAILY_ORDER_STATUSES.DRAFT,
      isLocked: false,
    };
  });
}

export async function executeDailyOrder(orderId) {
  const queueBefore = getDailyOrderQueue();
  const orderBefore = queueBefore.find((order) => order.id === orderId) || null;

  if (!orderBefore) {
    return {
      ok: false,
      queue: queueBefore,
      order: null,
      reason: "not-found",
    };
  }

  if (orderBefore.status === DAILY_ORDER_STATUSES.EXECUTED) {
    return {
      ok: false,
      queue: queueBefore,
      order: orderBefore,
      reason: "already-executed",
    };
  }

  if (!canExecuteStatus(orderBefore.status)) {
    return {
      ok: false,
      queue: queueBefore,
      order: orderBefore,
      reason: "not-ready",
    };
  }

  const executionStartedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  updateDailyOrder(orderId, (order) => ({
    ...order,
    status: DAILY_ORDER_STATUSES.FILLING_ORDER,
    isLocked: true,
    attempts: Number(order.attempts || 0) + 1,
    executionStartedAt,
    executionFinishedAt: null,
    executionDuration: null,
    reviewScreenshot: "",
    filledAt: null,
    readyForReviewAt: null,
    executionNotes: "Bot logged in successfully.",
  }));

  await wait(300);

  updateDailyOrder(orderId, (order) => ({
    ...order,
    status: DAILY_ORDER_STATUSES.FILLING_ORDER,
    executionNotes: "Bot is filling order items and quantities.",
  }));

  let queue = getDailyOrderQueue();

  if (!queue.some((order) => order.id === orderId)) {
    return {
      ok: false,
      queue,
      order: null,
      reason: "not-found",
    };
  }

  await wait(randomDelayMs());

  const executionFinishedAt = new Date().toISOString();
  const executionDuration = Date.now() - startedAtMs;
  const success = Math.random() >= 0.35;
  const queueAfterFill = getDailyOrderQueue();
  const currentOrder = queueAfterFill.find((order) => order.id === orderId) || orderBefore;
  const reviewScreenshot = buildMockReviewScreenshot(currentOrder);
  const filledAt = executionFinishedAt;
  const readyForReviewAt = executionFinishedAt;
  const executionNotes = success
    ? "Order filled by bot and stopped before submit. Ready for chef review."
    : "Bot failed while filling order items.";

  queue = updateDailyOrder(orderId, (order) => ({
    ...order,
    status: success
      ? DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW
      : DAILY_ORDER_STATUSES.FAILED,
    isLocked: true,
    executionStartedAt,
    executionFinishedAt,
    executionDuration,
    reviewScreenshot: success ? reviewScreenshot : "",
    filledAt: success ? filledAt : null,
    readyForReviewAt: success ? readyForReviewAt : null,
    executionNotes,
    executionResult: {
      duration: executionDuration,
      timestamp: executionFinishedAt,
      filledAt: success ? filledAt : null,
      readyForReviewAt: success ? readyForReviewAt : null,
      reviewScreenshot: success ? reviewScreenshot : "",
      success,
      message: executionNotes,
    },
  }));

  return {
    ok: success,
    queue,
    order: queue.find((order) => order.id === orderId) || null,
    reason: success ? "success" : "failed",
  };
}

export function markDailyOrderChefApproved(orderId) {
  const queueBefore = getDailyOrderQueue();
  const orderBefore = queueBefore.find((order) => order.id === orderId) || null;

  if (!orderBefore) {
    return {
      ok: false,
      queue: queueBefore,
      order: null,
      reason: "not-found",
    };
  }

  if (orderBefore.status === DAILY_ORDER_STATUSES.EXECUTED) {
    return {
      ok: false,
      queue: queueBefore,
      order: orderBefore,
      reason: "already-executed",
    };
  }

  if (orderBefore.status !== DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW) {
    return {
      ok: false,
      queue: queueBefore,
      order: orderBefore,
      reason: "not-ready-for-chef-review",
    };
  }

  const approvedAt = new Date().toISOString();
  const queue = updateDailyOrder(orderId, (order) => ({
    ...order,
    status: DAILY_ORDER_STATUSES.EXECUTED,
    isLocked: true,
    chefApprovedAt: approvedAt,
    executionNotes: "Chef approved order after manual review.",
  }));

  return {
    ok: true,
    queue,
    order: queue.find((order) => order.id === orderId) || null,
    reason: "approved",
  };
}

export async function executeReadyDailyOrders() {
  const queue = getDailyOrderQueue();
  const readyOrders = queue.filter(
    (order) => order.status === DAILY_ORDER_STATUSES.READY
  );

  let successCount = 0;
  let failedCount = 0;

  for (let index = 0; index < readyOrders.length; index += 1) {
    const order = readyOrders[index];
    const result = await executeDailyOrder(order.id);

    if (result.ok) successCount += 1;
    if (!result.ok) failedCount += 1;
  }

  return {
    processed: readyOrders.length,
    successCount,
    failedCount,
    queue: getDailyOrderQueue(),
  };
}

export function getDailyOrderQueueCounts(queue) {
  const normalizedQueue = (queue || []).map(normalizeOrder);

  return normalizedQueue.reduce(
    (acc, order) => {
      acc.total += 1;
      if (order.status === DAILY_ORDER_STATUSES.DRAFT) acc.draft += 1;
      if (order.status === DAILY_ORDER_STATUSES.READY) acc.ready += 1;
      if (order.status === DAILY_ORDER_STATUSES.FILLING_ORDER) {
        acc.fillingOrder += 1;
      }
      if (order.status === DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW) {
        acc.readyForChefReview += 1;
      }
      if (order.status === DAILY_ORDER_STATUSES.EXECUTED) acc.executed += 1;
      if (order.status === DAILY_ORDER_STATUSES.FAILED) acc.failed += 1;
      return acc;
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
  return getDailyOrderQueue().filter((order) => canExecuteStatus(order.status))
    .length;
}

export function getReadyOrdersCount() {
  return getDailyOrderQueue().filter(
    (order) => order.status === DAILY_ORDER_STATUSES.READY
  ).length;
}

export function hasExecutableOrders() {
  return hasAnyExecutableStatus(getDailyOrderQueue());
}
