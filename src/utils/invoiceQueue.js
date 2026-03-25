import {
  deleteInvoiceFromQueue,
  executeInvoiceInQueue,
  ensureInvoiceQueueLoaded as ensureInvoiceQueueLoadedRequest,
  fetchInvoiceQueue as fetchInvoiceQueueRequest,
  fetchInvoiceQueueSummary,
  getCachedInvoiceQueue,
  getCachedInvoiceSummary,
  retryInvoiceInQueue,
  submitInvoiceIntake as submitInvoiceIntakeRequest,
  subscribeInvoiceQueue as subscribeInvoiceQueueRequest,
} from "../repositories/invoice-queue-repository";

export function subscribeInvoiceQueue(listener) {
  return subscribeInvoiceQueueRequest(listener);
}

export function ensureInvoiceQueueLoaded() {
  return ensureInvoiceQueueLoadedRequest();
}

export function refreshInvoiceQueue() {
  return fetchInvoiceQueueRequest();
}

export function refreshInvoiceQueueSummary() {
  return fetchInvoiceQueueSummary();
}

export function getInvoiceQueue() {
  return getCachedInvoiceQueue();
}

export function getInvoiceQueueSummary() {
  return getCachedInvoiceSummary();
}

export function getInvoiceQueueCounts(queue = []) {
  return (queue || []).reduce(
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

export function submitInvoiceIntake(invoiceDraft) {
  return submitInvoiceIntakeRequest(invoiceDraft);
}

export function retryInvoice(invoiceId) {
  return retryInvoiceInQueue(invoiceId);
}

export function executeInvoice(invoiceId) {
  return executeInvoiceInQueue(invoiceId);
}

export function deleteInvoice(invoiceId) {
  return deleteInvoiceFromQueue(invoiceId);
}
