CREATE TYPE "InvoiceStatus" AS ENUM (
    'DRAFT',
    'QUEUED',
    'EXECUTED',
    'FAILED'
);

CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL DEFAULT '',
    "invoiceDate" TEXT NOT NULL DEFAULT '',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "payloadSnapshot" JSONB,
    "filledItemsSnapshot" JSONB,
    "screenshotPath" TEXT NOT NULL DEFAULT '',
    "executionId" TEXT NOT NULL DEFAULT '',
    "executionDurationMs" INTEGER,
    "queuedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT NOT NULL DEFAULT '',
    "lastErrorMessage" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_supplier_idx" ON "invoices"("supplier");
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");
CREATE INDEX "invoice_items_itemName_idx" ON "invoice_items"("itemName");

CREATE UNIQUE INDEX "invoice_items_invoiceId_itemIndex_key"
    ON "invoice_items"("invoiceId", "itemIndex");

ALTER TABLE "invoice_items"
    ADD CONSTRAINT "invoice_items_invoiceId_fkey"
    FOREIGN KEY ("invoiceId")
    REFERENCES "invoices"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
