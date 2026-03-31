CREATE TYPE "ExecutionIdempotencyOperation" AS ENUM (
  'INVOICE_EXECUTE',
  'DAILY_ORDER_FILL',
  'DAILY_ORDER_FINAL_SUBMIT'
);

CREATE TABLE "execution_idempotency" (
  "id" TEXT NOT NULL,
  "operation" "ExecutionIdempotencyOperation" NOT NULL,
  "entityId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "isFinal" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT '',
  "executionId" TEXT NOT NULL DEFAULT '',
  "screenshotPath" TEXT NOT NULL DEFAULT '',
  "reviewScreenshotPath" TEXT NOT NULL DEFAULT '',
  "finalScreenshotPath" TEXT NOT NULL DEFAULT '',
  "errorCode" TEXT NOT NULL DEFAULT '',
  "errorMessage" TEXT NOT NULL DEFAULT '',
  "responseSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "execution_idempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "execution_idempotency_operation_entityId_idempotencyKey_key"
ON "execution_idempotency"("operation", "entityId", "idempotencyKey");

CREATE INDEX "execution_idempotency_entityId_idempotencyKey_idx"
ON "execution_idempotency"("entityId", "idempotencyKey");

CREATE INDEX "execution_idempotency_operation_entityId_idx"
ON "execution_idempotency"("operation", "entityId");
