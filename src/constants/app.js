export const PAGE_IDS = {
  STOCK: "stock",
  REVIEW: "review",
  SUPPLIER_REVIEW: "supplier-review",
  VOICE: "voice",
  PHOTO: "photo",
  AUTOMATION: "automation",
  DAILY_ORDER_EXECUTION: "daily-order-execution",
};

export const JOB_STATUSES = {
  ALL: "all",
  PENDING: "pending",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
};

export const ENTRY_STATUSES = {
  MATCHED: "Matched",
  FUZZY_MATCH: "Fuzzy Match",
  NOT_FOUND: "Not Found",
};

export const ENTRY_MATCH_TYPES = {
  EXACT: "exact",
  FUZZY: "fuzzy",
  NONE: "none",
};

export const SOURCES = {
  UNKNOWN: "unknown",
  VOICE: "voice",
  PHOTO: "photo",
  PHOTO_ORDER: "photo-order",
  REVIEW_SUGGESTED_ORDER: "review-suggested-order",
  REVIEW_STOCK_TABLE: "review-stock-table",
  REVIEW_SUPPLIER_ORDER: "review-supplier-order",
};

export const SUPPLIER_ORDER_EXECUTION_STATUSES = {
  PENDING: "pending",
  SENT_TO_QUEUE: "sent-to-queue",
  EXECUTED: "executed",
  FAILED: "failed",
};

export const DAILY_ORDER_STATUSES = {
  DRAFT: "draft",
  READY: "ready-to-execute",
  FILLING_ORDER: "filling-order",
  READY_FOR_CHEF_REVIEW: "ready-for-chef-review",
  EXECUTED: "executed",
  FAILED: "failed",
};
