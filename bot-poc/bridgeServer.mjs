import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { runDailyOrderBot } from "./dailyOrderBotRunner.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.BOT_BRIDGE_PORT || 4188);
const BOT_BASE_URL = process.env.MOCK_PORTAL_URL || "http://localhost:4177";
const outputDir = path.join(__dirname, "output");

let isRunningFill = false;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
}

function normalizeOrderInput(order) {
  const supplier = String(order?.supplier || "").trim();
  const items = Array.isArray(order?.items)
    ? order.items
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
      message: "Order supplier is required.",
    };
  }

  if (items.length === 0) {
    return {
      ok: false,
      message: "Order must include at least one valid item with quantity > 0.",
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

ensureDir(outputDir);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/artifacts", express.static(outputDir));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "daily-order-bot-bridge",
    port: PORT,
    running: isRunningFill,
    baseUrl: BOT_BASE_URL,
  });
});

app.post("/api/daily-orders/run-fill", async (req, res) => {
  if (isRunningFill) {
    return res.status(409).json({
      ok: false,
      status: "failed",
      message: "Another daily order fill is already running.",
    });
  }

  const normalized = normalizeOrderInput(req.body?.order);
  if (!normalized.ok) {
    return res.status(400).json({
      ok: false,
      status: "failed",
      message: normalized.message,
    });
  }

  isRunningFill = true;
  const screenshotFileName = `review-${Date.now()}-${Math.floor(
    Math.random() * 10000
  )}.png`;
  const screenshotPath = path.join(outputDir, screenshotFileName);

  try {
    const runResult = await runDailyOrderBot({
      order: normalized.order,
      baseUrl: BOT_BASE_URL,
      screenshotPath,
      headless: true,
    });

    if (!runResult?.ok) {
      return res.status(500).json({
        ok: false,
        status: "failed",
        reviewScreenshot: "",
        filledAt: null,
        readyForReviewAt: null,
        executionNotes:
          runResult?.executionNotes || "Bot bridge failed to run the fill.",
      });
    }

    return res.json({
      ...runResult,
      reviewScreenshot: `/artifacts/${screenshotFileName}`,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      status: "failed",
      reviewScreenshot: "",
      filledAt: null,
      readyForReviewAt: null,
      executionNotes: error?.message || "Unexpected bridge error.",
    });
  } finally {
    isRunningFill = false;
  }
});

app.listen(PORT, () => {
  console.log(`Daily order bot bridge running on http://localhost:${PORT}`);
});
