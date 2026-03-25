import fs from "fs";
import path from "path";
import axios from "axios";

const DEFAULT_MOCK_PORTAL_URL = "http://localhost:4177";
const INTERNAL_EXECUTION_TARGET = "internal-simulation";
const MOCK_PORTAL_TIMEOUT_MS = 10000;
const SIMULATED_PROCESSING_DELAY_MS = Math.max(
  Number(process.env.BOT_SIMULATION_DELAY_MS || 150),
  0
);
const PLACEHOLDER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
  return String(value || DEFAULT_MOCK_PORTAL_URL).trim().replace(/\/+$/, "");
}

function ensureArtifactDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writePlaceholderScreenshot(filePath) {
  ensureArtifactDirectory(filePath);
  fs.writeFileSync(filePath, Buffer.from(PLACEHOLDER_PNG_BASE64, "base64"));
  return path.resolve(filePath);
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

async function simulateProcessing(itemCount) {
  const delayMs = SIMULATED_PROCESSING_DELAY_MS + Math.max(itemCount - 1, 0) * 25;
  await wait(delayMs);
}

async function executeThroughMockPortal({
  supplier,
  items,
  baseUrl,
  executionType,
}) {
  const normalizedBaseUrl = normalizePortalBaseUrl(baseUrl);
  const endpointUrl = `${normalizedBaseUrl}/execute`;
  const payload = {
    supplier,
    items: buildProcessedItems(items),
  };

  logInfo(`Using mock portal for ${executionType}: ${endpointUrl}`, payload);

  const response = await axios.post(endpointUrl, payload, {
    timeout: MOCK_PORTAL_TIMEOUT_MS,
    headers: {
      "Content-Type": "application/json",
    },
  });

  logInfo(`Mock portal response for ${executionType}: ${endpointUrl}`, response.data);

  return response.data;
}

function logFallbackActivation(executionType, baseUrl, error) {
  const message =
    error instanceof Error ? error.message : "Unknown error while calling mock portal.";
  const stack = error instanceof Error ? error.stack : undefined;

  logWarn(
    `Fallback activated for ${executionType}. Mock portal unavailable at ${normalizePortalBaseUrl(baseUrl)}.`,
    {
      message,
      stack,
    }
  );
}

async function simulateDailyOrderFill({ order, screenshotPath, baseUrl }) {
  const executionStartedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const processedItems = buildProcessedItems(order.items);
  await simulateProcessing(processedItems.length);
  const reviewScreenshot = writePlaceholderScreenshot(screenshotPath);
  const now = new Date().toISOString();

  return {
    ok: true,
    status: "ready-for-chef-review",
    supplier: order.supplier,
    reviewScreenshot,
    executionStartedAt,
    filledAt: now,
    readyForReviewAt: now,
    executionFinishedAt: now,
    executionDuration: Date.now() - startedAtMs,
    executionNotes: `Local simulated fill completed without external portal (${baseUrl || INTERNAL_EXECUTION_TARGET}).`,
    itemsProcessed: processedItems.length,
  };
}

async function simulateDailyOrderSubmit({ order, finalScreenshotPath, baseUrl }) {
  const submitStartedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const processedItems = buildProcessedItems(order.items);
  await simulateProcessing(processedItems.length);
  const finalScreenshot = writePlaceholderScreenshot(finalScreenshotPath);
  const submittedAt = new Date().toISOString();

  return {
    ok: true,
    status: "executed",
    supplier: order.supplier,
    orderNumber: generateMockOrderNumber(),
    submittedAt,
    submitStartedAt,
    submitFinishedAt: submittedAt,
    submitDuration: Date.now() - startedAtMs,
    finalScreenshot,
    finalExecutionNotes: `Local simulated final submit completed without external portal (${baseUrl || INTERNAL_EXECUTION_TARGET}).`,
    itemsProcessed: processedItems.length,
  };
}

async function simulateGoodsReceived({ invoice, screenshotPath, baseUrl }) {
  const startedAt = Date.now();
  const executionId = `invoice-run-${startedAt}-${Math.floor(Math.random() * 10000)}`;
  const filledItems = buildProcessedItems(invoice.items).map((item) => ({
    itemName: item.itemName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal:
      item.lineTotal ||
      Math.max(Number(item.quantity || 0), 0) * Math.max(Number(item.unitPrice || 0), 0),
  }));

  await simulateProcessing(filledItems.length);
  const screenshot = writePlaceholderScreenshot(screenshotPath);

  return {
    success: true,
    executionId,
    duration: Date.now() - startedAt,
    screenshot,
    filledItems,
    notes: `Local simulated goods received completed without external portal (${baseUrl || INTERNAL_EXECUTION_TARGET}).`,
    itemsProcessed: filledItems.length,
  };
}

export const mockPortalAdapter = {
  async fillDailyOrderToReview({
    order,
    baseUrl = DEFAULT_MOCK_PORTAL_URL,
    screenshotPath,
  }) {
    try {
      const mockPortalResult = await executeThroughMockPortal({
        supplier: order.supplier,
        items: order.items,
        baseUrl,
        executionType: "fill-daily-order",
      });
      const executionStartedAt = new Date().toISOString();
      const finishedAt = new Date().toISOString();
      const reviewScreenshot = writePlaceholderScreenshot(screenshotPath);
      const processedItems = Array.isArray(mockPortalResult?.processedItems)
        ? mockPortalResult.processedItems
        : buildProcessedItems(order.items);

      return {
        ok: true,
        status: "ready-for-chef-review",
        supplier: order.supplier,
        reviewScreenshot,
        executionStartedAt,
        filledAt: finishedAt,
        readyForReviewAt: finishedAt,
        executionFinishedAt: finishedAt,
        executionDuration: 0,
        executionNotes: `Completed using mock portal (${normalizePortalBaseUrl(baseUrl)}).`,
        itemsProcessed: processedItems.length,
      };
    } catch (error) {
      logFallbackActivation("fill-daily-order", baseUrl, error);
      return simulateDailyOrderFill({
        order,
        screenshotPath,
        baseUrl: INTERNAL_EXECUTION_TARGET,
      });
    }
  },

  async submitDailyOrder({
    order,
    baseUrl = DEFAULT_MOCK_PORTAL_URL,
    finalScreenshotPath,
  }) {
    try {
      const mockPortalResult = await executeThroughMockPortal({
        supplier: order.supplier,
        items: order.items,
        baseUrl,
        executionType: "submit-daily-order",
      });
      const submitStartedAt = new Date().toISOString();
      const submittedAt = new Date().toISOString();
      const finalScreenshot = writePlaceholderScreenshot(finalScreenshotPath);
      const processedItems = Array.isArray(mockPortalResult?.processedItems)
        ? mockPortalResult.processedItems
        : buildProcessedItems(order.items);

      return {
        ok: true,
        status: "executed",
        supplier: order.supplier,
        orderNumber: generateMockOrderNumber(),
        submittedAt,
        submitStartedAt,
        submitFinishedAt: submittedAt,
        submitDuration: 0,
        finalScreenshot,
        finalExecutionNotes: `Completed using mock portal (${normalizePortalBaseUrl(baseUrl)}).`,
        itemsProcessed: processedItems.length,
      };
    } catch (error) {
      logFallbackActivation("submit-daily-order", baseUrl, error);
      return simulateDailyOrderSubmit({
        order,
        finalScreenshotPath,
        baseUrl: INTERNAL_EXECUTION_TARGET,
      });
    }
  },

  async postGoodsReceived({
    invoice,
    baseUrl = DEFAULT_MOCK_PORTAL_URL,
    screenshotPath,
  }) {
    try {
      const mockPortalResult = await executeThroughMockPortal({
        supplier: invoice.supplier,
        items: invoice.items,
        baseUrl,
        executionType: "invoice-goods-received",
      });
      const startedAt = Date.now();
      const executionId = `invoice-run-${startedAt}-${Math.floor(Math.random() * 10000)}`;
      const filledItems = Array.isArray(mockPortalResult?.processedItems)
        ? mockPortalResult.processedItems.map((item) => ({
            itemName: String(item?.itemName || item?.name || "").trim(),
            quantity: Number(item?.quantity || 0),
            unitPrice: Number(item?.unitPrice || 0),
            lineTotal:
              Number(item?.lineTotal || 0) ||
              Math.max(Number(item?.quantity || 0), 0) *
                Math.max(Number(item?.unitPrice || 0), 0),
          }))
        : [];
      const screenshot = writePlaceholderScreenshot(screenshotPath);

      return {
        success: true,
        executionId,
        duration: 0,
        screenshot,
        filledItems,
        notes: `Completed using mock portal (${normalizePortalBaseUrl(baseUrl)}).`,
        itemsProcessed: filledItems.length,
      };
    } catch (error) {
      logFallbackActivation("invoice-goods-received", baseUrl, error);
      return simulateGoodsReceived({
        invoice,
        screenshotPath,
        baseUrl: INTERNAL_EXECUTION_TARGET,
      });
    }
  },
};
