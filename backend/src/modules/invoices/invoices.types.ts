import { InvoiceStatus } from '../../generated/prisma/client';

export const INVOICE_STATUS_VALUES = {
  DRAFT: 'draft',
  QUEUED: 'queued-to-bot',
  EXECUTED: 'executed',
  FAILED: 'failed',
} as const;

export type InvoiceStatusValue =
  (typeof INVOICE_STATUS_VALUES)[keyof typeof INVOICE_STATUS_VALUES];

export interface InvoiceItemResponse {
  itemIndex: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceResponse {
  id: string;
  supplier: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: InvoiceItemResponse[];
  totalAmount: number;
  status: InvoiceStatusValue;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  executionMetadata: {
    lastQueuedAt: string;
    executionId: string;
    lastExecutionId: string;
    screenshot: string;
    duration: number;
    filledItems: unknown[];
    lastErrorCode: string;
    lastErrorMessage: string;
    notes: string;
    finishedAt: string;
    lastPayload: unknown;
  };
}

export interface InvoiceSummaryResponse {
  total: number;
  draft: number;
  queued: number;
  executed: number;
  failed: number;
}

export interface InvoiceMutationResponse {
  ok: boolean;
  reason: string;
  invoice: InvoiceResponse | null;
  summary: InvoiceSummaryResponse;
  errorCode: string;
  errorMessage: string;
}

export interface InvoiceDeleteResponse {
  ok: boolean;
  deletedId: string;
  summary: InvoiceSummaryResponse;
  reason: string;
  errorCode: string;
  errorMessage: string;
}

export function createEmptyInvoiceSummary(): InvoiceSummaryResponse {
  return {
    total: 0,
    draft: 0,
    queued: 0,
    executed: 0,
    failed: 0,
  };
}

export function mapInvoiceStatusToApi(status: InvoiceStatus): InvoiceStatusValue {
  if (status === InvoiceStatus.QUEUED) {
    return INVOICE_STATUS_VALUES.QUEUED;
  }

  if (status === InvoiceStatus.EXECUTED) {
    return INVOICE_STATUS_VALUES.EXECUTED;
  }

  if (status === InvoiceStatus.FAILED) {
    return INVOICE_STATUS_VALUES.FAILED;
  }

  return INVOICE_STATUS_VALUES.DRAFT;
}
