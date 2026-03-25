import {
  JOB_STATUSES,
  SOURCES,
  SUPPLIER_ORDER_EXECUTION_STATUSES,
} from "../constants/app";
import {
  clearAutomationQueue as clearAutomationQueueRequest,
  createAutomationJob as createAutomationJobRequest,
  ensureAutomationQueueLoaded as ensureAutomationQueueLoadedRequest,
  ensureSupplierOrderHistoryLoaded as ensureSupplierOrderHistoryLoadedRequest,
  executeAutomationQueueJob,
  fetchAutomationQueue,
  fetchAutomationQueueSummary,
  fetchSupplierOrderHistory,
  getCachedAutomationQueue,
  getCachedAutomationSummary,
  getCachedSupplierOrderHistory,
  patchAutomationJobError,
  patchAutomationJobNotes,
  patchAutomationJobStatus,
  removeAutomationQueueJob,
  removeSupplierOrderHistory,
  resetAutomationQueueJob,
  subscribeAutomationQueue as subscribeAutomationQueueRequest,
  subscribeSupplierOrderHistory as subscribeSupplierOrderHistoryRequest,
} from "../repositories/automation-queue-repository";
import { getItemStatus, getNumericValue } from "./stock";

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

  if (jobStatus === JOB_STATUSES.PENDING) {
    return SUPPLIER_ORDER_EXECUTION_STATUSES.SENT_TO_QUEUE;
  }

  return SUPPLIER_ORDER_EXECUTION_STATUSES.SENT_TO_QUEUE;
}

