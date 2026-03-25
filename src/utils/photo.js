import { SOURCES } from "../constants/app";
import { extractPhotoOrderText } from "../services/photo-ocr-service";
import { findBestMatch } from "./matching";
import {
  createMatchedEntryFromMatchResult,
  createUnmatchedEntry,
} from "./entries";

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
      return createUnmatchedEntry({
        rawLine: line,
        spokenName: line,
        quantity: "",
        source: SOURCES.PHOTO,
      });
    }

    const matchResult = findBestMatch(parsed.name, items);

    return createMatchedEntryFromMatchResult({
      rawLine: parsed.rawLine,
      spokenName: parsed.name,
      quantity: parsed.quantity,
      matchResult,
      source: SOURCES.PHOTO,
    });
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

export function getConfirmedPhotoEntries(entries) {
  return getValidPhotoEntries(entries).map((entry, index) => ({
    sequence: index + 1,
    itemId: entry.matchedItemId,
    itemName: entry.matchedItem,
    displayName: entry.matchedItem,
    quantity: Number(entry.quantity),
    supplier: entry.supplier || "",
    source: entry.source || SOURCES.PHOTO,
    spokenName: entry.spokenName,
    rawLine: entry.rawLine,
    status: entry.status,
  }));
}

export function getPhotoResultTextFromConfirmedEntries(confirmedEntries) {
  if (!confirmedEntries || confirmedEntries.length === 0) return "";

  const header = ["Seq", "Item", "Quantity", "Source"].join("\t");

  const rows = confirmedEntries.map((entry) =>
    [entry.sequence, entry.itemName, entry.quantity, entry.source].join("\t")
  );

  return [header, ...rows].join("\n");
}

export function getPhotoResultText(entries) {
  return getPhotoResultTextFromConfirmedEntries(
    getConfirmedPhotoEntries(entries)
  );
}

export function buildPhotoAutomationPayloadFromConfirmedEntries(confirmedEntries) {
  return (confirmedEntries || []).map((entry) => ({
    sequence: entry.sequence,
    itemId: entry.itemId,
    itemName: entry.itemName,
    quantity: entry.quantity,
    supplier: entry.supplier || "",
    source: entry.source,
    spokenName: entry.spokenName,
    rawLine: entry.rawLine,
  }));
}

export function buildPhotoAutomationPayload(entries) {
  return buildPhotoAutomationPayloadFromConfirmedEntries(
    getConfirmedPhotoEntries(entries)
  );
}

export function buildPhotoAutomationJob(confirmedEntries, sessionId) {
  const items = buildPhotoAutomationPayloadFromConfirmedEntries(confirmedEntries);

  return {
    sessionId: sessionId || Date.now(),
    createdAt: new Date().toISOString(),
    totalItems: items.length,
    source: SOURCES.PHOTO_ORDER,
    items,
  };
}

export function getPhotoAutomationPreviewText(entries) {
  const payload = buildPhotoAutomationPayload(entries);

  if (payload.length === 0) return "";

  return payload
    .map((entry) => `${entry.sequence}. ${entry.itemName}\t${entry.quantity}`)
    .join("\n");
}

function getCatalogSampleItems(items = []) {
  const validItems = (items || []).filter((item) => String(item?.name || "").trim());

  if (validItems.length > 0) {
    return validItems.slice(0, 4);
  }

  return [
    { name: "Item A" },
    { name: "Item B" },
    { name: "Item C" },
    { name: "Item D" },
  ];
}

export function getPhotoExampleText(items = []) {
  const sampleItems = getCatalogSampleItems(items);
  const quantities = [25, 12, 8, 15];

  return sampleItems
    .map((item, index) => `${item.name}: ${quantities[index] || index + 1}`)
    .join("\n");
}

export function getMockPhotoText(items = []) {
  const sampleItems = getCatalogSampleItems(items);
  const quantitySets = [
    [25, 12, 8, 15],
    [10, 5, 10, 3],
    [3, 4, 1, 2],
  ];

  const randomIndex = Math.floor(Math.random() * quantitySets.length);
  const selectedQuantities = quantitySets[randomIndex];

  return sampleItems
    .slice(0, selectedQuantities.length)
    .map(
      (item, index) =>
        `${String(item.name || "").toUpperCase()}: ${selectedQuantities[index]}`
    )
    .join("\n");
}

export async function extractTextFromImage(file) {
  if (!file) {
    throw new Error("No image file provided.");
  }

  const extractedText = await extractPhotoOrderText(file);
  return normalizeOcrText(extractedText);
}
