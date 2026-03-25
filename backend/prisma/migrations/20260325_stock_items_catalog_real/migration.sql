ALTER TABLE "stock_items"
ADD COLUMN "category" TEXT NOT NULL DEFAULT '';

ALTER TABLE "stock_items"
ADD COLUMN "aliases" JSONB;

CREATE INDEX "stock_items_category_idx" ON "stock_items"("category");
CREATE INDEX "stock_items_supplier_idx" ON "stock_items"("supplier");

INSERT INTO "stock_items" (
  "id",
  "name",
  "supplier",
  "unit",
  "category",
  "aliases",
  "area",
  "idealStock",
  "critical",
  "isActive"
)
VALUES
  (1, 'Wings', 'Service Food', 'kg', 'Protein', '["wing","wings","winges","wing is","winges"]'::jsonb, 'Fridge', 15, false, true),
  (2, 'Dry Tomato', 'Service Food', 'kg', 'Pantry', '["dry tomato","dry tomatoes","dry tomata","dry tomoto","dry tomotoes"]'::jsonb, 'Fridge', 1, false, true),
  (3, 'Halloumi', 'Service Food', 'kg', 'Dairy', '["halloumi","haloumi","halumi"]'::jsonb, 'Fridge', 3, false, true),
  (4, 'Bacon', 'Service Food', 'kg', 'Protein', '["bacon"]'::jsonb, 'Fridge', 4, false, true),
  (5, 'Potato', 'Service Food', 'kg', 'Produce', '["potato","potatoes","tree potato"]'::jsonb, 'Fridge', 5, false, true),
  (6, 'Salsa', 'Produto da casa', 'kg', 'Prep', '["salsa","salsaa","south","southa","sousa","susa"]'::jsonb, 'Fridge', 4, false, true),
  (7, 'Tomato', 'Fresh Produce Co', 'kg', 'Produce', '["tomato","tomatoes"]'::jsonb, 'Fridge', 5, false, true),
  (8, 'Red Onion', 'Fresh Produce Co', 'kg', 'Produce', '["red onion","onion","red onions"]'::jsonb, 'Dry Section', 10, true, true),
  (9, 'Fries', 'Service Food', 'unit', 'Frozen', '["fries","chips","french fries"]'::jsonb, 'Freezer', 30, true, true),
  (10, 'Tender', 'Service Food', 'kg', 'Protein', '["tender","chicken tender","tenders"]'::jsonb, 'Pizza Fridge', 4, false, true),
  (11, 'Chicken Breast', 'Service Food', 'kg', 'Protein', '["tender prep","prep tender"]'::jsonb, 'Fridge', 12, false, true)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "supplier" = EXCLUDED."supplier",
  "unit" = EXCLUDED."unit",
  "category" = EXCLUDED."category",
  "aliases" = EXCLUDED."aliases",
  "area" = EXCLUDED."area",
  "idealStock" = EXCLUDED."idealStock",
  "critical" = EXCLUDED."critical",
  "isActive" = true;
