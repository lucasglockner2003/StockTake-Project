import {
  AutomationJobSource,
  AutomationJobStatus,
  SupplierOrderHistoryStatus,
} from '../../generated/prisma/client';

export const AUTOMATION_JOB_STATUS_VALUES = {
  PENDING: 'pending',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
} as const;

export const AUTOMATION_JOB_SOURCE_VALUES = {
  UNKNOWN: 'unknown',
  PHOTO: 'photo',
  REVIEW_SUGGESTED_ORDER: 'review-suggested-order',
  REVIEW_STOCK_TABLE: 'review-stock-table',
  REVIEW_SUPPLIER_ORDER: 'review-supplier-order',
} as const;

export const SUPPLIER_ORDER_HISTORY_STATUS_VALUES = {
  PENDING: 'pending',
  SENT_TO_QUEUE: 'sent-to-queue',
  EXECUTED: 'executed',
  FAILED: 'failed',
} as const;

export type AutomationJobStatusValue =
  (typeof AUTOMATION_JOB_STATUS_VALUES)[keyof typeof AUTOMATION_JOB_STATUS_VALUES];

export type AutomationJobSourceValue =
  (typeof AUTOMATION_JOB_SOURCE_VALUES)[keyof typeof AUTOMATION_JOB_SOURCE_VALUES];

export type SupplierOrderHistoryStatusValue =
  (typeof SUPPLIER_ORDER_HISTORY_STATUS_VALUES)[keyof typeof SUPPLIER_ORDER_HISTORY_STATUS_VALUES];

export interface AutomationJobItemResponse {
  sequence: number;
  itemId: number | null;
  itemName: string;
  quantity: number;
  source: AutomationJobSourceValue;
  supplier: string;
  currentStock: number | null;
  idealStock: number | null;
  orderAmount: number | null;
  status: string;
  area: string;
  unit: string;
  rawLine: string;
}

export interface SupplierOrderSnapshotItemResponse {
  name: string;
  quantity: number;
  unit: string;
}

export interface SupplierOrderSnapshotResponse {
  supplier: string;
  items: SupplierOrderSnapshotItemResponse[];
  totalQuantity: number;
  timestamp: string;
  revisionNumber: number;
}

export interface SupplierOrderMetadataResponse {
  supplier: string;
  itemCount: number;
  totalQuantity: number;
  status: SupplierOrderHistoryStatusValue;
  attempts: number;
  revisionNumber: number;
  snapshot: SupplierOrderSnapshotResponse;
  sentAt: string;
  lastSentAt: string;
}

export interface AutomationJobResponse {
  jobId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: AutomationJobStatusValue;
  source: AutomationJobSourceValue;
  notes: string;
  attemptCount: number;
  lastError: string;
  totalItems: number;
  items: AutomationJobItemResponse[];
  metadata: {
    supplierOrder: SupplierOrderMetadataResponse | null;
  };
  executionMetadata: {
    runStartedAt: string | null;
    runFinishedAt: string | null;
    runDuration: number | null;
    lastErrorCode: string;
    lastErrorMessage: string;
  };
}

export interface AutomationJobsSummaryResponse {
  total: number;
  pending: number;
  running: number;
  done: number;
  failed: number;
}

export interface AutomationJobMutationResponse {
  ok: boolean;
  reason: string;
  job: AutomationJobResponse | null;
  summary: AutomationJobsSummaryResponse;
  errorCode: string;
  errorMessage: string;
}

export interface AutomationJobDeleteResponse {
  ok: boolean;
  deletedId: string;
  summary: AutomationJobsSummaryResponse;
  reason: string;
  errorCode: string;
  errorMessage: string;
}

export interface AutomationJobsResetResponse {
  ok: boolean;
  deletedCount: number;
  summary: AutomationJobsSummaryResponse;
  reason: string;
  errorCode: string;
  errorMessage: string;
}

export interface SupplierOrderHistoryResponse {
  id: string;
  jobId: string;
  supplier: string;
  items: SupplierOrderSnapshotItemResponse[];
  totalQuantity: number;
  timestamp: string;
  snapshotTimestamp: string;
  revisionNumber: number;
  snapshot: SupplierOrderSnapshotResponse;
  status: SupplierOrderHistoryStatusValue;
  attempts: number;
}

