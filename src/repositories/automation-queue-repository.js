import {
  clearSupplierOrderHistory as clearSupplierOrderHistoryRequest,
  createAutomationJob as createAutomationJobRequest,
  deleteAllAutomationJobs as deleteAllAutomationJobsRequest,
  deleteAutomationJob as deleteAutomationJobRequest,
  getAutomationJobs as getAutomationJobsRequest,
  getAutomationJobsSummary as getAutomationJobsSummaryRequest,
  getSupplierOrderHistory as getSupplierOrderHistoryRequest,
  resetAutomationJob as resetAutomationJobRequest,
  runAutomationJob as runAutomationJobRequest,
  updateAutomationJobError as updateAutomationJobErrorRequest,
  updateAutomationJobNotes as updateAutomationJobNotesRequest,
  updateAutomationJobStatus as updateAutomationJobStatusRequest,
} from "../services/automation-service";

const EMPTY_SUMMARY = Object.freeze({
  total: 0,
  pending: 0,
  running: 0,
  done: 0,
  failed: 0,
});

let cachedAutomationQueue = [];
let cachedAutomationSummary = { ...EMPTY_SUMMARY };
let cachedSupplierOrderHistory = [];
let hasLoadedAutomationQueue = false;
let hasLoadedSupplierOrderHistory = false;

const automationQueueListeners = new Set();
const supplierOrderHistoryListeners = new Set();

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeJobItem(item, fallbackIndex = 0) {
  return {
    sequence: normalizeNumber(item?.sequence, fallbackIndex + 1),
    itemId:
      item?.itemId === null || item?.itemId === undefined
        ? null
        : normalizeNumber(item?.itemId, 0),
    itemName: normalizeString(item?.itemName),
    quantity: normalizeNumber(item?.quantity, 0),
    source: normalizeString(item?.source, "unknown"),
    supplier: normalizeString(item?.supplier),
    currentStock: normalizeNullableNumber(item?.currentStock),
    idealStock: normalizeNullableNumber(item?.idealStock),
    orderAmount: normalizeNullableNumber(item?.orderAmount),
    status: normalizeString(item?.status),
    area: normalizeString(item?.area),
    unit: normalizeString(item?.unit),
    rawLine: normalizeString(item?.rawLine),
  };
}

function normalizeSnapshotItem(item) {
  return {
    name: normalizeString(item?.name || item?.itemName),
    quantity: normalizeNumber(item?.quantity || item?.orderAmount, 0),
    unit: normalizeString(item?.unit),
  };
}

function normalizeSupplierOrderSnapshot(snapshot = {}, fallbackSupplier = "") {
  const items = Array.isArray(snapshot?.items)
    ? snapshot.items
        .map((item) => normalizeSnapshotItem(item))
        .filter((item) => item.name && item.quantity > 0)
    : [];

  return {
    supplier: normalizeString(snapshot?.supplier, fallbackSupplier),
    items,
    totalQuantity: normalizeNumber(
      snapshot?.totalQuantity,
      items.reduce((sum, item) => sum + item.quantity, 0)
    ),
    timestamp: normalizeString(snapshot?.timestamp),
    revisionNumber: Math.max(normalizeNumber(snapshot?.revisionNumber, 1), 1),
  };
}

function normalizeSupplierOrderMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const supplier = normalizeString(metadata?.supplier);
  const snapshot = normalizeSupplierOrderSnapshot(metadata?.snapshot, supplier);

  return {
    supplier: normalizeString(metadata?.supplier, snapshot.supplier),
    itemCount: normalizeNumber(metadata?.itemCount, snapshot.items.length),
    totalQuantity: normalizeNumber(metadata?.totalQuantity, snapshot.totalQuantity),
    status: normalizeString(metadata?.status, "sent-to-queue"),
    attempts: normalizeNumber(metadata?.attempts, 0),
    revisionNumber: Math.max(
      normalizeNumber(metadata?.revisionNumber, snapshot.revisionNumber || 1),
      1
    ),
    snapshot,
    sentAt: normalizeString(metadata?.sentAt, snapshot.timestamp),
    lastSentAt: normalizeString(
      metadata?.lastSentAt,
      metadata?.sentAt || snapshot.timestamp
    ),
  };
}

