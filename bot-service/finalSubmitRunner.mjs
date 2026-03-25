import { normalizeOrderPayload } from "../bot-poc/dailyOrderBotRunner.mjs";
import { resolveMockPortalBaseUrl } from "./config.mjs";
import { resolveSupplierAdapter } from "./adapters/index.mjs";

export async function runDailyOrderFinalSubmit({
  order,
  baseUrl = resolveMockPortalBaseUrl(process.env.MOCK_PORTAL_URL),
  finalScreenshotPath,
  headless = true,
}) {
  const normalizedOrder = normalizeOrderPayload(order);
  const adapter = resolveSupplierAdapter(normalizedOrder.supplier);
  const submitStartedAt = new Date().toISOString();

  try {
    return await adapter.submitDailyOrder({
      order: normalizedOrder,
      baseUrl,
      finalScreenshotPath,
      headless,
    });
  } catch (error) {
    const failedAt = new Date().toISOString();
    return {
      ok: false,
      status: "failed",
      supplier: normalizedOrder.supplier,
      orderNumber: "",
      submittedAt: null,
      submitStartedAt,
      submitFinishedAt: failedAt,
      submitDuration: 0,
      finalScreenshot: "",
      finalExecutionNotes: error?.message || "Final submit failed on mock portal.",
    };
  }
}
