import { runPortalAutomation } from "../browserRunner.mjs";
import {
  getNodeEnv,
  isBrowserAutomationEnabled,
  resolveMockPortalBaseUrl,
} from "../config.mjs";

const NODE_ENV = getNodeEnv();

function logInfo(message, details) {
  if (details === undefined) {
    console.log(`[mockPortalAdapter] ${message}`);
    return;
  }

  console.log(`[mockPortalAdapter] ${message}`, details);
}

function logWarn(message, details) {
  if (details === undefined) {
    console.warn(`[mockPortalAdapter] ${message}`);
    return;
  }

  console.warn(`[mockPortalAdapter] ${message}`, details);
}

function normalizePortalBaseUrl(value) {
  return resolveMockPortalBaseUrl(value, NODE_ENV);
}

function shouldUseBrowserAutomation() {
  return isBrowserAutomationEnabled(NODE_ENV);
}

function buildPublicArtifactPath(filePath) {
  const normalizedPath = String(filePath || "").trim().replace(/\\/g, "/");

  if (!normalizedPath) {
    return "";
  }

  const artifactsMarker = "/artifacts/";
  const artifactsIndex = normalizedPath.lastIndexOf(artifactsMarker);

  if (artifactsIndex >= 0) {
    return normalizedPath.slice(artifactsIndex);
  }

  const outputMarker = "/output/";
  const outputIndex = normalizedPath.lastIndexOf(outputMarker);

  if (outputIndex >= 0) {
    return `/artifacts/${normalizedPath.slice(outputIndex + outputMarker.length)}`;
  }

  const pathSegments = normalizedPath.split("/").filter(Boolean);
  return pathSegments.length > 0
    ? `/artifacts/${pathSegments[pathSegments.length - 1]}`
    : "";
}

function buildPortalExecutionError(executionType, error) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : `Unknown browser automation error for ${executionType}.`;

  if (
    rawMessage.includes("spawn EPERM") ||
    rawMessage.includes("Failed to launch the browser process")
  ) {
    return new Error(
      `Browser launch failed for ${executionType}. Check Puppeteer permissions and browser sandbox settings.`,
    );
  }

  return new Error(rawMessage);
}

function requireBrowserAutomation(executionType, supplier, baseUrl, screenshotPath) {
  const useBrowser = shouldUseBrowserAutomation();

  console.log("[mockPortalAdapter] USE_BROWSER:", useBrowser ? "true" : "false");

  if (!useBrowser) {
    throw new Error(
      `USE_BROWSER must be true for ${executionType}. Real screenshot capture requires browser automation.`,
    );
  }

  console.log("[mockPortalAdapter] Using browser automation");
  logInfo(`Browser automation requested for ${executionType}.`, {
    supplier,
    screenshotPath,
    baseUrl: normalizePortalBaseUrl(baseUrl),
  });
}

function resolveBrowserScreenshot(browserResult, executionType) {
  const screenshot = String(
    browserResult?.screenshot || buildPublicArtifactPath(browserResult?.screenshotPath),
  ).trim();

  console.log("[mockPortalAdapter] Using screenshot:", browserResult?.screenshot || "");

  if (screenshot.startsWith("/artifacts/")) {
    return screenshot;
  }

  throw new Error(
    `Browser automation for ${executionType} finished without a valid screenshot.`,
  );
}

async function runBrowserPortalAutomation({
  executionType,
  supplier,
  items,
  baseUrl,
  screenshotPath,
  invoiceNumber = "",
  invoiceDate = "",
  headless = true,
}) {
  requireBrowserAutomation(executionType, supplier, baseUrl, screenshotPath);

  try {
    return await runPortalAutomation({
      executionType,
      supplier,
      items,
      portalBaseUrl: normalizePortalBaseUrl(baseUrl),
      screenshotPath,
      invoiceNumber,
      invoiceDate,
      headless,
    });
  } catch (error) {
    logWarn(`Browser automation failed for ${executionType}.`, {
      supplier,
      message: error instanceof Error ? error.message : String(error),
    });
    throw buildPortalExecutionError(executionType, error);
  }
}

