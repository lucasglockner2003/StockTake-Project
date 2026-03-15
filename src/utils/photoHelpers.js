import { findBestMatch } from "./matchHelpers";

function cleanLine(line) {
  return String(line || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, ":")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[×]/g, "x")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function sanitizeDetectedName(name) {
  return cleanLine(
    String(name || "")
      .replace(/^[:\-.\sx]+/i, "")
      .replace(/[:\-.\s]+$/, "")
  );
}

function normalizeQuantityToken(token) {
  if (!token) return "";

  return String(token)
    .toLowerCase()
    .replace(/kg|kq|ig|iq|lg|1g|lyg|ky|qy/g, "")
    .replace(/[^0-9.,]/g, "")
    .replace(",", ".");
}

function parseQuantityValue(token) {
  const normalized = normalizeQuantityToken(token);

  if (!normalized) return null;

  const value = Number(normalized);
  return Number.isNaN(value) ? null : value;
}

function parsePhotoLine(line) {
  const cleaned = cleanLine(line);

  if (!cleaned) return null;

  const patterns = [
    /^(.+?)\s*[:\-]\s*(\d+(?:[.,]\d+)?)(?:\s*[a-zA-Z]{1,3})?$/i,
    /^(.+?)\s+[x]\s*(\d+(?:[.,]\d+)?)(?:\s*[a-zA-Z]{1,3})?$/i,
    /^(.+?)\s+(\d+(?:[.,]\d+)?)(?:\s*[a-zA-Z]{1,3})?$/i,
    /^(\d+(?:[.,]\d+)?)(?:\s*[a-zA-Z]{1,3})?\s+(.+)$/i,
  ];

  for (let index = 0; index < patterns.length; index += 1) {
    const pattern = patterns[index];
    const match = cleaned.match(pattern);

    if (!match) continue;

    let name = "";
    let quantity = null;

    if (index === 3) {
      quantity = parseQuantityValue(match[1]);
      name = match[2];
    } else {
      name = match[1];
      quantity = parseQuantityValue(match[2]);
    }

    name = sanitizeDetectedName(name);

    if (!name || quantity === null) return null;

    return {
      name,
      quantity,
      rawLine: cleaned,
    };
  }

  return null;
}

export function parsePhotoTextToEntries(text, items) {
  if (!text) return [];

  const lines = normalizeOcrText(text)
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);

  return lines.map((line) => {
    const parsed = parsePhotoLine(line);

    if (!parsed) {
      return {
        rawLine: line,
        spokenName: line,
        quantity: "",
        matchedItem: "-",
        matchedItemId: null,
        status: "Not Found",
        matchSearch: "",
      };
    }

    const matchResult = findBestMatch(parsed.name, items);

    return {
      rawLine: parsed.rawLine,
      spokenName: parsed.name,
      quantity: parsed.quantity,
      matchedItem: matchResult.matchedItem ? matchResult.matchedItem.name : "-",
      matchedItemId: matchResult.matchedItem ? matchResult.matchedItem.id : null,
      status:
        matchResult.matchType === "exact"
          ? "Matched"
          : matchResult.matchType === "fuzzy"
          ? "Fuzzy Match"
          : "Not Found",
      matchSearch: matchResult.matchedItem ? matchResult.matchedItem.name : "",
    };
  });
}

export function getValidPhotoEntries(entries) {
  return (entries || []).filter(
    (entry) =>
      entry.matchedItemId !== null &&
      entry.matchedItemId !== undefined &&
      entry.matchedItem !== "-" &&
      entry.quantity !== "" &&
      entry.quantity !== null &&
      entry.quantity !== undefined &&
      !Number.isNaN(Number(entry.quantity))
  );
}

export function getPhotoResultText(entries) {
  if (!entries || entries.length === 0) return "";

  const header = ["Item", "Quantity"].join("\t");

  const rows = entries
    .filter(
      (entry) =>
        entry.matchedItemId !== null &&
        entry.matchedItemId !== undefined &&
        entry.quantity !== "" &&
        entry.quantity !== null &&
        entry.quantity !== undefined
    )
    .map((entry) => [entry.matchedItem, entry.quantity].join("\t"));

  return [header, ...rows].join("\n");
}

export function buildPhotoApplyPayload(entries) {
  return getValidPhotoEntries(entries).map((entry) => ({
    itemId: entry.matchedItemId,
    itemName: entry.matchedItem,
    quantity: Number(entry.quantity),
    source: "photo",
    spokenName: entry.spokenName,
    rawLine: entry.rawLine,
  }));
}

export function getMockPhotoText() {
  const mockSamples = [
    `WINGS: 25
TOMATO: 12
POTATO: 8
SALSA: 15`,
    `WINGS: 10
POTATO: 5
TOMATO: 10`,
    `HALLOUMI: 3
BACON: 4
DRY TOMATO: 1`,
  ];

  const randomIndex = Math.floor(Math.random() * mockSamples.length);
  return mockSamples[randomIndex];
}

export async function extractTextFromImage(file) {
  if (!file) {
    throw new Error("No image file provided.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("http://localhost:3001/api/photo-order-ocr", {
    method: "POST",
    body: formData,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to process image with OpenAI.");
  }

  return normalizeOcrText(data.text || "");
}