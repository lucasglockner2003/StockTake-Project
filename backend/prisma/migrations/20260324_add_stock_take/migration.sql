-- CreateTable
CREATE TABLE "stock_items" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "supplier" TEXT,
    "unit" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "idealStock" DOUBLE PRECISION NOT NULL,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_takes" (
    "id" TEXT NOT NULL,
    "takeDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastResetAt" TIMESTAMP(3),

    CONSTRAINT "stock_takes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_take_entries" (
    "id" TEXT NOT NULL,
    "stockTakeId" TEXT NOT NULL,
    "stockItemId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_take_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_takes_takeDate_key" ON "stock_takes"("takeDate");

-- CreateIndex
CREATE INDEX "stock_takes_takeDate_idx" ON "stock_takes"("takeDate");

-- CreateIndex
CREATE UNIQUE INDEX "stock_take_entries_stockTakeId_stockItemId_key" ON "stock_take_entries"("stockTakeId", "stockItemId");

-- CreateIndex
CREATE INDEX "stock_take_entries_stockItemId_idx" ON "stock_take_entries"("stockItemId");

-- AddForeignKey
ALTER TABLE "stock_take_entries" ADD CONSTRAINT "stock_take_entries_stockTakeId_fkey" FOREIGN KEY ("stockTakeId") REFERENCES "stock_takes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_take_entries" ADD CONSTRAINT "stock_take_entries_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
