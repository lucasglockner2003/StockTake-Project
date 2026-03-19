import fs from "fs";
import path from "path";
import { chromium } from "playwright";

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

async function navigateToGoodsReceivedMode(page) {
  await page.click("#open-goods-received-button");
  await page.waitForSelector("#goods-received-page:not(.hidden)");
}

async function fillInvoiceHeader(page, invoiceNumber, invoiceDate) {
  await page.fill("#goods-received-invoice-number", invoiceNumber || "");
  await page.fill("#goods-received-invoice-date", invoiceDate || "");
}

async function fillInvoiceItem(page, itemName, quantity, unitPrice = 0) {
  await page.fill("#goods-received-search-input", "");
  await page.fill("#goods-received-search-input", itemName);

  const results = page.locator("#goods-received-results li");
  await results.first().waitFor({ state: "visible", timeout: 5000 });

  const targetResult = page
    .locator("#goods-received-results li")
    .filter({ hasText: itemName })
    .first();

  if ((await targetResult.count()) === 0) {
    throw new Error(`Invoice item not found in goods received search: ${itemName}`);
  }

  await targetResult.click();
  await page.fill("#goods-received-quantity-input", String(quantity));
  await page.fill("#goods-received-unit-price-input", String(unitPrice || 0));
  await page.click("#goods-received-add-item-button");
}

async function finalizeGoodsReceived(page) {
  await page.click("#goods-received-review-button");
  await page.waitForSelector("#goods-received-review-page:not(.hidden)");
  await page.click("#goods-received-save-button");
  await page.waitForSelector("#goods-received-save-state:not(.hidden)");
}

export const mockPortalAdapter = {
  async fillDailyOrderToReview({
    order,
    baseUrl = process.env.MOCK_PORTAL_URL || "http://localhost:4177",
    screenshotPath,
    headless = true,
  }) {
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

    const browser = await chromium.launch({ headless });
    const page = await browser.newPage();
    const executionStartedAt = new Date().toISOString();
    const startedAtMs = Date.now();

    try {
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await ensureLoggedIn(page);

      for (let index = 0; index < order.items.length; index += 1) {
        const item = order.items[index];
        await addOrderItem(page, item.itemName, item.quantity);
      }

      await page.click("#go-review-button");
      await page.waitForSelector("#review-page:not(.hidden)");
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const now = new Date().toISOString();
      return {
        ok: true,
        status: "ready-for-chef-review",
        supplier: order.supplier,
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
        supplier: order.supplier,
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
  },

  async submitDailyOrder({
    order,
    baseUrl = process.env.MOCK_PORTAL_URL || "http://localhost:4177",
    finalScreenshotPath,
    headless = true,
  }) {
    fs.mkdirSync(path.dirname(finalScreenshotPath), { recursive: true });

    const browser = await chromium.launch({ headless });
    const page = await browser.newPage();
    const submitStartedAt = new Date().toISOString();
    const startedAtMs = Date.now();

    try {
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await ensureLoggedIn(page);

      for (let index = 0; index < order.items.length; index += 1) {
        const item = order.items[index];
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
        supplier: order.supplier,
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
        supplier: order.supplier,
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
  },

  async postGoodsReceived({
    invoice,
    baseUrl = process.env.MOCK_PORTAL_URL || "http://localhost:4177",
    screenshotPath,
    headless = true,
  }) {
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

    const browser = await chromium.launch({ headless });
    const page = await browser.newPage();
    const startedAt = Date.now();
    const executionId = `invoice-run-${startedAt}-${Math.floor(Math.random() * 10000)}`;
    const filledItems = [];

    try {
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await ensureLoggedIn(page);
      await navigateToGoodsReceivedMode(page);
      await fillInvoiceHeader(page, invoice.invoiceNumber, invoice.invoiceDate);

      for (let index = 0; index < invoice.items.length; index += 1) {
        const item = invoice.items[index];
        await fillInvoiceItem(page, item.itemName, item.quantity, item.unitPrice || 0);
        filledItems.push({
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
        });
      }

      await finalizeGoodsReceived(page);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      return {
        success: true,
        executionId,
        duration: Date.now() - startedAt,
        screenshot: path.resolve(screenshotPath),
        filledItems,
        notes:
          "Goods received completed: invoice items posted and invoice review saved.",
      };
    } catch (error) {
      return {
        success: false,
        executionId,
        duration: Date.now() - startedAt,
        screenshot: "",
        filledItems,
        notes: error?.message || "Goods received execution failed.",
      };
    } finally {
      await browser.close();
    }
  },
};
