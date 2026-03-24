CREATE TYPE "DailyOrderStatus" AS ENUM (
    'DRAFT',
    'READY_TO_EXECUTE',
    'FILLING_ORDER',
    'READY_FOR_CHEF_REVIEW',
    'EXECUTED',
    'FAILED'
);

CREATE TYPE "DailyOrderSource" AS ENUM (
    'PHOTO',
    'SUGGESTED_ORDER'
);

CREATE TABLE "daily_orders" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "source" "DailyOrderSource" NOT NULL,
    "status" "DailyOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "totalQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "readyAt" TIMESTAMP(3),
    "executionStartedAt" TIMESTAMP(3),
    "executionFinishedAt" TIMESTAMP(3),
    "executionDurationMs" INTEGER,
    "filledAt" TIMESTAMP(3),
    "readyForReviewAt" TIMESTAMP(3),
    "executionNotes" TEXT NOT NULL DEFAULT '',
    "reviewScreenshotPath" TEXT NOT NULL DEFAULT '',
    "chefApprovedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "submitStartedAt" TIMESTAMP(3),
    "submitFinishedAt" TIMESTAMP(3),
    "submitDurationMs" INTEGER,
    "finalExecutionNotes" TEXT NOT NULL DEFAULT '',
    "finalScreenshotPath" TEXT NOT NULL DEFAULT '',
    "orderNumber" TEXT NOT NULL DEFAULT '',
    "lastExecutionId" TEXT NOT NULL DEFAULT '',
    "lastExecutionPhase" TEXT NOT NULL DEFAULT '',
    "lastErrorCode" TEXT NOT NULL DEFAULT '',
    "lastErrorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_order_items" (
    "id" TEXT NOT NULL,
    "dailyOrderId" TEXT NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "daily_orders_createdAt_idx" ON "daily_orders"("createdAt");
CREATE INDEX "daily_orders_status_idx" ON "daily_orders"("status");
CREATE INDEX "daily_orders_supplier_idx" ON "daily_orders"("supplier");
CREATE INDEX "daily_order_items_itemId_idx" ON "daily_order_items"("itemId");

CREATE UNIQUE INDEX "daily_order_items_dailyOrderId_itemIndex_key"
    ON "daily_order_items"("dailyOrderId", "itemIndex");

ALTER TABLE "daily_order_items"
    ADD CONSTRAINT "daily_order_items_dailyOrderId_fkey"
    FOREIGN KEY ("dailyOrderId")
    REFERENCES "daily_orders"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
