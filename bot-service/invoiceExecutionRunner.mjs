import fs from "fs";
import path from "path";
import { resolveMockPortalBaseUrl } from "./config.mjs";
import { resolveSupplierAdapter } from "./adapters/index.mjs";

function normalizeNumeric(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
}

function normalizeInvoicePayload(invoiceInput) {
  const supplier = String(invoiceInput?.supplier || "").trim();
  const invoiceNumber = String(invoiceInput?.invoiceNumber || "").trim();
  const invoiceDate = String(invoiceInput?.invoiceDate || "").trim();
  const items = Array.isArray(invoiceInput?.items)
    ? invoiceInput.items
        .map((item) => ({
          itemName: String(item?.itemName || item?.name || "").trim(),
          quantity: normalizeNumeric(item?.quantity),
          unitPrice: normalizeNumeric(item?.unitPrice),
          lineTotal: normalizeNumeric(item?.lineTotal),
        }))
        .filter((item) => item.itemName && item.quantity > 0)
    : [];

  if (!supplier) {
    throw new Error("Invoice payload must include supplier.");
  }

  if (items.length === 0) {
    throw new Error("Invoice payload must include at least one valid item.");
  }

  return {
    supplier,
    invoiceNumber,
    invoiceDate,
    items,
  };
}

export async function runInvoiceIntakeExecution({
  invoice,
  baseUrl = resolveMockPortalBaseUrl(process.env.MOCK_PORTAL_URL),
  screenshotPath,
  headless = true,
}) {
  const normalizedInvoice = normalizeInvoicePayload(invoice);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  const adapter = resolveSupplierAdapter(normalizedInvoice.supplier);
  const startedAt = Date.now();
  const runExecutionId = `invoice-run-${startedAt}-${Math.floor(Math.random() * 10000)}`;

  try {
    return await adapter.postGoodsReceived({
      invoice: normalizedInvoice,
      baseUrl,
      screenshotPath,
      headless,
    });
  } catch (error) {
    return {
      success: false,
      executionId: runExecutionId,
      duration: Date.now() - startedAt,
      screenshot: "",
      filledItems: [],
      notes: error?.message || "Goods received execution failed.",
    };
  }
}
