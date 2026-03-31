import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { resolveMockPortalBaseUrl } from "./config.mjs";

const BROWSER_AUTOMATION_TIMEOUT_MS = 15000;

function logStep(message, details) {
  if (details === undefined) {
    console.log(`[browserRunner] ${message}`);
    return;
  }

  console.log(`[browserRunner] ${message}`, details);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeNumber(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(numeric, 0);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function buildSearchTerms(itemName) {
  const normalizedName = normalizeText(itemName);
  const terms = new Set();

  if (!normalizedName) {
    return [];
  }

  terms.add(normalizedName);

  if (normalizedName.endsWith("ies") && normalizedName.length > 3) {
    terms.add(`${normalizedName.slice(0, -3)}y`);
  }

  if (normalizedName.endsWith("es") && normalizedName.length > 2) {
    terms.add(normalizedName.slice(0, -2));
  }

  if (normalizedName.endsWith("s") && normalizedName.length > 1) {
    terms.add(normalizedName.slice(0, -1));
  }

  normalizedName
    .split(/\s+/)
    .filter(Boolean)
    .forEach((term) => {
      terms.add(term);
    });

  return Array.from(terms).filter(Boolean);
}

async function withTimeout(task) {
  let timeoutId = null;

  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              `Portal automation timed out after ${BROWSER_AUTOMATION_TIMEOUT_MS}ms.`,
            ),
          );
        }, BROWSER_AUTOMATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function clearAndType(page, selector, value) {
  const text = String(value ?? "");

  await page.waitForSelector(selector, {
    visible: true,
    timeout: BROWSER_AUTOMATION_TIMEOUT_MS,
  });
  await page.$eval(selector, (input) => {
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  if (text) {
    await page.type(selector, text);
  }
}

async function waitForSection(page, selector) {
  await page.waitForFunction(
    (sectionSelector) => {
      const element = document.querySelector(sectionSelector);
      return Boolean(element) && !element.classList.contains("hidden");
    },
    {
      timeout: BROWSER_AUTOMATION_TIMEOUT_MS,
    },
    selector,
  );
}

async function clickSelector(page, selector) {
  await page.waitForSelector(selector, {
    visible: true,
    timeout: BROWSER_AUTOMATION_TIMEOUT_MS,
  });
  await page.click(selector);
}

async function searchAndSelectItem(page, options) {
  const { inputSelector, resultsSelector, itemName } = options;
  const searchTerms = buildSearchTerms(itemName);

  for (const searchTerm of searchTerms) {
    await clearAndType(page, inputSelector, searchTerm);
    await wait(100);

    const hasResults = await page.$$eval(
      `${resultsSelector} li`,
      (items) => items.length > 0,
    );

    if (!hasResults) {
      continue;
    }

    logStep(`Selecting portal item for "${itemName}" using term "${searchTerm}"`);
    await page.click(`${resultsSelector} li:first-child`);
    return;
  }

  throw new Error(`No matching mock portal item found for "${itemName}".`);
}

async function performLogin(page) {
  logStep("Opening login page");
  await page.waitForSelector("#login-page", {
    visible: true,
    timeout: BROWSER_AUTOMATION_TIMEOUT_MS,
  });

  logStep("Typing portal credentials");
  await clearAndType(page, "#username-input", "chef");
  await clearAndType(page, "#password-input", "smartops");

  logStep("Submitting login");
  await clickSelector(page, "#login-button");
  await waitForSection(page, "#order-page");
}

async function fillOrderItems(page, items) {
  for (const item of items) {
    logStep("Adding order item", {
      itemName: item.itemName,
      quantity: item.quantity,
    });
    await searchAndSelectItem(page, {
      inputSelector: "#item-search-input",
      resultsSelector: "#item-search-results",
      itemName: item.itemName,
    });
    await clearAndType(page, "#quantity-input", String(normalizeNumber(item.quantity)));
    await clickSelector(page, "#add-item-button");
    await wait(100);
  }
}

async function fillGoodsReceivedItems(page, items) {
  for (const item of items) {
    logStep("Adding goods received item", {
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    });
    await searchAndSelectItem(page, {
      inputSelector: "#goods-received-search-input",
      resultsSelector: "#goods-received-results",
      itemName: item.itemName,
    });
    await clearAndType(
      page,
      "#goods-received-quantity-input",
      String(normalizeNumber(item.quantity)),
    );
    await clearAndType(
      page,
      "#goods-received-unit-price-input",
      String(normalizeNumber(item.unitPrice)),
    );
    await clickSelector(page, "#goods-received-add-item-button");
    await wait(100);
  }
}

async function runInvoiceGoodsReceivedFlow(page, options) {
  const { invoiceNumber, invoiceDate, items } = options;

  logStep("Opening goods received flow");
  await clickSelector(page, "#open-goods-received-button");
  await waitForSection(page, "#goods-received-page");

  await clearAndType(page, "#goods-received-invoice-number", invoiceNumber);
  await clearAndType(page, "#goods-received-invoice-date", invoiceDate);
  await fillGoodsReceivedItems(page, items);

  logStep("Reviewing goods received");
  await clickSelector(page, "#goods-received-review-button");
  await waitForSection(page, "#goods-received-review-page");

  logStep("Saving goods received");
  await clickSelector(page, "#goods-received-save-button");
  await page.waitForSelector("#goods-received-save-state:not(.hidden)", {
    visible: true,
    timeout: BROWSER_AUTOMATION_TIMEOUT_MS,
  });
}

async function runDailyOrderReviewFlow(page, items) {
  await fillOrderItems(page, items);

  logStep("Opening review page");
  await clickSelector(page, "#go-review-button");
  await waitForSection(page, "#review-page");
}

async function runDailyOrderSubmitFlow(page, items) {
  await runDailyOrderReviewFlow(page, items);

  page.on("dialog", async (dialog) => {
    logStep("Accepting portal dialog", {
      message: dialog.message(),
    });
    await dialog.accept();
  });

  logStep("Triggering submit placeholder");
  await clickSelector(page, "#submit-placeholder-button");
  await wait(200);
}

function toPublicArtifactPath(filePath) {
  return filePath ? `/artifacts/${path.basename(filePath)}` : "";
}

async function runPortalSequence(page, options) {
  const {
    portalBaseUrl,
    executionType,
    supplier,
    invoiceNumber,
    invoiceDate,
    items,
    screenshotPath,
  } = options;

  logStep("Navigating to portal", {
    executionType,
    supplier,
    portalBaseUrl,
  });
  await page.goto(portalBaseUrl, {
    waitUntil: "networkidle2",
    timeout: BROWSER_AUTOMATION_TIMEOUT_MS,
  });

  await performLogin(page);

  if (executionType === "invoice-goods-received") {
    await runInvoiceGoodsReceivedFlow(page, {
      invoiceNumber,
      invoiceDate,
      items,
    });
  } else if (executionType === "fill-daily-order") {
    await runDailyOrderReviewFlow(page, items);
  } else if (executionType === "submit-daily-order") {
    await runDailyOrderSubmitFlow(page, items);
  } else {
    throw new Error(`Unsupported browser automation execution type: ${executionType}`);
  }

  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  logStep("Capturing screenshot", {
    screenshotPath,
  });
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  return {
    success: true,
    screenshotPath,
    screenshot: toPublicArtifactPath(screenshotPath),
    itemsProcessed: items.length,
  };
}

export async function runPortalAutomation({
  items,
  supplier,
  portalBaseUrl = resolveMockPortalBaseUrl(process.env.MOCK_PORTAL_URL),
  screenshotPath,
  invoiceNumber = "",
  invoiceDate = "",
  executionType = "invoice-goods-received",
  headless = true,
}) {
  const browser = await puppeteer.launch({
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  const startedAt = Date.now();

  try {
    page.setDefaultTimeout(BROWSER_AUTOMATION_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(BROWSER_AUTOMATION_TIMEOUT_MS);
    await page.setViewport({ width: 1440, height: 1200 });

    const result = await withTimeout(
      runPortalSequence(page, {
        portalBaseUrl,
        executionType,
        supplier,
        invoiceNumber,
        invoiceDate,
        items,
        screenshotPath,
      }),
    );

    return {
      ...result,
      duration: Date.now() - startedAt,
    };
  } catch (error) {
    logStep("Automation error", {
      executionType,
      supplier,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    logStep("Closing browser");
    await browser.close();
  }
}
