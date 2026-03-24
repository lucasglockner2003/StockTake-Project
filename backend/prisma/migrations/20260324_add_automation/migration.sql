CREATE TYPE "AutomationJobStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'DONE',
    'FAILED'
);

CREATE TYPE "AutomationJobSource" AS ENUM (
    'UNKNOWN',
    'PHOTO',
    'REVIEW_SUGGESTED_ORDER',
    'REVIEW_STOCK_TABLE',
    'REVIEW_SUPPLIER_ORDER'
);

CREATE TYPE "SupplierOrderHistoryStatus" AS ENUM (
    'PENDING',
    'SENT_TO_QUEUE',
    'EXECUTED',
    'FAILED'
);

CREATE TABLE "automation_jobs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL DEFAULT '',
    "source" "AutomationJobSource" NOT NULL DEFAULT 'UNKNOWN',
    "status" "AutomationJobStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "metadataSnapshot" JSONB,
    "lastErrorCode" TEXT NOT NULL DEFAULT '',
    "lastErrorMessage" TEXT NOT NULL DEFAULT '',
    "runStartedAt" TIMESTAMP(3),
    "runFinishedAt" TIMESTAMP(3),
    "runDurationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "automation_job_items" (
    "id" TEXT NOT NULL,
    "automationJobId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "itemId" INTEGER,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "source" "AutomationJobSource" NOT NULL DEFAULT 'UNKNOWN',
    "supplier" TEXT NOT NULL DEFAULT '',
    "currentStock" DOUBLE PRECISION,
    "idealStock" DOUBLE PRECISION,
    "orderAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT '',
    "area" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "rawLine" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_job_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_order_history_revisions" (
    "id" TEXT NOT NULL,
    "automationJobId" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "totalQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "SupplierOrderHistoryStatus" NOT NULL DEFAULT 'SENT_TO_QUEUE',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "snapshotTimestamp" TIMESTAMP(3) NOT NULL,
    "snapshotSignature" TEXT NOT NULL DEFAULT '',
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_order_history_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "automation_jobs_createdAt_idx" ON "automation_jobs"("createdAt");
CREATE INDEX "automation_jobs_status_idx" ON "automation_jobs"("status");
CREATE INDEX "automation_jobs_source_idx" ON "automation_jobs"("source");
CREATE INDEX "automation_job_items_itemName_idx" ON "automation_job_items"("itemName");
CREATE INDEX "automation_job_items_supplier_idx" ON "automation_job_items"("supplier");
CREATE INDEX "supplier_order_history_revisions_supplier_snapshotTimestamp_idx"
    ON "supplier_order_history_revisions"("supplier", "snapshotTimestamp");
CREATE INDEX "supplier_order_history_revisions_status_idx"
    ON "supplier_order_history_revisions"("status");

CREATE UNIQUE INDEX "automation_job_items_automationJobId_sequence_key"
    ON "automation_job_items"("automationJobId", "sequence");

CREATE UNIQUE INDEX "supplier_order_history_revisions_automationJobId_key"
    ON "supplier_order_history_revisions"("automationJobId");

ALTER TABLE "automation_job_items"
    ADD CONSTRAINT "automation_job_items_automationJobId_fkey"
    FOREIGN KEY ("automationJobId")
    REFERENCES "automation_jobs"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "supplier_order_history_revisions"
    ADD CONSTRAINT "supplier_order_history_revisions_automationJobId_fkey"
    FOREIGN KEY ("automationJobId")
    REFERENCES "automation_jobs"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
