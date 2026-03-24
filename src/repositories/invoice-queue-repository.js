import {
  deleteInvoice as deleteInvoiceRequest,
  getInvoiceById as getInvoiceByIdRequest,
  getInvoices as getInvoicesRequest,
  getInvoicesSummary as getInvoicesSummaryRequest,
  intakeInvoice as intakeInvoiceRequest,
  retryInvoice as retryInvoiceRequest,
} from "../services/invoices-service";
import { normalizeInvoiceDraft } from "../utils/invoiceParsing";

const EMPTY_SUMMARY = Object.freeze({
  total: 0,
  draft: 0,
  queued: 0,
  executed: 0,
  failed: 0,
});

let cachedInvoiceQueue = [];
let cachedInvoiceSummary = { ...EMPTY_SUMMARY };
let hasLoadedInvoices = false;
const listeners = new Set();

function normalizeInvoiceSummary(summary = {}) {
  return {
    total: Number(summary?.total || 0),
    draft: Number(summary?.draft || 0),
    queued: Number(summary?.queued || 0),
    executed: Number(summary?.executed || 0),
    failed: Number(summary?.failed || 0),
  };
}

function normalizeInvoice(invoice) {
  return normalizeInvoiceDraft(invoice);
}

function normalizeInvoiceQueue(queue = []) {
  return (queue || []).map((invoice) => normalizeInvoice(invoice));
}

function buildSummaryFromQueue(queue = []) {
  return queue.reduce(
    (summary, invoice) => {
      summary.total += 1;
      if (invoice.status === "draft") summary.draft += 1;
      if (invoice.status === "queued-to-bot") summary.queued += 1;
      if (invoice.status === "executed") summary.executed += 1;
      if (invoice.status === "failed") summary.failed += 1;
      return summary;
    },
    {
      total: 0,
      draft: 0,
      queued: 0,
      executed: 0,
      failed: 0,
    }
  );
}

function sortInvoices(queue = []) {
  return queue.slice().sort((left, right) => {
    return (
      new Date(right.updatedAt || right.createdAt || 0).getTime() -
      new Date(left.updatedAt || left.createdAt || 0).getTime()
    );
  });
}

function emitChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

function setCachedInvoices(queue, summary) {
  cachedInvoiceQueue = sortInvoices(normalizeInvoiceQueue(queue));
  cachedInvoiceSummary = summary
    ? normalizeInvoiceSummary(summary)
    : buildSummaryFromQueue(cachedInvoiceQueue);
  hasLoadedInvoices = true;
  emitChange();
}

function upsertCachedInvoice(invoice, summary) {
  const normalizedInvoice = normalizeInvoice(invoice);
  const nextQueue = [
    normalizedInvoice,
    ...cachedInvoiceQueue.filter((entry) => entry.id !== normalizedInvoice.id),
  ];

  setCachedInvoices(nextQueue, summary);
}

export function subscribeInvoiceQueue(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getCachedInvoiceQueue() {
  return cachedInvoiceQueue.slice();
}

export function getCachedInvoiceSummary() {
  return {
    ...cachedInvoiceSummary,
  };
}

export async function fetchInvoiceQueue() {
  const queue = await getInvoicesRequest();
  setCachedInvoices(queue);
  return getCachedInvoiceQueue();
}

export async function ensureInvoiceQueueLoaded() {
  if (hasLoadedInvoices) {
    return getCachedInvoiceQueue();
  }

  return fetchInvoiceQueue();
}

export async function fetchInvoiceQueueSummary() {
  const summary = await getInvoicesSummaryRequest();
  cachedInvoiceSummary = normalizeInvoiceSummary(summary);
  emitChange();
  return getCachedInvoiceSummary();
}

export async function submitInvoiceIntake(invoiceDraft) {
  const payload = await intakeInvoiceRequest({
    supplier: invoiceDraft?.supplier || "",
    invoiceNumber: invoiceDraft?.invoiceNumber || "",
    invoiceDate: invoiceDraft?.invoiceDate || "",
    items: (invoiceDraft?.items || []).map((item) => ({
      itemName: item.itemName || "",
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      lineTotal: Number(item.lineTotal || 0),
    })),
  });

  if (payload?.invoice) {
    upsertCachedInvoice(payload.invoice, payload.summary);
  }

  return {
    ...payload,
    invoice: payload?.invoice ? normalizeInvoice(payload.invoice) : null,
    summary: payload?.summary
      ? normalizeInvoiceSummary(payload.summary)
      : getCachedInvoiceSummary(),
  };
}

export async function retryInvoiceInQueue(invoiceId) {
  const payload = await retryInvoiceRequest(invoiceId);

  if (payload?.invoice) {
    upsertCachedInvoice(payload.invoice, payload.summary);
  }

  return {
    ...payload,
    invoice: payload?.invoice ? normalizeInvoice(payload.invoice) : null,
    summary: payload?.summary
      ? normalizeInvoiceSummary(payload.summary)
      : getCachedInvoiceSummary(),
  };
}

export async function deleteInvoiceFromQueue(invoiceId) {
  const payload = await deleteInvoiceRequest(invoiceId);

  if (payload?.ok) {
    const nextQueue = cachedInvoiceQueue.filter((invoice) => invoice.id !== invoiceId);
    setCachedInvoices(nextQueue, payload.summary);
  }

  return {
    ...payload,
    summary: payload?.summary
      ? normalizeInvoiceSummary(payload.summary)
      : getCachedInvoiceSummary(),
  };
}

export async function fetchInvoiceDetails(invoiceId) {
  const invoice = await getInvoiceByIdRequest(invoiceId);
  const normalizedInvoice = normalizeInvoice(invoice);
  upsertCachedInvoice(normalizedInvoice);
  return normalizedInvoice;
}
