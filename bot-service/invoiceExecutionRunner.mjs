import fs from "fs";
import path from "path";
import { chromium } from "playwright";

function normalizeNumeric(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
}

function normalizeInvoicePayload(invoiceInput) {
  const supplier = String(invoiceInput?.supplier || "").trim();
  const invoiceNumber = String(invoiceInput?.invoiceNumber || "").trim();
  const invoiceDate = String(invoiceInput?.invoiceDate || "").trim();
  const items = Array.isArray(invoiceInput?.items)
    ? invoiceInput.items
        .map((item) => ({
          itemName: String(item?.itemName || item?.name || "").trim(),
          quantity: normalizeNumeric(item?.quantity),
          unitPrice: normalizeNumeric(item?.unitPrice),
          lineTotal: normalizeNumeric(item?.lineTotal),
        }))
        .filter((item) => item.itemName && item.quantity > 0)
    : [];

  if (!supplier) {
    throw new Error("Invoice payload must include supplier.");
  }

  if (items.length === 0) {
    throw new Error("Invoice payload must include at least one valid item.");
  }

  return {
    supplier,
    invoiceNumber,
    invoiceDate,
    items,
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

export async function runInvoiceIntakeExecution({
  invoice,
  baseUrl = process.env.MOCK_PORTAL_URL || "http://localhost:4177",
  screenshotPath,
  headless = true,
}) {
  const normalizedInvoice = normalizeInvoicePayload(invoice);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();
  const startedAt = Date.now();
  const runExecutionId = `invoice-run-${startedAt}-${Math.floor(
    Math.random() * 10000
  )}`;
  const filledItems = [];

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await ensureLoggedIn(page);
    await navigateToGoodsReceivedMode(page);
    await fillInvoiceHeader(
      page,
      normalizedInvoice.invoiceNumber,
      normalizedInvoice.invoiceDate
    );

    for (let index = 0; index < normalizedInvoice.items.length; index += 1) {
      const item = normalizedInvoice.items[index];
      await fillInvoiceItem(
        page,
        item.itemName,
        item.quantity,
        item.unitPrice || 0
      );
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
      executionId: runExecutionId,
      duration: Date.now() - startedAt,
      screenshot: path.resolve(screenshotPath),
      filledItems,
      notes:
        "Goods received completed: invoice items posted and invoice review saved.",
    };
  } catch (error) {
    return {
      success: false,
      executionId: runExecutionId,
      duration: Date.now() - startedAt,
      screenshot: "",
      filledItems,
      notes: error?.message || "Goods received execution failed.",
    };
  } finally {
    await browser.close();
  }
}
