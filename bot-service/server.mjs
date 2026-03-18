import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { runDailyOrderBot } from "../bot-poc/dailyOrderBotRunner.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.BOT_SERVICE_PORT || 4190);
const BOT_BASE_URL = process.env.MOCK_PORTAL_URL || "http://localhost:4177";
const artifactsDir = path.resolve(__dirname, "../bot-poc/output");

let isExecuting = false;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
}

function normalizeOrderInput(body) {
  const supplier = String(body?.supplier || "").trim();
  const items = Array.isArray(body?.items)
    ? body.items
        .map((item) => ({
          itemName: String(item?.itemName || item?.name || "").trim(),
          quantity: normalizeQuantity(item?.quantity),
          unit: String(item?.unit || "").trim(),
        }))
        .filter((item) => item.itemName && item.quantity > 0)
    : [];

  if (!supplier) {
    return {
      ok: false,
      message: "Supplier is required.",
    };
  }

  if (items.length === 0) {
    return {
      ok: false,
      message: "At least one valid item with quantity > 0 is required.",
    };
  }

  return {
    ok: true,
    order: {
      supplier,
      items,
    },
  };
}

ensureDir(artifactsDir);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/artifacts", express.static(artifactsDir));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "daily-order-bot-service",
    running: isExecuting,
    port: PORT,
    mockPortalUrl: BOT_BASE_URL,
  });
});

app.post("/execute-daily-order", async (req, res) => {
  if (isExecuting) {
    return res.status(409).json({
      ok: false,
      status: "failed",
      executionNotes: "Another daily order execution is in progress.",
    });
  }

  const normalized = normalizeOrderInput(req.body);
  if (!normalized.ok) {
    return res.status(400).json({
      ok: false,
      status: "failed",
      executionNotes: normalized.message,
    });
  }

  isExecuting = true;
  const screenshotFileName = `review-${Date.now()}-${Math.floor(
    Math.random() * 10000
  )}.png`;
  const screenshotPath = path.join(artifactsDir, screenshotFileName);

  try {
    const result = await runDailyOrderBot({
      order: normalized.order,
      baseUrl: BOT_BASE_URL,
      screenshotPath,
      headless: true,
    });

    return res.status(result.ok ? 200 : 500).json({
      ok: result.ok,
      status: result.status,
      supplier: result.supplier,
      screenshotPath: result.ok ? `/artifacts/${screenshotFileName}` : "",
      reviewScreenshot: result.ok ? `/artifacts/${screenshotFileName}` : "",
      executionDuration: result.executionDuration,
      executionStartedAt: result.executionStartedAt,
      executionFinishedAt: result.executionFinishedAt,
      filledAt: result.filledAt,
      readyForReviewAt: result.readyForReviewAt,
      executionNotes: result.executionNotes,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      status: "failed",
      screenshotPath: "",
      reviewScreenshot: "",
      executionDuration: 0,
      executionStartedAt: new Date().toISOString(),
      executionFinishedAt: new Date().toISOString(),
      filledAt: null,
      readyForReviewAt: null,
      executionNotes: error?.message || "Unexpected bot service error.",
    });
  } finally {
    isExecuting = false;
  }
});

app.listen(PORT, () => {
  console.log(`Bot service running on http://localhost:${PORT}`);
});
