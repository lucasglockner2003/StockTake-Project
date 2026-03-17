import { findBestMatch } from "./matchHelpers";
import {
  createMatchedEntryFromMatchResult,
  createUnmatchedEntry,
} from "./entryFactories";

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
        source: "photo",
      });
    }

    const matchResult = findBestMatch(parsed.name, items);

    return createMatchedEntryFromMatchResult({
      rawLine: parsed.rawLine,
      spokenName: parsed.name,
      quantity: parsed.quantity,
      matchResult,
      source: "photo",
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
    source: entry.source || "photo",
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
    source: "photo-order",
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