export interface SupplierOrderHistoryResetResponse {
  ok: boolean;
  deletedCount: number;
}

export function createEmptyAutomationSummary(): AutomationJobsSummaryResponse {
  return {
    total: 0,
    pending: 0,
    running: 0,
    done: 0,
    failed: 0,
  };
}

export function mapAutomationJobStatusToApi(
  status: AutomationJobStatus,
): AutomationJobStatusValue {
  if (status === AutomationJobStatus.RUNNING) {
    return AUTOMATION_JOB_STATUS_VALUES.RUNNING;
  }

  if (status === AutomationJobStatus.DONE) {
    return AUTOMATION_JOB_STATUS_VALUES.DONE;
  }

  if (status === AutomationJobStatus.FAILED) {
    return AUTOMATION_JOB_STATUS_VALUES.FAILED;
  }

  return AUTOMATION_JOB_STATUS_VALUES.PENDING;
}

export function mapApiAutomationJobStatusToPrisma(
  status: string,
): AutomationJobStatus {
  if (status === AUTOMATION_JOB_STATUS_VALUES.RUNNING) {
    return AutomationJobStatus.RUNNING;
  }

  if (status === AUTOMATION_JOB_STATUS_VALUES.DONE) {
    return AutomationJobStatus.DONE;
  }

  if (status === AUTOMATION_JOB_STATUS_VALUES.FAILED) {
    return AutomationJobStatus.FAILED;
  }

  return AutomationJobStatus.PENDING;
}

export function mapAutomationJobSourceToApi(
  source: AutomationJobSource,
): AutomationJobSourceValue {
  if (source === AutomationJobSource.PHOTO) {
    return AUTOMATION_JOB_SOURCE_VALUES.PHOTO;
  }

  if (source === AutomationJobSource.REVIEW_SUGGESTED_ORDER) {
    return AUTOMATION_JOB_SOURCE_VALUES.REVIEW_SUGGESTED_ORDER;
  }

  if (source === AutomationJobSource.REVIEW_STOCK_TABLE) {
    return AUTOMATION_JOB_SOURCE_VALUES.REVIEW_STOCK_TABLE;
  }

  if (source === AutomationJobSource.REVIEW_SUPPLIER_ORDER) {
    return AUTOMATION_JOB_SOURCE_VALUES.REVIEW_SUPPLIER_ORDER;
  }

  return AUTOMATION_JOB_SOURCE_VALUES.UNKNOWN;
}

export function mapApiAutomationJobSourceToPrisma(
  source: string,
): AutomationJobSource {
  if (source === AUTOMATION_JOB_SOURCE_VALUES.PHOTO) {
    return AutomationJobSource.PHOTO;
  }

  if (source === AUTOMATION_JOB_SOURCE_VALUES.REVIEW_SUGGESTED_ORDER) {
    return AutomationJobSource.REVIEW_SUGGESTED_ORDER;
  }

  if (source === AUTOMATION_JOB_SOURCE_VALUES.REVIEW_STOCK_TABLE) {
    return AutomationJobSource.REVIEW_STOCK_TABLE;
  }

  if (source === AUTOMATION_JOB_SOURCE_VALUES.REVIEW_SUPPLIER_ORDER) {
    return AutomationJobSource.REVIEW_SUPPLIER_ORDER;
  }

  return AutomationJobSource.UNKNOWN;
}

export function mapSupplierOrderHistoryStatusToApi(
  status: SupplierOrderHistoryStatus,
): SupplierOrderHistoryStatusValue {
  if (status === SupplierOrderHistoryStatus.PENDING) {
    return SUPPLIER_ORDER_HISTORY_STATUS_VALUES.PENDING;
  }

  if (status === SupplierOrderHistoryStatus.EXECUTED) {
    return SUPPLIER_ORDER_HISTORY_STATUS_VALUES.EXECUTED;
  }

  if (status === SupplierOrderHistoryStatus.FAILED) {
    return SUPPLIER_ORDER_HISTORY_STATUS_VALUES.FAILED;
  }

  return SUPPLIER_ORDER_HISTORY_STATUS_VALUES.SENT_TO_QUEUE;
}
