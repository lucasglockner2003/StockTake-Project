import {
  JOB_STATUSES,
  SOURCES,
  SUPPLIER_ORDER_EXECUTION_STATUSES,
} from "../constants/app";
import {
  clearStoredAutomationQueue,
  clearStoredSupplierOrderHistory,
  getStoredAutomationQueue,
  getStoredSupplierOrderHistory,
  saveStoredAutomationQueue,
  saveStoredSupplierOrderHistory,
} from "../repositories/automation-queue-repository";
import { getItemStatus, getNumericValue } from "./stock";
const SUPPLIER_HISTORY_LIMIT = 60;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSupplierOrderJob(job) {
  return job?.source === SOURCES.REVIEW_SUPPLIER_ORDER;
}

function mapJobStatusToSupplierExecutionStatus(jobStatus) {
  if (jobStatus === JOB_STATUSES.DONE) {
    return SUPPLIER_ORDER_EXECUTION_STATUSES.EXECUTED;
  }

  if (jobStatus === JOB_STATUSES.FAILED) {
    return SUPPLIER_ORDER_EXECUTION_STATUSES.FAILED;
  }

  return SUPPLIER_ORDER_EXECUTION_STATUSES.SENT_TO_QUEUE;
}

function getSupplierFromJob(job) {
  if (job?.metadata?.supplierOrder?.supplier) {
    return job.metadata.supplierOrder.supplier;
  }

  if (Array.isArray(job?.items) && job.items[0]?.supplier) {
    return job.items[0].supplier;
  }

  return "";
}