function normalizeAutomationJob(job = {}) {
  const items = Array.isArray(job?.items)
    ? job.items.map((item, index) => normalizeJobItem(item, index))
    : [];

  return {
    jobId: normalizeString(job?.jobId || job?.id),
    sessionId: normalizeString(job?.sessionId),
    createdAt: normalizeString(job?.createdAt),
    updatedAt: normalizeString(job?.updatedAt || job?.createdAt),
    status: normalizeString(job?.status, "pending"),
    source: normalizeString(job?.source, "unknown"),
    notes: normalizeString(job?.notes),
    attemptCount: normalizeNumber(job?.attemptCount, job?.attempts || 0),
    lastError: normalizeString(job?.lastError),
    totalItems: normalizeNumber(job?.totalItems, items.length),
    items,
    metadata: {
      supplierOrder: normalizeSupplierOrderMetadata(job?.metadata?.supplierOrder),
    },
    executionMetadata: {
      runStartedAt: normalizeString(job?.executionMetadata?.runStartedAt),
      runFinishedAt: normalizeString(job?.executionMetadata?.runFinishedAt),
      runDuration: normalizeNullableNumber(job?.executionMetadata?.runDuration),
      lastErrorCode: normalizeString(job?.executionMetadata?.lastErrorCode),
      lastErrorMessage: normalizeString(job?.executionMetadata?.lastErrorMessage),
    },
  };
}

function normalizeAutomationQueue(queue = []) {
  return (queue || []).map((job) => normalizeAutomationJob(job));
}

function normalizeAutomationSummary(summary = {}) {
  return {
    total: normalizeNumber(summary?.total, 0),
    pending: normalizeNumber(summary?.pending, 0),
    running: normalizeNumber(summary?.running, 0),
    done: normalizeNumber(summary?.done, 0),
    failed: normalizeNumber(summary?.failed, 0),
  };
}

function normalizeSupplierOrderHistoryEntry(entry = {}) {
  const snapshot = normalizeSupplierOrderSnapshot(
    entry?.snapshot,
    normalizeString(entry?.supplier)
  );

  return {
    id: normalizeString(entry?.id),
    jobId: normalizeString(entry?.jobId),
    supplier: normalizeString(entry?.supplier, snapshot.supplier),
    items: Array.isArray(entry?.items)
      ? entry.items.map((item) => normalizeSnapshotItem(item))
      : snapshot.items,
    totalQuantity: normalizeNumber(entry?.totalQuantity, snapshot.totalQuantity),
    timestamp: normalizeString(entry?.timestamp),
    snapshotTimestamp: normalizeString(
      entry?.snapshotTimestamp,
      snapshot.timestamp
    ),
    revisionNumber: Math.max(
      normalizeNumber(entry?.revisionNumber, snapshot.revisionNumber || 1),
      1
    ),
    snapshot,
    status: normalizeString(entry?.status, "sent-to-queue"),
    attempts: normalizeNumber(entry?.attempts, 0),
  };
}

function normalizeSupplierOrderHistory(history = []) {
  return (history || []).map((entry) => normalizeSupplierOrderHistoryEntry(entry));
}

function buildSummaryFromQueue(queue = []) {
  return queue.reduce(
    (summary, job) => {
      summary.total += 1;
      if (job.status === "pending") summary.pending += 1;
      if (job.status === "running") summary.running += 1;
      if (job.status === "done") summary.done += 1;
      if (job.status === "failed") summary.failed += 1;
      return summary;
    },
    {
      total: 0,
      pending: 0,
      running: 0,
      done: 0,
      failed: 0,
    }
  );
}

function sortAutomationQueue(queue = []) {
  return queue.slice().sort((left, right) => {
    return (
      new Date(right.updatedAt || right.createdAt || 0).getTime() -
      new Date(left.updatedAt || left.createdAt || 0).getTime()
    );
  });
}

function sortSupplierOrderHistory(history = []) {
  return history.slice().sort((left, right) => {
    return (
      new Date(right.timestamp || right.snapshotTimestamp || 0).getTime() -
      new Date(left.timestamp || left.snapshotTimestamp || 0).getTime()
    );
  });
}

