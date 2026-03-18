import path from "path";
import { chromium } from "playwright";
import { normalizeOrderPayload } from "../bot-poc/dailyOrderBotRunner.mjs";

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

function generateMockOrderNumber() {
  const timestampChunk = String(Date.now()).slice(-8);
  const randomChunk = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `MOCK-${timestampChunk}-${randomChunk}`;
}

export async function runDailyOrderFinalSubmit({
  order,
  baseUrl = process.env.MOCK_PORTAL_URL || "http://localhost:4177",
  finalScreenshotPath,
  headless = true,
}) {
  const normalizedOrder = normalizeOrderPayload(order);
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();
  const submitStartedAt = new Date().toISOString();
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

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.click("#submit-placeholder-button");
    await page.waitForTimeout(250);
    await page.screenshot({ path: finalScreenshotPath, fullPage: true });

    const submittedAt = new Date().toISOString();
    const submitDuration = Date.now() - startedAtMs;
    const orderNumber = generateMockOrderNumber();

    return {
      ok: true,
      status: "executed",
      supplier: normalizedOrder.supplier,
      orderNumber,
      submittedAt,
      submitStartedAt,
      submitFinishedAt: submittedAt,
      submitDuration,
      finalScreenshot: path.resolve(finalScreenshotPath),
      finalExecutionNotes:
        "Chef approved final submit executed on mock portal successfully.",
    };
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
      submitDuration: Date.now() - startedAtMs,
      finalScreenshot: "",
      finalExecutionNotes: error?.message || "Final submit failed on mock portal.",
    };
  } finally {
    await browser.close();
  }
}
