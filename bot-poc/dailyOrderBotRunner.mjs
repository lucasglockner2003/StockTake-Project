import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveSupplierAdapter } from "../bot-service/adapters/index.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getDefaultScreenshotPath() {
  return path.join(
    __dirname,
    "output",
    `review-${new Date().toISOString().replace(/[:.]/g, "-")}.png`
  );
}

export function normalizeOrderPayload(orderInput) {
  const supplier = String(orderInput?.supplier || "").trim();
  const items = Array.isArray(orderInput?.items)
    ? orderInput.items
        .map((item) => ({
          itemName: String(item?.itemName || item?.name || "").trim(),
          quantity: Number(item?.quantity || 0),
          unit: String(item?.unit || "").trim(),
        }))
        .filter((item) => item.itemName && item.quantity > 0)
    : [];

  if (!supplier) {
    throw new Error("Order JSON must include supplier.");
  }

  if (items.length === 0) {
    throw new Error("Order JSON must include at least one item.");
  }

  return {
    supplier,
    items,
  };
}

export function readOrderFromFile(orderPath) {
  if (!orderPath) {
    throw new Error("Missing --order argument.");
  }

  const raw = fs.readFileSync(orderPath, "utf-8");
  const parsed = JSON.parse(raw);
  return normalizeOrderPayload(parsed);
}

export async function runDailyOrderBot({
  order,
  baseUrl = process.env.MOCK_PORTAL_URL || "http://localhost:4177",
  screenshotPath = getDefaultScreenshotPath(),
  headless = true,
}) {
  const normalizedOrder = normalizeOrderPayload(order);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  const executionStartedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const adapter = resolveSupplierAdapter(normalizedOrder.supplier);

  try {
    return await adapter.fillDailyOrderToReview({
      order: normalizedOrder,
      baseUrl,
      screenshotPath,
      headless,
    });
  } catch (error) {
    const failedAt = new Date().toISOString();
    return {
      ok: false,
      status: "failed",
      supplier: normalizedOrder.supplier,
      reviewScreenshot: "",
      executionStartedAt,
      filledAt: null,
      readyForReviewAt: null,
      executionFinishedAt: failedAt,
      executionDuration: Date.now() - startedAtMs,
      executionNotes: error?.message || "Mock bot execution failed.",
    };
  }
}