function emitAutomationQueueChange() {
  automationQueueListeners.forEach((listener) => {
    listener();
  });
}

function emitSupplierOrderHistoryChange() {
  supplierOrderHistoryListeners.forEach((listener) => {
    listener();
  });
}

function setCachedAutomationQueue(queue, summary) {
  cachedAutomationQueue = sortAutomationQueue(normalizeAutomationQueue(queue));
  cachedAutomationSummary = summary
    ? normalizeAutomationSummary(summary)
    : buildSummaryFromQueue(cachedAutomationQueue);
  hasLoadedAutomationQueue = true;
  emitAutomationQueueChange();
}

function setCachedSupplierOrderHistory(history) {
  cachedSupplierOrderHistory = sortSupplierOrderHistory(
    normalizeSupplierOrderHistory(history)
  );
  hasLoadedSupplierOrderHistory = true;
  emitSupplierOrderHistoryChange();
}

function upsertCachedAutomationJob(job, summary) {
  const normalizedJob = normalizeAutomationJob(job);
  const nextQueue = [
    normalizedJob,
    ...cachedAutomationQueue.filter((entry) => entry.jobId !== normalizedJob.jobId),
  ];

  setCachedAutomationQueue(nextQueue, summary);

  if (normalizedJob.metadata?.supplierOrder) {
    upsertCachedSupplierOrderHistoryFromJob(normalizedJob);
  }

  return normalizedJob;
}

function removeCachedAutomationJob(jobId, summary) {
  const nextQueue = cachedAutomationQueue.filter((job) => job.jobId !== jobId);
  setCachedAutomationQueue(nextQueue, summary);

  const nextHistory = cachedSupplierOrderHistory.filter((entry) => entry.jobId !== jobId);
  setCachedSupplierOrderHistory(nextHistory);
}

function upsertCachedSupplierOrderHistoryFromJob(job) {
  const supplierOrder = job?.metadata?.supplierOrder;

  if (!supplierOrder) {
    return;
  }

  const nextEntry = normalizeSupplierOrderHistoryEntry({
    jobId: job.jobId,
    supplier: supplierOrder.supplier,
    items: supplierOrder.snapshot?.items || [],
    totalQuantity: supplierOrder.totalQuantity,
    timestamp: job.updatedAt || job.createdAt,
    snapshotTimestamp:
      supplierOrder.snapshot?.timestamp || supplierOrder.lastSentAt || job.createdAt,
    revisionNumber: supplierOrder.revisionNumber,
    snapshot: supplierOrder.snapshot,
    status: supplierOrder.status,
    attempts: supplierOrder.attempts,
  });
  const nextHistory = [
    nextEntry,
    ...cachedSupplierOrderHistory.filter((entry) => entry.jobId !== nextEntry.jobId),
  ];

  setCachedSupplierOrderHistory(nextHistory);
}

export function subscribeAutomationQueue(listener) {
  automationQueueListeners.add(listener);

  return () => {
    automationQueueListeners.delete(listener);
  };
}

export function subscribeSupplierOrderHistory(listener) {
  supplierOrderHistoryListeners.add(listener);

  return () => {
    supplierOrderHistoryListeners.delete(listener);
  };
}

export function getCachedAutomationQueue() {
  return cachedAutomationQueue.slice();
}

export function getCachedAutomationSummary() {
  return {
    ...cachedAutomationSummary,
  };
}

export function getCachedSupplierOrderHistory() {
  return cachedSupplierOrderHistory.slice();
}

export async function fetchAutomationQueue() {
  const queue = await getAutomationJobsRequest();
  setCachedAutomationQueue(queue);
  return getCachedAutomationQueue();
}

export async function ensureAutomationQueueLoaded() {
  if (hasLoadedAutomationQueue) {
    return getCachedAutomationQueue();
  }

  return fetchAutomationQueue();
}

export async function fetchAutomationQueueSummary() {
  const summary = await getAutomationJobsSummaryRequest();
  cachedAutomationSummary = normalizeAutomationSummary(summary);
  emitAutomationQueueChange();
  return getCachedAutomationSummary();
}

export async function fetchSupplierOrderHistory() {
  const history = await getSupplierOrderHistoryRequest();
  setCachedSupplierOrderHistory(history);
  return getCachedSupplierOrderHistory();
}

