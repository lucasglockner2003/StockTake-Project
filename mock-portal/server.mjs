import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.join(__dirname, "public");

const app = express();
const PORT = process.env.MOCK_PORT || 4177;

function normalizeDelay() {
  const minimumDelayMs = 500;
  const maximumDelayMs = 1000;
  return (
    minimumDelayMs + Math.floor(Math.random() * (maximumDelayMs - minimumDelayMs + 1))
  );
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      itemName: String(item?.itemName || item?.name || "").trim(),
      quantity: Math.max(Number(item?.quantity || 0), 0),
      unit: String(item?.unit || "").trim(),
    }))
    .filter((item) => item.itemName && item.quantity > 0);
}

app.use("/public", express.static(publicDirectory));
app.use(express.static(__dirname));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mock-supplier-portal",
    port: PORT,
  });
});

app.post("/execute", async (req, res) => {
  const supplier = String(req.body?.supplier || "").trim();
  const items = normalizeItems(req.body?.items);

  if (!supplier) {
    return res.status(400).json({
      success: false,
      errorCode: "INVALID_SUPPLIER",
      message: "Supplier is required.",
    });
  }

  if (items.length === 0) {
    return res.status(400).json({
      success: false,
      errorCode: "INVALID_ITEMS",
      message: "At least one valid item is required.",
    });
  }

  const delayMs = normalizeDelay();
  console.log(
    `[mock-portal] Processing supplier=${supplier} items=${items.length} delayMs=${delayMs}`
  );
  await wait(delayMs);

  return res.json({
    success: true,
    supplier,
    processedItems: items,
    screenshot: "",
  });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Mock supplier portal running on http://localhost:${PORT}`);
});
