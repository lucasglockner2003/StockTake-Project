import { INVOICE_INTAKE_STATUSES, SOURCES } from "../constants/app";

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLines(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function toNumeric(value) {
  if (value === null || value === undefined) return 0;
  const normalized = String(value).replace(/[^0-9,.-]/g, "").replace(",", ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
}

function formatDateToken(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const isoLike = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoLike) {
    const [, year, month, day] = isoLike;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const dayFirst = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dayFirst) {
    const [, day, month, yearToken] = dayFirst;
    const year =
      yearToken.length === 2 ? `20${yearToken}` : yearToken.padStart(4, "0");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return raw;
}

function createInvoiceId() {
  return `inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function normalizeInvoiceItem(item = {}, index = 0) {
  const itemName = cleanText(item.itemName || item.name || "");
  const quantity = toNumeric(item.quantity);
  const unitPrice = toNumeric(item.unitPrice);
  const parsedLineTotal = toNumeric(item.lineTotal);
  const lineTotal = parsedLineTotal > 0 ? parsedLineTotal : quantity * unitPrice;

  return {
    id: item.id || `${index}-${Date.now()}`,
    itemName,
    quantity,
    unitPrice,
    lineTotal: Number(lineTotal.toFixed(2)),
  };
}

function parseInvoiceItemLine(line) {
  const normalizedLine = line.replace(/\s+/g, " ").trim();
  if (!normalizedLine) return null;

  const quantityPriceTotal = normalizedLine.match(
    /^(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)$/i
  );
  if (quantityPriceTotal) {
    return normalizeInvoiceItem({
      itemName: quantityPriceTotal[1],
      quantity: quantityPriceTotal[2],
      unitPrice: quantityPriceTotal[3],
      lineTotal: quantityPriceTotal[4],
    });
  }

  const quantityAndPrice = normalizedLine.match(
    /^(.+?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*[@]\s*(\d+(?:[.,]\d+)?)(?:\s*=\s*(\d+(?:[.,]\d+)?))?$/i
  );
  if (quantityAndPrice) {
    const quantity = toNumeric(quantityAndPrice[2]);
    const unitPrice = toNumeric(quantityAndPrice[3]);
    const lineTotal = quantityAndPrice[4]
      ? toNumeric(quantityAndPrice[4])
      : quantity * unitPrice;

    return normalizeInvoiceItem({
      itemName: quantityAndPrice[1],
      quantity,
      unitPrice,
      lineTotal,
    });
  }

  return null;
}

function parseInvoiceItemBlocks(lines = []) {
  const parsedItems = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const itemMatch = line.match(/^item\s*:\s*(.+)$/i);

    if (!itemMatch) {
      index += 1;
      continue;
    }

    const blockItem = {
      itemName: itemMatch[1],
      quantity: 0,
      unitPrice: 0,
      lineTotal: 0,
    };

    let cursor = index + 1;

    while (cursor < lines.length) {
      const nextLine = lines[cursor];

      if (/^item\s*:/i.test(nextLine)) break;

      const qtyMatch = nextLine.match(/^qty(?:uantity)?\s*:\s*(.+)$/i);
      if (qtyMatch?.[1]) {
        blockItem.quantity = toNumeric(qtyMatch[1]);
      }

      const unitPriceMatch = nextLine.match(/^unit\s*price\s*:\s*(.+)$/i);
      if (unitPriceMatch?.[1]) {
        blockItem.unitPrice = toNumeric(unitPriceMatch[1]);
      }

      const lineTotalMatch = nextLine.match(/^line\s*total\s*:\s*(.+)$/i);
      if (lineTotalMatch?.[1]) {
        blockItem.lineTotal = toNumeric(lineTotalMatch[1]);
      }

      cursor += 1;
    }

    parsedItems.push(normalizeInvoiceItem(blockItem, parsedItems.length));
    index = cursor;
  }

  return parsedItems;
}

function extractField(lines, patterns) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (let patternIndex = 0; patternIndex < patterns.length; patternIndex += 1) {
      const match = line.match(patterns[patternIndex]);
      if (match && match[1]) {
        return cleanText(match[1]);
      }
    }
  }

  return "";
}

function extractInvoiceDate(lines) {
  const labeledDate = extractField(lines, [
    /^invoice\s*date\s*[:#-]?\s*(.+)$/i,
    /^date\s*[:#-]?\s*(.+)$/i,
  ]);

  if (labeledDate) {
    return formatDateToken(labeledDate);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(
      /(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/
    );
    if (match && match[1]) {
      return formatDateToken(match[1]);
    }
  }

  return "";
}

export function calculateInvoiceTotal(items = []) {
  return Number(
    (items || [])
      .reduce((sum, item) => sum + toNumeric(item.lineTotal), 0)
      .toFixed(2)
  );
}

export function normalizeInvoiceDraft(draft = {}) {
  const normalizedItems = (draft.items || []).map((item, index) =>
    normalizeInvoiceItem(item, index)
  );

  return {
    id: draft.id || createInvoiceId(),
    supplier: cleanText(draft.supplier),
    invoiceNumber: cleanText(draft.invoiceNumber),
    invoiceDate: formatDateToken(draft.invoiceDate),
    items: normalizedItems,
    totalAmount: calculateInvoiceTotal(normalizedItems),
    status: draft.status || INVOICE_INTAKE_STATUSES.DRAFT,
    attempts: Number(draft.attempts || 0),
    createdAt: draft.createdAt || new Date().toISOString(),
    updatedAt: draft.updatedAt || new Date().toISOString(),
    executionMetadata: {
      ...(draft.executionMetadata || {}),
      lastQueuedAt: draft.executionMetadata?.lastQueuedAt || "",
      executionId:
        draft.executionMetadata?.executionId ||
        draft.executionMetadata?.lastExecutionId ||
        "",
      lastExecutionId:
        draft.executionMetadata?.lastExecutionId ||
        draft.executionMetadata?.executionId ||
        "",
      screenshot: draft.executionMetadata?.screenshot || "",
      duration: Number(draft.executionMetadata?.duration || 0),
      filledItems: Array.isArray(draft.executionMetadata?.filledItems)
        ? draft.executionMetadata.filledItems
        : [],
      lastErrorCode: draft.executionMetadata?.lastErrorCode || "",
      lastErrorMessage: draft.executionMetadata?.lastErrorMessage || "",
      notes: draft.executionMetadata?.notes || "",
      finishedAt: draft.executionMetadata?.finishedAt || "",
      lastPayload: draft.executionMetadata?.lastPayload || null,
    },
  };
}

export function buildInvoiceDraft(initialData = {}) {
  return normalizeInvoiceDraft({
    ...initialData,
    status: initialData.status || INVOICE_INTAKE_STATUSES.DRAFT,
    items:
      initialData.items && initialData.items.length > 0
        ? initialData.items
        : [{ itemName: "", quantity: 0, unitPrice: 0, lineTotal: 0 }],
  });
}

export function parseInvoiceTextToDraft(text, baseDraft = {}) {
  const lines = cleanLines(text);

  const supplier =
    extractField(lines, [
      /^supplier\s*[:#-]?\s*(.+)$/i,
      /^vendor\s*[:#-]?\s*(.+)$/i,
      /^from\s*[:#-]?\s*(.+)$/i,
    ]) || baseDraft.supplier;

  const invoiceNumber =
    extractField(lines, [
      /^invoice\s*(?:number|no|#)?\s*[:#-]?\s*(.+)$/i,
      /^inv\s*(?:number|no|#)?\s*[:#-]?\s*(.+)$/i,
    ]) || baseDraft.invoiceNumber;

  const invoiceDate = extractInvoiceDate(lines) || baseDraft.invoiceDate;

  const blockParsedItems = parseInvoiceItemBlocks(lines);
  const parsedItems =
    blockParsedItems.length > 0
      ? blockParsedItems
      : lines.map((line) => parseInvoiceItemLine(line)).filter(Boolean);

  return normalizeInvoiceDraft({
    ...baseDraft,
    supplier,
    invoiceNumber,
    invoiceDate,
    items: parsedItems.length > 0 ? parsedItems : baseDraft.items || [],
    status: INVOICE_INTAKE_STATUSES.DRAFT,
    updatedAt: new Date().toISOString(),
  });
}

export function buildInvoiceAutomationPayload(invoiceDraft) {
  const invoice = normalizeInvoiceDraft(invoiceDraft);
  const items = (invoice.items || [])
    .filter((item) => item.itemName && item.quantity > 0)
    .map((item, index) => ({
      sequence: index + 1,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    }));

  return {
    invoiceId: invoice.id,
    supplier: invoice.supplier || "",
    invoiceNumber: invoice.invoiceNumber || "",
    invoiceDate: invoice.invoiceDate || "",
    totalAmount: Number(
      items.reduce((sum, item) => sum + toNumeric(item.lineTotal), 0).toFixed(2)
    ),
    totalItems: items.length,
    source: SOURCES.INVOICE_INTAKE,
    createdAt: new Date().toISOString(),
    items,
  };
}