function normalizeSnapshotItems(items = []) {
  return (items || [])
    .map((item) => ({
      name: item?.name || item?.itemName || "",
      quantity: Number(item?.quantity || item?.orderAmount || 0),
      unit: item?.unit || "",
    }))
    .filter((item) => item.name && item.quantity > 0)
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
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
  if (!snapshot) {
    return "";
  }

  const supplier = String(snapshot.supplier || "").trim().toLowerCase();
  const itemSignature = normalizeSnapshotItems(snapshot.items || [])
    .map((item) => `${item.name.toLowerCase()}|${item.quantity}|${item.unit}`)
    .join(";");

  return `${supplier}::${itemSignature}`;
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

function buildSnapshotFromJobItems(job) {
  return buildSupplierOrderSnapshot(
    getSupplierFromJob(job),
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
  if (!isSupplierOrderJob(job)) {
    return job;
  }

  const currentMetadata = job.metadata?.supplierOrder || {};
  const supplier = getSupplierFromJob(job);
  const snapshot = currentMetadata.snapshot || buildSnapshotFromJobItems(job);
  const attempts = Number(job.attemptCount || currentMetadata.attempts || 0);

  return {
    ...job,
    metadata: {
      ...(job.metadata || {}),
      supplierOrder: {
        supplier,
        itemCount: Array.isArray(job.items) ? job.items.length : 0,
        totalQuantity:
          currentMetadata.totalQuantity || snapshot.totalQuantity || getSupplierTotalQuantity(job.items),
        status:
          currentMetadata.status || mapJobStatusToSupplierExecutionStatus(job.status),
        attempts,
        revisionNumber:
          Number(currentMetadata.revisionNumber || snapshot.revisionNumber || 1) || 1,
        snapshot,
        sentAt: currentMetadata.sentAt || snapshot.timestamp || job.createdAt,
        lastSentAt:
          currentMetadata.lastSentAt ||
          currentMetadata.sentAt ||
          snapshot.timestamp ||
          job.updatedAt ||
          job.createdAt,
      },
    },
  };
}

function buildAutomationCreatePayload(jobData = {}) {
  return {
    type: jobData.type || undefined,
    sessionId: String(jobData.sessionId || Date.now()),
    source: jobData.source || SOURCES.UNKNOWN,
    notes: jobData.notes || "",
    attemptCount: Number(jobData.attemptCount || 0),
    lastError: jobData.lastError || "",
    items: Array.isArray(jobData.items)
      ? jobData.items.map((item, index) => ({
          sequence: Number(item.sequence || index + 1),
          itemId:
            item.itemId === null || item.itemId === undefined
              ? undefined
              : Number(item.itemId),
          itemName: item.itemName || "",
          quantity: Number(item.quantity || 0),
          source: item.source || jobData.source || SOURCES.UNKNOWN,
          supplier: item.supplier || "",
          currentStock:
            item.currentStock === null || item.currentStock === undefined
              ? undefined
              : Number(item.currentStock),
          idealStock:
            item.idealStock === null || item.idealStock === undefined
              ? undefined
              : Number(item.idealStock),
          orderAmount:
            item.orderAmount === null || item.orderAmount === undefined
              ? undefined
              : Number(item.orderAmount),
          status: item.status || "",
          area: item.area || "",
          unit: item.unit || "",
          rawLine: item.rawLine || "",
        }))
      : [],
    metadata:
      jobData.metadata && typeof jobData.metadata === "object"
        ? jobData.metadata
        : undefined,
  };
}

export function subscribeAutomationQueue(listener) {
  return subscribeAutomationQueueRequest(listener);
}

export function subscribeSupplierOrderHistory(listener) {
  return subscribeSupplierOrderHistoryRequest(listener);
}

export function ensureAutomationQueueLoaded() {
  return ensureAutomationQueueLoadedRequest();
}

export function refreshAutomationQueue() {
  return fetchAutomationQueue();
}

export function refreshAutomationSummary() {
  return fetchAutomationQueueSummary();
}

export function ensureSupplierOrderHistoryLoaded() {
  return ensureSupplierOrderHistoryLoadedRequest();
}

export function refreshSupplierOrderHistory() {
  return fetchSupplierOrderHistory();
}

export function getAutomationQueue() {
  return getCachedAutomationQueue();
}

export function getAutomationSummary() {
  return getCachedAutomationSummary();
}

export function getSupplierOrderHistory() {
  return getCachedSupplierOrderHistory();
}

export function clearSupplierOrderHistory() {
  return removeSupplierOrderHistory();
}

export function createAutomationJob(jobData = {}) {
  const now = new Date().toISOString();
  const nextJob = {
    jobId: jobData.jobId || String(Date.now()),
    sessionId: jobData.sessionId || String(Date.now()),
    createdAt: jobData.createdAt || now,
    updatedAt: jobData.updatedAt || now,
    status: jobData.status || JOB_STATUSES.PENDING,
    source: jobData.source || SOURCES.UNKNOWN,
    notes: jobData.notes || "",
    attemptCount: Number(jobData.attemptCount || 0),
    lastError: jobData.lastError || "",
    totalItems: Array.isArray(jobData.items)
      ? jobData.items.length
      : Number(jobData.totalItems || 0),
    items: Array.isArray(jobData.items) ? jobData.items : [],
    metadata: jobData.metadata || {},
  };

  return syncSupplierOrderMetadata(nextJob);
}

export async function addAutomationJob(jobData) {
  const payload = buildAutomationCreatePayload(jobData);
  const result = await createAutomationJobRequest(payload);

  if (!result?.job) {
    throw new Error(result?.errorMessage || "Failed to create automation job.");
  }

  return result.job;
}

export async function updateAutomationJobStatus(jobId, status, options = {}) {
  const result = await patchAutomationJobStatus(jobId, {
    status,
    incrementAttempts: Boolean(options.incrementAttempts),
  });

  if (!result?.job && !result?.ok) {
    throw new Error(result?.errorMessage || "Failed to update automation job.");
  }

  return result;
}

export async function setAutomationJobError(jobId, message, code = "") {
  const result = await patchAutomationJobError(jobId, {
    code,
    message,
  });

  if (!result?.job && !result?.ok) {
    throw new Error(result?.errorMessage || "Failed to update automation error.");
  }

  return result;
}

export async function updateAutomationJobNotes(jobId, notes) {
  const result = await patchAutomationJobNotes(jobId, {
    notes,
  });

  if (!result?.job && !result?.ok) {
    throw new Error(result?.errorMessage || "Failed to update automation notes.");
  }

  return result;
}

export async function resetAutomationJob(jobId) {
  const result = await resetAutomationQueueJob(jobId);

  if (!result?.job && !result?.ok) {
    throw new Error(result?.errorMessage || "Failed to reset automation job.");
  }

  return result;
}

export async function removeAutomationJob(jobId) {
  const result = await removeAutomationQueueJob(jobId);

  if (!result?.ok) {
    throw new Error(result?.errorMessage || "Failed to delete automation job.");
  }

  return getAutomationQueue();
}

export async function clearAutomationQueue() {
  const result = await clearAutomationQueueRequest();

  if (!result?.ok) {
    throw new Error(result?.errorMessage || "Failed to clear automation queue.");
  }

  return [];
}

export function getAutomationJobById(jobId) {
  return getAutomationQueue().find((job) => job.jobId === jobId) || null;
}

export function getAutomationJobCounts(jobs = []) {
  return (jobs || []).reduce(
    (summary, job) => {
      summary.total += 1;
      if (job.status === JOB_STATUSES.PENDING) summary.pending += 1;
      if (job.status === JOB_STATUSES.RUNNING) summary.running += 1;
      if (job.status === JOB_STATUSES.DONE) summary.done += 1;
      if (job.status === JOB_STATUSES.FAILED) summary.failed += 1;
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
        : String(job.jobId || "").toLowerCase().includes(normalizedSearch) ||
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
      orderAmount: item.orderAmount,
      unit: item.unit,
      rawLine: `${item.name}\t${item.orderAmount}`,
    }));
}

export function buildSuggestedOrderAutomationJob(suggestedOrder) {
  const items = buildSuggestedOrderAutomationItems(suggestedOrder);

  return createAutomationJob({
    sessionId: String(Date.now()),
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
    sessionId: String(Date.now()),
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
      orderAmount: item.orderAmount,
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

  if (payload.items.length === 0) {
    return "";
  }

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
    sessionId: String(Date.now()),
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

export async function executeAutomationJob(jobId, options = {}) {
  const result = await executeAutomationQueueJob(jobId, {
    shouldFail: Boolean(options.shouldFail),
    failureMessage:
      options.failureMessage || "Simulated website or selector failure.",
  });

  return {
    ok: Boolean(result?.ok),
    queue: getAutomationQueue(),
    job: result?.job || null,
  };
}
