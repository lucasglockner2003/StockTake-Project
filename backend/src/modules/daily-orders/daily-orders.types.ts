import { DailyOrderSource, DailyOrderStatus } from '../../generated/prisma/client';

export const UNKNOWN_SUPPLIER_LABEL = 'Unknown Supplier';

export const DAILY_ORDER_STATUS_VALUES = {
  DRAFT: 'draft',
  READY: 'ready-to-execute',
  FILLING_ORDER: 'filling-order',
  READY_FOR_CHEF_REVIEW: 'ready-for-chef-review',
  EXECUTED: 'executed',
  FAILED: 'failed',
} as const;

export type DailyOrderStatusValue =
  (typeof DAILY_ORDER_STATUS_VALUES)[keyof typeof DAILY_ORDER_STATUS_VALUES];

export interface DailyOrderItemResponse {
  itemIndex: number;
  itemId: number;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface DailyOrderResponse {
  id: string;
  supplier: string;
  source: string;
  items: DailyOrderItemResponse[];
  totalQuantity: number;
  createdAt: string;
  status: DailyOrderStatusValue;
  isLocked: boolean;
  attempts: number;
  readyAt: string | null;
  executionStartedAt: string | null;
  executionFinishedAt: string | null;
  executionDuration: number | null;
  filledAt: string | null;
  readyForReviewAt: string | null;
  executionNotes: string;
  reviewScreenshot: string;
  chefApprovedAt: string | null;
  submittedAt: string | null;
  submitStartedAt: string | null;
  submitFinishedAt: string | null;
  submitDuration: number | null;
  finalExecutionNotes: string;
  finalScreenshot: string;
  orderNumber: string;
  lastExecutionId: string;
  lastExecutionPhase: string;
  lastErrorCode: string;
  lastErrorMessage: string;
}

export interface DailyOrdersSummaryResponse {
  total: number;
  draft: number;
  ready: number;
  fillingOrder: number;
  readyForChefReview: number;
  executed: number;
  failed: number;
}

export interface DailyOrdersCreateResponse {
  createdOrders: DailyOrderResponse[];
  summary: DailyOrdersSummaryResponse;
}

export interface DailyOrderMutationResponse {
  ok: boolean;
  reason: string;
  order: DailyOrderResponse | null;
  summary: DailyOrdersSummaryResponse;
  errorCode: string;
  errorMessage: string;
  executionId: string;
  phase: string;
}

export interface DailyOrdersResetResponse {
  ok: boolean;
  deletedCount: number;
  summary: DailyOrdersSummaryResponse;
  reason: string;
  errorCode: string;
  errorMessage: string;
}

export interface DailyOrderCreateItemInput {
  itemId: number;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface DailyOrderCreateInput {
  supplier: string;
  source: DailyOrderSource;
  items: DailyOrderCreateItemInput[];
}

export interface DailyOrderBotPayloadItem {
  itemName: string;
  quantity: number;
  unit: string;
}

export interface DailyOrderBotPayload {
  supplier: string;
  items: DailyOrderBotPayloadItem[];
}

export function createEmptyDailyOrdersSummary(): DailyOrdersSummaryResponse {
  return {
    total: 0,
    draft: 0,
    ready: 0,
    fillingOrder: 0,
    readyForChefReview: 0,
    executed: 0,
    failed: 0,
  };
}

export function mapPrismaDailyOrderStatusToApi(
  status: DailyOrderStatus,
): DailyOrderStatusValue {
  if (status === DailyOrderStatus.READY_TO_EXECUTE) {
    return DAILY_ORDER_STATUS_VALUES.READY;
  }

  if (status === DailyOrderStatus.FILLING_ORDER) {
    return DAILY_ORDER_STATUS_VALUES.FILLING_ORDER;
  }

  if (status === DailyOrderStatus.READY_FOR_CHEF_REVIEW) {
    return DAILY_ORDER_STATUS_VALUES.READY_FOR_CHEF_REVIEW;
  }

  if (status === DailyOrderStatus.EXECUTED) {
    return DAILY_ORDER_STATUS_VALUES.EXECUTED;
  }

  if (status === DailyOrderStatus.FAILED) {
    return DAILY_ORDER_STATUS_VALUES.FAILED;
  }

  return DAILY_ORDER_STATUS_VALUES.DRAFT;
}