function generateMockOrderNumber() {
  const timestampChunk = String(Date.now()).slice(-8);
  const randomChunk = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `SIM-${timestampChunk}-${randomChunk}`;
}

function buildProcessedItems(items = []) {
  return items.map((item) => ({
    itemName: String(item?.itemName || item?.name || "").trim(),
    quantity: Number(item?.quantity || 0),
    unit: String(item?.unit || "").trim(),
    unitPrice: Number(item?.unitPrice || 0),
    lineTotal: Number(item?.lineTotal || 0),
  }));
}

export const mockPortalAdapter = {
  async fillDailyOrderToReview({
    order,
    baseUrl = normalizePortalBaseUrl(process.env.MOCK_PORTAL_URL),
    screenshotPath,
    headless = true,
  }) {
    const browserResult = await runBrowserPortalAutomation({
      executionType: "fill-daily-order",
      supplier: order.supplier,
      items: order.items,
      baseUrl,
      screenshotPath,
      headless,
    });
    const executionStartedAt = new Date().toISOString();
    const finishedAt = new Date().toISOString();

    return {
      ok: true,
      status: "ready-for-chef-review",
      supplier: order.supplier,
      reviewScreenshot: resolveBrowserScreenshot(
        browserResult,
        "fill-daily-order",
      ),
      executionStartedAt,
      filledAt: finishedAt,
      readyForReviewAt: finishedAt,
      executionFinishedAt: finishedAt,
      executionDuration: Number(browserResult.duration || 0),
      executionNotes: `Completed using browser automation (${normalizePortalBaseUrl(baseUrl)}).`,
      itemsProcessed: browserResult.itemsProcessed || order.items.length,
    };
  },

  async submitDailyOrder({
    order,
    baseUrl = normalizePortalBaseUrl(process.env.MOCK_PORTAL_URL),
    finalScreenshotPath,
    headless = true,
  }) {
    const browserResult = await runBrowserPortalAutomation({
      executionType: "submit-daily-order",
      supplier: order.supplier,
      items: order.items,
      baseUrl,
      screenshotPath: finalScreenshotPath,
      headless,
    });
    const submitStartedAt = new Date().toISOString();
    const submittedAt = new Date().toISOString();

    return {
      ok: true,
      status: "executed",
      supplier: order.supplier,
      orderNumber: generateMockOrderNumber(),
      submittedAt,
      submitStartedAt,
      submitFinishedAt: submittedAt,
      submitDuration: Number(browserResult.duration || 0),
      finalScreenshot: resolveBrowserScreenshot(
        browserResult,
        "submit-daily-order",
      ),
      finalExecutionNotes: `Completed using browser automation (${normalizePortalBaseUrl(baseUrl)}).`,
      itemsProcessed: browserResult.itemsProcessed || order.items.length,
    };
  },

  async postGoodsReceived({
    invoice,
    baseUrl = normalizePortalBaseUrl(process.env.MOCK_PORTAL_URL),
    screenshotPath,
    headless = true,
  }) {
    const browserResult = await runBrowserPortalAutomation({
      executionType: "invoice-goods-received",
      supplier: invoice.supplier,
      items: invoice.items,
      baseUrl,
      screenshotPath,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      headless,
    });
    const startedAt = Date.now();
    const executionId = `invoice-run-${startedAt}-${Math.floor(Math.random() * 10000)}`;

    return {
      success: true,
      executionId,
      duration: Number(browserResult.duration || 0),
      screenshot: resolveBrowserScreenshot(
        browserResult,
        "invoice-goods-received",
      ),
      filledItems: buildProcessedItems(invoice.items).map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal:
          item.lineTotal ||
          Math.max(Number(item.quantity || 0), 0) *
            Math.max(Number(item.unitPrice || 0), 0),
      })),
      notes: `Completed using browser automation (${normalizePortalBaseUrl(baseUrl)}).`,
      itemsProcessed: browserResult.itemsProcessed || invoice.items.length,
    };
  },
};
