import {
  DailyOrderStatus,
  SupplierOrderHistoryStatus,
} from '../../generated/prisma/client';

export const SUPPLIER_HISTORY_STATUS_VALUES = {
  PENDING: 'pending',
  SENT_TO_QUEUE: 'sent-to-queue',
  EXECUTED: 'executed',
  FAILED: 'failed',
} as const;

export type SupplierHistoryStatusValue =
  (typeof SUPPLIER_HISTORY_STATUS_VALUES)[keyof typeof SUPPLIER_HISTORY_STATUS_VALUES];

export interface SupplierHistoryItemResponse {
  name: string;
  itemId: number | null;
  quantity: number;
  unit: string;
}

export interface SupplierHistoryResponse {
  id: string;
  dailyOrderId: string | null;
  jobId: string | null;
  supplier: string;
  supplierName: string;
  items: SupplierHistoryItemResponse[];
  totalItems: number;
  totalQuantity: number;
  status: SupplierHistoryStatusValue;
  revisionNumber: number;
  createdAt: string;
  updatedAt: string;
  timestamp: string;
  snapshotTimestamp: string;
  dailyOrderStatus: string;
}

export interface SupplierHistoryResetResponse {
  ok: boolean;
  deletedCount: number;
}

export interface SupplierHistorySnapshotItemInput {
  name: string;
  itemId: number | null;
  quantity: number;
  unit: string;
}

export interface SupplierHistorySyncInput {
  dailyOrderId: string;
  supplierName: string;
  items: SupplierHistorySnapshotItemInput[];
  totalItems: number;
  totalQuantity: number;
  status: DailyOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export function mapSupplierHistoryStatusToApi(
  status: SupplierOrderHistoryStatus,
): SupplierHistoryStatusValue {
  if (status === SupplierOrderHistoryStatus.SENT_TO_QUEUE) {
    return SUPPLIER_HISTORY_STATUS_VALUES.SENT_TO_QUEUE;
  }

  if (status === SupplierOrderHistoryStatus.EXECUTED) {
    return SUPPLIER_HISTORY_STATUS_VALUES.EXECUTED;
  }

  if (status === SupplierOrderHistoryStatus.FAILED) {
    return SUPPLIER_HISTORY_STATUS_VALUES.FAILED;
  }

  return SUPPLIER_HISTORY_STATUS_VALUES.PENDING;
}

export function mapDailyOrderStatusToSupplierHistoryStatus(
  status: DailyOrderStatus,
): SupplierOrderHistoryStatus {
  if (status === DailyOrderStatus.EXECUTED) {
    return SupplierOrderHistoryStatus.EXECUTED;
  }

  if (status === DailyOrderStatus.FAILED) {
    return SupplierOrderHistoryStatus.FAILED;
  }

  if (
    status === DailyOrderStatus.READY_TO_EXECUTE ||
    status === DailyOrderStatus.FILLING_ORDER ||
    status === DailyOrderStatus.READY_FOR_CHEF_REVIEW
  ) {
    return SupplierOrderHistoryStatus.SENT_TO_QUEUE;
  }

  return SupplierOrderHistoryStatus.PENDING;
}

export function mapDailyOrderStatusToApi(status: DailyOrderStatus): string {
  if (status === DailyOrderStatus.READY_TO_EXECUTE) {
    return 'ready-to-execute';
  }

  if (status === DailyOrderStatus.FILLING_ORDER) {
    return 'filling-order';
  }

  if (status === DailyOrderStatus.READY_FOR_CHEF_REVIEW) {
    return 'ready-for-chef-review';
  }

  if (status === DailyOrderStatus.EXECUTED) {
    return 'executed';
  }

  if (status === DailyOrderStatus.FAILED) {
    return 'failed';
  }

  return 'draft';
}