export async function ensureSupplierOrderHistoryLoaded() {
  if (hasLoadedSupplierOrderHistory) {
    return getCachedSupplierOrderHistory();
  }

  return fetchSupplierOrderHistory();
}

export async function createAutomationJob(jobData) {
  const payload = await createAutomationJobRequest(jobData);

  if (payload?.job) {
    upsertCachedAutomationJob(payload.job, payload.summary);
  }

  return {
    ...payload,
    job: payload?.job ? normalizeAutomationJob(payload.job) : null,
    summary: payload?.summary
      ? normalizeAutomationSummary(payload.summary)
      : getCachedAutomationSummary(),
  };
}

export async function patchAutomationJobStatus(jobId, payload) {
  const mutation = await updateAutomationJobStatusRequest(jobId, payload);

  if (mutation?.job) {
    upsertCachedAutomationJob(mutation.job, mutation.summary);
  }

  return {
    ...mutation,
    job: mutation?.job ? normalizeAutomationJob(mutation.job) : null,
    summary: mutation?.summary
      ? normalizeAutomationSummary(mutation.summary)
      : getCachedAutomationSummary(),
  };
}

export async function patchAutomationJobError(jobId, payload) {
  const mutation = await updateAutomationJobErrorRequest(jobId, payload);

  if (mutation?.job) {
    upsertCachedAutomationJob(mutation.job, mutation.summary);
  }

  return {
    ...mutation,
    job: mutation?.job ? normalizeAutomationJob(mutation.job) : null,
    summary: mutation?.summary
      ? normalizeAutomationSummary(mutation.summary)
      : getCachedAutomationSummary(),
  };
}

export async function patchAutomationJobNotes(jobId, payload) {
  const mutation = await updateAutomationJobNotesRequest(jobId, payload);

  if (mutation?.job) {
    upsertCachedAutomationJob(mutation.job, mutation.summary);
  }

  return {
    ...mutation,
    job: mutation?.job ? normalizeAutomationJob(mutation.job) : null,
    summary: mutation?.summary
      ? normalizeAutomationSummary(mutation.summary)
      : getCachedAutomationSummary(),
  };
}

export async function resetAutomationQueueJob(jobId) {
  const mutation = await resetAutomationJobRequest(jobId);

  if (mutation?.job) {
    upsertCachedAutomationJob(mutation.job, mutation.summary);
  }

  return {
    ...mutation,
    job: mutation?.job ? normalizeAutomationJob(mutation.job) : null,
    summary: mutation?.summary
      ? normalizeAutomationSummary(mutation.summary)
      : getCachedAutomationSummary(),
  };
}

export async function removeAutomationQueueJob(jobId) {
  const mutation = await deleteAutomationJobRequest(jobId);

  if (mutation?.ok) {
    removeCachedAutomationJob(jobId, mutation.summary);
  }

  return {
    ...mutation,
    summary: mutation?.summary
      ? normalizeAutomationSummary(mutation.summary)
      : getCachedAutomationSummary(),
  };
}

export async function clearAutomationQueue() {
  const mutation = await deleteAllAutomationJobsRequest();

  if (mutation?.ok) {
    setCachedAutomationQueue([], mutation.summary || EMPTY_SUMMARY);
    setCachedSupplierOrderHistory([]);
  }

  return {
    ...mutation,
    summary: mutation?.summary
      ? normalizeAutomationSummary(mutation.summary)
      : getCachedAutomationSummary(),
  };
}

export async function executeAutomationQueueJob(jobId, payload = {}) {
  const mutation = await runAutomationJobRequest(jobId, payload);

  if (mutation?.job) {
    upsertCachedAutomationJob(mutation.job, mutation.summary);
  }

  return {
    ...mutation,
    job: mutation?.job ? normalizeAutomationJob(mutation.job) : null,
    summary: mutation?.summary
      ? normalizeAutomationSummary(mutation.summary)
      : getCachedAutomationSummary(),
  };
}

export async function removeSupplierOrderHistory() {
  const mutation = await clearSupplierOrderHistoryRequest();

  if (mutation?.ok) {
    setCachedSupplierOrderHistory([]);
  }

  return {
    ...mutation,
  };
}
