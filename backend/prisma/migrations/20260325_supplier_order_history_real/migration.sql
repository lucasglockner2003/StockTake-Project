CREATE TABLE "supplier_order_history" (
    "id" TEXT NOT NULL,
    "dailyOrderId" TEXT,
    "supplierName" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "SupplierOrderHistoryStatus" NOT NULL DEFAULT 'PENDING',
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_order_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_order_history_dailyOrderId_key"
ON "supplier_order_history"("dailyOrderId");

CREATE INDEX "supplier_order_history_supplierName_createdAt_idx"
ON "supplier_order_history"("supplierName", "createdAt");

CREATE INDEX "supplier_order_history_status_idx"
ON "supplier_order_history"("status");

ALTER TABLE "supplier_order_history"
ADD CONSTRAINT "supplier_order_history_dailyOrderId_fkey"
FOREIGN KEY ("dailyOrderId") REFERENCES "daily_orders"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

WITH prepared_orders AS (
    SELECT
        daily_order."id" AS "dailyOrderId",
        daily_order."supplier" AS "supplierName",
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', item."itemName",
                        'itemId', item."itemId",
                        'quantity', item."quantity",
                        'unit', item."unit"
                    )
                    ORDER BY item."itemIndex"
                )
                FROM "daily_order_items" AS item
                WHERE item."dailyOrderId" = daily_order."id"
            ),
            '[]'::jsonb
        ) AS "items",
        (
            SELECT COUNT(*)
            FROM "daily_order_items" AS item
            WHERE item."dailyOrderId" = daily_order."id"
        )::INTEGER AS "totalItems",
        daily_order."totalQuantity" AS "totalQuantity",
        CASE
            WHEN daily_order."status" = 'EXECUTED' THEN 'EXECUTED'::"SupplierOrderHistoryStatus"
            WHEN daily_order."status" = 'FAILED' THEN 'FAILED'::"SupplierOrderHistoryStatus"
            WHEN daily_order."status" IN ('READY_TO_EXECUTE', 'FILLING_ORDER', 'READY_FOR_CHEF_REVIEW')
                THEN 'SENT_TO_QUEUE'::"SupplierOrderHistoryStatus"
            ELSE 'PENDING'::"SupplierOrderHistoryStatus"
        END AS "status",
        ROW_NUMBER() OVER (
            PARTITION BY daily_order."supplier"
            ORDER BY COALESCE(daily_order."readyAt", daily_order."createdAt"), daily_order."createdAt"
        )::INTEGER AS "revisionNumber",
        COALESCE(daily_order."readyAt", daily_order."createdAt") AS "createdAt",
        daily_order."updatedAt" AS "updatedAt"
    FROM "daily_orders" AS daily_order
    WHERE daily_order."status" <> 'DRAFT'
)
INSERT INTO "supplier_order_history" (
    "id",
    "dailyOrderId",
    "supplierName",
    "items",
    "totalItems",
    "totalQuantity",
    "status",
    "revisionNumber",
    "createdAt",
    "updatedAt"
)
SELECT
    'history-' || prepared."dailyOrderId",
    prepared."dailyOrderId",
    prepared."supplierName",
    prepared."items",
    prepared."totalItems",
    prepared."totalQuantity",
    prepared."status",
    prepared."revisionNumber",
    prepared."createdAt",
    prepared."updatedAt"
FROM prepared_orders AS prepared;
