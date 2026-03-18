import { JOB_STATUSES, SOURCES } from "../constants/app";
import { getItemStatus, getNumericValue } from "./stock";

const AUTOMATION_QUEUE_KEY = "smartops-automation-queue";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* =========================
   JOB MODEL
========================= */

export function createAutomationJob(jobData = {}) {
  const now = new Date().toISOString();

  return {
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
  };
}

/* =========================
   STORAGE
========================= */

export function loadAutomationQueueFromStorage() {
  try {
    const saved = localStorage.getItem(AUTOMATION_QUEUE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAutomationQueueToStorage(queue) {
  try {
    localStorage.setItem(AUTOMATION_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage errors
  }
}

export function clearAutomationQueueFromStorage() {
  try {
    localStorage.removeItem(AUTOMATION_QUEUE_KEY);
  } catch {
    // ignore storage errors
  }
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
  return newJob;
}

export function updateAutomationJob(jobId, updater) {
  const queue = getAutomationQueue();

  const nextQueue = queue.map((job) => {
    if (job.jobId !== jobId) return job;

    const updatedJob =
      typeof updater === "function" ? updater(job) : { ...job, ...updater };

    return {
      ...updatedJob,
      updatedAt: new Date().toISOString(),
    };
  });

  replaceAutomationQueue(nextQueue);
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

/* =========================
   EXECUTOR
========================= */

function markJobRunning(queue, jobId) {
  return queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          status: JOB_STATUSES.RUNNING,
          attemptCount: (job.attemptCount || 0) + 1,
          lastError: "",
          updatedAt: new Date().toISOString(),
        }
      : job
  );
}

function markJobDone(queue, jobId) {
  return queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          status: JOB_STATUSES.DONE,
          updatedAt: new Date().toISOString(),
        }
      : job
  );
}

function markJobFailed(queue, jobId, errorMessage) {
  return queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          status: JOB_STATUSES.FAILED,
          lastError: errorMessage || "Unknown automation error.",
          updatedAt: new Date().toISOString(),
        }
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

  await wait(delayMs);

  queue = getAutomationQueue();

  if (shouldFail) {
    queue = markJobFailed(queue, jobId, failureMessage);
    replaceAutomationQueue(queue);

    return {
      ok: false,
      queue,
    };
  }

  queue = markJobDone(queue, jobId);
  replaceAutomationQueue(queue);

  return {
    ok: true,
    queue,
  };
}
