ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "executionStartedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "invoices_executionStartedAt_idx"
  ON "invoices"("executionStartedAt");
