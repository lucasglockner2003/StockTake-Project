import { SOURCES } from "../constants/app";

export const VOICE_RECOGNITION_LANGUAGE = "pt-BR";

const numberWords = {
  zero: 0,
  oh: 0,

  one: 1,
  won: 1,

  two: 2,
  to: 2,
  too: 2,

  three: 3,
  tree: 3,
  free: 3,

  four: 4,
  for: 4,
  fore: 4,

  five: 5,
  hive: 5,

  six: 6,
  sex: 6,

  seven: 7,
  eight: 8,
  ate: 8,

  nine: 9,
  ten: 10,
};

function normalizeText(text) {
  return String(text || "").trim().toLowerCase();
}

function normalizeNumberToken(token) {
  return normalizeText(token).replace(/[^\w.]/g, "");
}

function parseSpokenNumber(text) {
  const normalized = normalizeText(text);

  if (!normalized) return null;

  const directNumeric = Number(normalized);
  if (!Number.isNaN(directNumeric)) return directNumeric;

  const singleToken = normalizeNumberToken(normalized);
  if (numberWords[singleToken] !== undefined) {
    return numberWords[singleToken];
  }

  const parts = normalized.split(" ").map(normalizeNumberToken).filter(Boolean);

  if (parts.length === 3 && parts[1] === "point") {
    const whole =
      !Number.isNaN(Number(parts[0])) ? Number(parts[0]) : numberWords[parts[0]];
    const decimal =
      !Number.isNaN(Number(parts[2])) ? Number(parts[2]) : numberWords[parts[2]];

    if (whole !== undefined && decimal !== undefined) {
      return Number(`${whole}.${decimal}`);
    }
  }

  return null;
}

export function parseVoiceLine(line) {
  const normalized = normalizeText(line);
  if (!normalized) return null;

  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length < 2) return null;

  for (let tokenCount = 3; tokenCount >= 1; tokenCount -= 1) {
    if (parts.length <= tokenCount) continue;

    const quantityText = parts.slice(-tokenCount).join(" ");
    const quantity = parseSpokenNumber(quantityText);

    if (quantity === null) continue;

    const spokenName = parts.slice(0, -tokenCount).join(" ").trim();

    if (!spokenName) continue;

    return {
      rawLine: normalized,
      spokenName,
      quantity,
      source: SOURCES.VOICE,
    };
  }

  return null;
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function isLocalhostHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor());
}

export function isSpeechRecognitionSecureContext() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.isSecureContext || isLocalhostHostname(window.location.hostname);
}

export function createSpeechRecognition({
  recognition: existingRecognition = null,
  onStart,
  onInterimResult,
  onResult,
  onError,
  onEnd,
  lang = VOICE_RECOGNITION_LANGUAGE,
} = {}) {
  const SpeechRecognition =
    getSpeechRecognitionConstructor();

  if (!SpeechRecognition) {
    console.error("[voice] SpeechRecognition API is not supported in this browser.");
    return null;
  }

  const recognition = existingRecognition || new SpeechRecognition();

  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = (event) => {
    console.log("Voice started");
    console.info("[voice] started", event);
    onStart?.(event);
  };

  recognition.onresult = (event) => {
    console.info("[voice] result:", event);

    const transcript = String(
      event?.results?.[0]?.[0]?.transcript ||
        event?.results?.[event?.resultIndex || 0]?.[0]?.transcript ||
        ""
    ).trim();

    if (!transcript) {
      return;
    }

    console.log("Voice result", transcript);
    onInterimResult?.("", event);
    onResult?.(transcript, event);
  };

  recognition.onerror = (event) => {
    console.log("Voice error", event?.error);
    console.error("[voice] error:", event?.error, event);
    onError?.(event);
  };

  recognition.onend = (event) => {
    console.log("Voice ended");
    console.info("[voice] ended", event);
    onEnd?.(event);
  };

  return recognition;
}