function getSupplierTotalQuantity(items = []) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function normalizeSnapshotItems(items = []) {
  return items
    .map((item) => ({
      name: item.name || item.itemName || "",
      quantity: Number(item.quantity || item.orderAmount || 0),
      unit: item.unit || "",
    }))
    .filter((item) => item.quantity > 0)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export function buildSupplierOrderSnapshot(
  supplier,
  supplierItems,
  revisionNumber = 1,
  timestamp = new Date().toISOString()
) {
  const snapshotItems = normalizeSnapshotItems(supplierItems);
  const totalQuantity = snapshotItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  return {
    supplier,
    items: snapshotItems,
    totalQuantity,
    timestamp,
    revisionNumber,
  };
}

export function getSupplierOrderSnapshotSignature(snapshot) {
  if (!snapshot) return "";

  const supplier = String(snapshot.supplier || "").trim().toLowerCase();
  const normalizedItems = normalizeSnapshotItems(snapshot.items || []);
  const itemSignature = normalizedItems
    .map((item) => `${item.name.toLowerCase()}|${item.quantity}|${item.unit}`)
    .join(";");

  return `${supplier}::${itemSignature}`;
}

function buildSnapshotFromJobItems(job) {
  const supplier = getSupplierFromJob(job);
  return buildSupplierOrderSnapshot(
    supplier,
    (job.items || []).map((item) => ({
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
    })),
    1,
    job.createdAt || new Date().toISOString()
  );
}

function syncSupplierOrderMetadata(job) {
  if (!isSupplierOrderJob(job)) return job;

  const supplier = getSupplierFromJob(job);
  const attempts = Number(job.attemptCount || 0);
  const totalQuantity = getSupplierTotalQuantity(job.items || []);
  const currentMetadata = job.metadata?.supplierOrder || {};
  const snapshot = currentMetadata.snapshot || buildSnapshotFromJobItems(job);
  const revisionNumber =
    Number(currentMetadata.revisionNumber || snapshot?.revisionNumber || 1) || 1;
  const sentAt =
    currentMetadata.lastSentAt ||
    currentMetadata.sentAt ||
    snapshot?.timestamp ||
    job.createdAt;

  return {
    ...job,
    metadata: {
      ...(job.metadata || {}),
      supplierOrder: {
        ...currentMetadata,
        supplier,
        itemCount: Array.isArray(job.items) ? job.items.length : 0,
        totalQuantity: snapshot?.totalQuantity || totalQuantity,
        status: mapJobStatusToSupplierExecutionStatus(job.status),
        attempts,
        revisionNumber,
        snapshot,
        sentAt,
        lastSentAt: sentAt,
      },
    },
  };
}

function toSupplierOrderHistoryRecord(job) {
  if (!isSupplierOrderJob(job)) return null;

  const syncedJob = syncSupplierOrderMetadata(job);
  const supplierOrderMeta = syncedJob.metadata?.supplierOrder || {};
  const snapshot = supplierOrderMeta.snapshot || buildSnapshotFromJobItems(syncedJob);

  return {
    jobId: syncedJob.jobId,
    supplier: supplierOrderMeta.supplier || "",
    items: Array.isArray(snapshot?.items) ? snapshot.items : [],
    totalQuantity: snapshot?.totalQuantity || supplierOrderMeta.totalQuantity || 0,
    timestamp: syncedJob.updatedAt || syncedJob.createdAt,
    snapshotTimestamp:
      snapshot?.timestamp || supplierOrderMeta.lastSentAt || syncedJob.createdAt,
    revisionNumber:
      supplierOrderMeta.revisionNumber || snapshot?.revisionNumber || 1,
    snapshot,
    status:
      supplierOrderMeta.status || SUPPLIER_ORDER_EXECUTION_STATUSES.SENT_TO_QUEUE,
    attempts: supplierOrderMeta.attempts || 0,
  };
}

export function loadSupplierOrderHistoryFromStorage() {
  return getStoredSupplierOrderHistory();
}

export function saveSupplierOrderHistoryToStorage(history) {
  saveStoredSupplierOrderHistory(history);
}

export function getSupplierOrderHistory() {
  return loadSupplierOrderHistoryFromStorage();
}

export function clearSupplierOrderHistory() {
  clearStoredSupplierOrderHistory();
  return [];
}

function syncSupplierOrderHistoryWithQueue(queue) {
  const supplierJobs = (queue || []).filter(isSupplierOrderJob);
  if (supplierJobs.length === 0) return;

  const history = loadSupplierOrderHistoryFromStorage();
  const historyMap = history.reduce((acc, entry) => {
    if (entry?.jobId !== undefined && entry?.jobId !== null) {
      acc[String(entry.jobId)] = entry;
    }
    return acc;
  }, {});

  supplierJobs.forEach((job) => {
    const nextRecord = toSupplierOrderHistoryRecord(job);
    if (!nextRecord) return;

    historyMap[String(nextRecord.jobId)] = nextRecord;
  });

  const nextHistory = Object.values(historyMap)
    .sort((a, b) => {
      const aTime = new Date(a.timestamp || 0).getTime();
      const bTime = new Date(b.timestamp || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, SUPPLIER_HISTORY_LIMIT);

  saveSupplierOrderHistoryToStorage(nextHistory);
}

/* =========================
   JOB MODEL
========================= */

export function createAutomationJob(jobData = {}) {
  const now = new Date().toISOString();

  const nextJob = {
    jobId: jobData.jobId || Date.now(),
    sessionId: jobData.sessionId || Date.now(),
    createdAt: jobData.createdAt || now,
    updatedAt: jobData.updatedAt || now,
    status: jobData.status || JOB_STATUSES.PENDING,
    source: jobData.source || SOURCES.UNKNOWN,
    notes: jobData.notes || "",
    attemptCount: jobData.attemptCount || 0,
    lastError: jobData.lastError || "",
    totalItems: Array.isArray(jobData.items)
      ? jobData.items.length
      : jobData.totalItems || 0,
    items: Array.isArray(jobData.items) ? jobData.items : [],
    metadata: jobData.metadata || {},
  };

  return syncSupplierOrderMetadata(nextJob);
}

/* =========================
   STORAGE
========================= */

export function loadAutomationQueueFromStorage() {
  return getStoredAutomationQueue();
}

export function saveAutomationQueueToStorage(queue) {
  saveStoredAutomationQueue(queue);
}

export function clearAutomationQueueFromStorage() {
  clearStoredAutomationQueue();
}

/* =========================
   QUEUE SERVICE
========================= */

export function getAutomationQueue() {
  return loadAutomationQueueFromStorage();
}

export function replaceAutomationQueue(queue) {
  saveAutomationQueueToStorage(queue);
  return queue;
}

export function addAutomationJob(jobData) {
  const queue = getAutomationQueue();
  const newJob = createAutomationJob(jobData);
  const nextQueue = [newJob, ...queue];
  replaceAutomationQueue(nextQueue);
  syncSupplierOrderHistoryWithQueue(nextQueue);
  return newJob;
}

export function updateAutomationJob(jobId, updater) {
  const queue = getAutomationQueue();

  const nextQueue = queue.map((job) => {
    if (job.jobId !== jobId) return job;

    const updatedJob =
      typeof updater === "function" ? updater(job) : { ...job, ...updater };

    const nextJob = {
      ...updatedJob,
      updatedAt: new Date().toISOString(),
    };

    return syncSupplierOrderMetadata(nextJob);
  });

  replaceAutomationQueue(nextQueue);
  syncSupplierOrderHistoryWithQueue(nextQueue);
  return nextQueue;
}

export function removeAutomationJob(jobId) {
  const queue = getAutomationQueue();
  const nextQueue = queue.filter((job) => job.jobId !== jobId);
  replaceAutomationQueue(nextQueue);
  return nextQueue;
}

export function clearAutomationQueue() {
  clearAutomationQueueFromStorage();
  return [];
}

export function getAutomationJobById(jobId) {
  return getAutomationQueue().find((job) => job.jobId === jobId) || null;
}

export function getAutomationJobCounts(jobs) {
  return (jobs || []).reduce(
    (acc, job) => {
      acc.total += 1;
      if (job.status === JOB_STATUSES.PENDING) acc.pending += 1;
      if (job.status === JOB_STATUSES.RUNNING) acc.running += 1;
      if (job.status === JOB_STATUSES.DONE) acc.done += 1;
      if (job.status === JOB_STATUSES.FAILED) acc.failed += 1;
      return acc;
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

export function filterAutomationJobs(
  jobs,
  statusFilter = JOB_STATUSES.ALL,
  search = ""
) {
  const normalizedSearch = String(search || "").trim().toLowerCase();

  return (jobs || []).filter((job) => {
    const matchesStatus =
      statusFilter === JOB_STATUSES.ALL ? true : job.status === statusFilter;

    const matchesSearch =
      normalizedSearch === ""
        ? true
        : String(job.jobId).toLowerCase().includes(normalizedSearch) ||
          String(job.sessionId || "").toLowerCase().includes(normalizedSearch) ||
          (job.items || []).some((item) =>
            String(item.itemName || "").toLowerCase().includes(normalizedSearch)
          );

    return matchesStatus && matchesSearch;
  });
}

export function buildSuggestedOrderAutomationItems(suggestedOrder) {
  return (suggestedOrder || [])
    .filter((item) => item.orderAmount > 0)
    .map((item, index) => ({
      sequence: index + 1,
      itemId: item.id,
      itemName: item.name,
      quantity: item.orderAmount,
      source: SOURCES.REVIEW_SUGGESTED_ORDER,
      supplier: item.supplier || "",
      currentStock: item.currentStock,
      idealStock: item.idealStock,
      unit: item.unit,
      rawLine: `${item.name}\t${item.orderAmount}`,
    }));
}

export function buildSuggestedOrderAutomationJob(suggestedOrder) {
  const items = buildSuggestedOrderAutomationItems(suggestedOrder);

  return createAutomationJob({
    sessionId: Date.now(),
    source: SOURCES.REVIEW_SUGGESTED_ORDER,
    totalItems: items.length,
    items,
  });
}

export function buildStockTableAutomationItems(items, quantities) {
  return (items || []).map((item, index) => {
    const currentStock = getNumericValue(quantities[item.id]);
    const status = getItemStatus(item, quantities[item.id]);
    const orderAmount = Math.max(item.idealStock - currentStock, 0);

    return {
      sequence: index + 1,
      itemId: item.id,
      itemName: item.name,
      quantity: currentStock,
      source: SOURCES.REVIEW_STOCK_TABLE,
      supplier: item.supplier || "",
      currentStock,
      idealStock: item.idealStock,
      orderAmount,
      status,
      area: item.area,
      unit: item.unit,
      rawLine: [
        item.name,
        item.area,
        item.unit,
        item.idealStock,
        currentStock,
        status,
        orderAmount,
      ].join("\t"),
    };
  });
}

export function buildStockTableAutomationJob(items, quantities) {
  const stockItems = buildStockTableAutomationItems(items, quantities);

  return createAutomationJob({
    sessionId: Date.now(),
    source: SOURCES.REVIEW_STOCK_TABLE,
    totalItems: stockItems.length,
    items: stockItems,
  });
}

export function buildSupplierOrderAutomationItems(supplier, supplierItems) {
  return (supplierItems || [])
    .filter((item) => item.orderAmount > 0)
    .map((item, index) => ({
      sequence: index + 1,
      itemId: item.id,
      itemName: item.name,
      quantity: item.orderAmount,
      source: SOURCES.REVIEW_SUPPLIER_ORDER,
      supplier,
      currentStock: item.currentStock,
      idealStock: item.idealStock,
      unit: item.unit,
      rawLine: `${item.name}\t${item.orderAmount}`,
    }));
}

export function buildSupplierOrderPayload(supplier, supplierItems) {
  const items = buildSupplierOrderAutomationItems(supplier, supplierItems);

  return {
    supplier,
    source: SOURCES.REVIEW_SUPPLIER_ORDER,
    totalItems: items.length,
    items,
  };
}

export function buildSupplierOrderText(supplier, supplierItems) {
  const payload = buildSupplierOrderPayload(supplier, supplierItems);

  if (payload.items.length === 0) return "";

  const header = ["Item", "Current", "Ideal", "Order", "Unit"].join("\t");
  const rows = payload.items.map((item) =>
    [
      item.itemName,
      item.currentStock,
      item.idealStock,
      item.quantity,
      item.unit,
    ].join("\t")
  );

  return [`Supplier: ${supplier}`, header, ...rows].join("\n");
}

export function buildSupplierOrderAutomationJob(
  supplier,
  supplierItems,
  options = {}
) {
  const payload = buildSupplierOrderPayload(supplier, supplierItems);
  const now = new Date().toISOString();
  const revisionNumber = Number(options.revisionNumber || 1) || 1;
  const snapshot = buildSupplierOrderSnapshot(
    supplier,
    (supplierItems || []).map((item) => ({
      name: item.name,
      quantity: item.orderAmount,
      unit: item.unit,
    })),
    revisionNumber,
    now
  );

  return createAutomationJob({
    sessionId: Date.now(),
    source: payload.source,
    totalItems: payload.totalItems,
    items: payload.items,
    metadata: {
      supplierOrder: {
        supplier,
        itemCount: payload.totalItems,
        totalQuantity: snapshot.totalQuantity,
        status: SUPPLIER_ORDER_EXECUTION_STATUSES.SENT_TO_QUEUE,
        attempts: 0,
        revisionNumber,
        snapshot,
        sentAt: now,
        lastSentAt: now,
      },
    },
  });
}

/* =========================
   EXECUTOR
========================= */

function markJobRunning(queue, jobId) {
  return queue.map((job) =>
    job.jobId === jobId
      ? syncSupplierOrderMetadata({
          ...job,
          status: JOB_STATUSES.RUNNING,
          attemptCount: (job.attemptCount || 0) + 1,
          lastError: "",
          updatedAt: new Date().toISOString(),
        })
      : job
  );
}

function markJobDone(queue, jobId) {
  return queue.map((job) =>
    job.jobId === jobId
      ? syncSupplierOrderMetadata({
          ...job,
          status: JOB_STATUSES.DONE,
          updatedAt: new Date().toISOString(),
        })
      : job
  );
}

function markJobFailed(queue, jobId, errorMessage) {
  return queue.map((job) =>
    job.jobId === jobId
      ? syncSupplierOrderMetadata({
          ...job,
          status: JOB_STATUSES.FAILED,
          lastError: errorMessage || "Unknown automation error.",
          updatedAt: new Date().toISOString(),
        })
      : job
  );
}

export async function executeAutomationJob(jobId, options = {}) {
  const {
    shouldFail = false,
    delayMs = 1800,
    failureMessage = "Simulated automation failure.",
  } = options;

  let queue = getAutomationQueue();
  queue = markJobRunning(queue, jobId);
  replaceAutomationQueue(queue);
  syncSupplierOrderHistoryWithQueue(queue);

  await wait(delayMs);

  queue = getAutomationQueue();

  if (shouldFail) {
    queue = markJobFailed(queue, jobId, failureMessage);
    replaceAutomationQueue(queue);
    syncSupplierOrderHistoryWithQueue(queue);

    return {
      ok: false,
      queue,
    };
  }

  queue = markJobDone(queue, jobId);
  replaceAutomationQueue(queue);
  syncSupplierOrderHistoryWithQueue(queue);

  return {
    ok: true,
    queue,
  };
}
