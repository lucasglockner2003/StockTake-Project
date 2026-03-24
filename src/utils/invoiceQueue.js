import { INVOICE_INTAKE_STATUSES } from "../constants/app";
import {
  getStoredInvoiceQueue,
  saveStoredInvoiceQueue,
} from "../repositories/invoice-queue-repository";
import { buildInvoiceAutomationPayload, normalizeInvoiceDraft } from "./invoiceParsing";

function saveInvoiceQueue(queue) {
  saveStoredInvoiceQueue(queue);
}

function normalizeInvoiceQueueEntry(invoice) {
  const normalized = normalizeInvoiceDraft(invoice);
  return {
    ...normalized,
    status: normalized.status || INVOICE_INTAKE_STATUSES.DRAFT,
    attempts: Number(normalized.attempts || 0),
    updatedAt: normalized.updatedAt || new Date().toISOString(),
    executionMetadata: {
      ...normalized.executionMetadata,
    },
  };
}

function normalizeInvoiceQueueEntries(queue) {
  return (queue || []).map(normalizeInvoiceQueueEntry);
}

export function getInvoiceQueue() {
  return normalizeInvoiceQueueEntries(getStoredInvoiceQueue());
}

export function replaceInvoiceQueue(queue) {
  const normalizedQueue = normalizeInvoiceQueueEntries(queue);
  saveInvoiceQueue(normalizedQueue);
  return normalizedQueue;
}

export function enqueueInvoiceForBot(invoiceDraft) {
  const queue = getInvoiceQueue();
  const baseInvoice = normalizeInvoiceQueueEntry(invoiceDraft);
  const existingInvoice =
    queue.find((invoice) => invoice.id === baseInvoice.id) || null;
  const payload = buildInvoiceAutomationPayload(baseInvoice);
  const now = new Date().toISOString();
  const nextInvoice = {
    ...baseInvoice,
    status: INVOICE_INTAKE_STATUSES.QUEUED,
    attempts: Number(existingInvoice?.attempts || baseInvoice.attempts || 0) + 1,
    updatedAt: now,
    executionMetadata: {
      ...(existingInvoice?.executionMetadata || {}),
      ...(baseInvoice.executionMetadata || {}),
      lastQueuedAt: now,
      lastPayload: payload,
      notes: "Invoice queued for bot execution.",
    },
  };

  const nextQueue = existingInvoice
    ? queue.map((invoice) => (invoice.id === nextInvoice.id ? nextInvoice : invoice))
    : [nextInvoice, ...queue];

  replaceInvoiceQueue(nextQueue);

  return {
    invoice: nextInvoice,
    payload,
    queue: nextQueue,
  };
}

export function completeInvoiceBotExecution(invoiceId, executionResult) {
  const queue = getInvoiceQueue();
  const existingInvoice = queue.find((invoice) => invoice.id === invoiceId) || null;

  if (!existingInvoice) {
    return {
      invoice: null,
      queue,
    };
  }

  const now = new Date().toISOString();
  const isSuccess =
    Boolean(executionResult?.ok) &&
    (executionResult?.status === INVOICE_INTAKE_STATUSES.EXECUTED ||
      executionResult?.success === true);
  const nextInvoice = {
    ...existingInvoice,
    status: isSuccess
      ? INVOICE_INTAKE_STATUSES.EXECUTED
      : INVOICE_INTAKE_STATUSES.FAILED,
    updatedAt: now,
    executionMetadata: {
      ...(existingInvoice.executionMetadata || {}),
      executionId:
        executionResult?.executionId ||
        existingInvoice.executionMetadata?.executionId ||
        "",
      lastExecutionId:
        executionResult?.executionId ||
        existingInvoice.executionMetadata?.lastExecutionId ||
        "",
      screenshot:
        executionResult?.screenshot ||
        existingInvoice.executionMetadata?.screenshot ||
        "",
      duration: Number(executionResult?.duration || 0),
      filledItems: Array.isArray(executionResult?.filledItems)
        ? executionResult.filledItems
        : existingInvoice.executionMetadata?.filledItems || [],
      lastErrorCode: isSuccess
        ? ""
        : executionResult?.errorCode || "INVOICE_EXECUTION_FAILED",
      lastErrorMessage: isSuccess
        ? ""
        : executionResult?.message ||
          executionResult?.notes ||
          "Invoice bot execution failed.",
      notes:
        executionResult?.notes ||
        executionResult?.message ||
        (isSuccess
          ? "Invoice intake bot execution completed."
          : "Invoice intake bot execution failed."),
      finishedAt: now,
    },
  };

  const nextQueue = queue.map((invoice) =>
    invoice.id === invoiceId ? nextInvoice : invoice
  );

  replaceInvoiceQueue(nextQueue);

  return {
    invoice: nextInvoice,
    queue: nextQueue,
  };
}

export function getInvoiceQueueCounts(queue) {
  return (queue || []).reduce(
    (acc, invoice) => {
      acc.total += 1;
      if (invoice.status === INVOICE_INTAKE_STATUSES.DRAFT) acc.draft += 1;
      if (invoice.status === INVOICE_INTAKE_STATUSES.QUEUED) acc.queued += 1;
      if (invoice.status === INVOICE_INTAKE_STATUSES.EXECUTED) acc.executed += 1;
      if (invoice.status === INVOICE_INTAKE_STATUSES.FAILED) acc.failed += 1;
      return acc;
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
