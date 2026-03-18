import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

function parseArgs(argv) {
  const options = {
    orderPath: "",
    baseUrl: process.env.MOCK_PORTAL_URL || "http://localhost:4177",
    screenshotPath: "",
    headless: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--order") {
      options.orderPath = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (arg === "--base-url") {
      options.baseUrl = argv[index + 1] || options.baseUrl;
      index += 1;
      continue;
    }

    if (arg === "--screenshot") {
      options.screenshotPath = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (arg === "--headful") {
      options.headless = false;
    }
  }

  return options;
}

function getDefaultScreenshotPath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  return path.join(
    __dirname,
    "output",
    `review-${new Date().toISOString().replace(/[:.]/g, "-")}.png`
  );
}

function readOrderFromFile(orderPath) {
  if (!orderPath) {
    throw new Error("Missing --order argument.");
  }

  const raw = fs.readFileSync(orderPath, "utf-8");
  const parsed = JSON.parse(raw);

  const supplier = String(parsed.supplier || "").trim();
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  if (!supplier) {
    throw new Error("Order JSON must include supplier.");
  }

  if (items.length === 0) {
    throw new Error("Order JSON must include at least one item.");
  }

  return {
    supplier,
    items: items.map((item) => ({
      itemName: String(item.itemName || item.name || "").trim(),
      quantity: Number(item.quantity || 0),
      unit: String(item.unit || "").trim(),
    })),
  };
}

async function ensureLoggedIn(page) {
  const username = process.env.MOCK_PORTAL_USER || "chef";
  const password = process.env.MOCK_PORTAL_PASS || "smartops";

  await page.fill("#username-input", username);
  await page.fill("#password-input", password);
  await page.click("#login-button");
  await page.waitForSelector("#order-page:not(.hidden)");
}

async function addOrderItem(page, itemName, quantity) {
  await page.fill("#item-search-input", "");
  await page.fill("#item-search-input", itemName);

  const results = page.locator("#item-search-results li");
  await results.first().waitFor({ state: "visible", timeout: 5000 });

  const exactResult = page
    .locator("#item-search-results li")
    .filter({ hasText: itemName })
    .first();

  const exactCount = await exactResult.count();
  if (exactCount === 0) {
    throw new Error(`Item not found in portal search: ${itemName}`);
  }

  await exactResult.click();
  await page.fill("#quantity-input", String(quantity));
  await page.click("#add-item-button");
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const order = readOrderFromFile(options.orderPath);
  const screenshotPath = options.screenshotPath || getDefaultScreenshotPath();

  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

  const browser = await chromium.launch({ headless: options.headless });
  const page = await browser.newPage();

  const executionStartedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  try {
    await page.goto(options.baseUrl, { waitUntil: "domcontentloaded" });
    await ensureLoggedIn(page);

    for (let index = 0; index < order.items.length; index += 1) {
      const item = order.items[index];
      if (!item.itemName || !(item.quantity > 0)) continue;

      await addOrderItem(page, item.itemName, item.quantity);
    }

    await page.click("#go-review-button");
    await page.waitForSelector("#review-page:not(.hidden)");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const now = new Date().toISOString();
    const duration = Date.now() - startedAtMs;

    const result = {
      ok: true,
      status: "ready-for-chef-review",
      supplier: order.supplier,
      reviewScreenshot: path.resolve(screenshotPath),
      executionStartedAt,
      filledAt: now,
      readyForReviewAt: now,
      executionFinishedAt: now,
      executionDuration: duration,
      executionNotes:
        "Mock bot logged in, filled items, stopped at review, and saved screenshot.",
    };

    console.log(JSON.stringify(result, null, 2));
    await browser.close();
    return;
  } catch (error) {
    const failedAt = new Date().toISOString();

    const result = {
      ok: false,
      status: "failed",
      supplier: order.supplier,
      reviewScreenshot: "",
      executionStartedAt,
      filledAt: null,
      readyForReviewAt: null,
      executionFinishedAt: failedAt,
      executionDuration: Date.now() - startedAtMs,
      executionNotes: error?.message || "Mock bot execution failed.",
    };

    console.error(JSON.stringify(result, null, 2));
    await browser.close();
    process.exitCode = 1;
  }
}

run();
