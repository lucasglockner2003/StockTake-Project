import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

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

export async function runDailyOrderBot({
  order,
  baseUrl = process.env.MOCK_PORTAL_URL || "http://localhost:4177",
  screenshotPath = getDefaultScreenshotPath(),
  headless = true,
}) {
  const normalizedOrder = normalizeOrderPayload(order);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();
  const executionStartedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await ensureLoggedIn(page);

    for (let index = 0; index < normalizedOrder.items.length; index += 1) {
      const item = normalizedOrder.items[index];
      await addOrderItem(page, item.itemName, item.quantity);
    }

    await page.click("#go-review-button");
    await page.waitForSelector("#review-page:not(.hidden)");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const now = new Date().toISOString();
    return {
      ok: true,
      status: "ready-for-chef-review",
      supplier: normalizedOrder.supplier,
      reviewScreenshot: path.resolve(screenshotPath),
      executionStartedAt,
      filledAt: now,
      readyForReviewAt: now,
      executionFinishedAt: now,
      executionDuration: Date.now() - startedAtMs,
      executionNotes:
        "Mock bot logged in, filled items, stopped at review, and saved screenshot.",
    };
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
  } finally {
    await browser.close();
  }
}
