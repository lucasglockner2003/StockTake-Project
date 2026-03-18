import { SOURCES } from "../constants/app";

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

export function createSpeechRecognition(onResult, onEnd) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Browser does not support Speech Recognition. Use Chrome.");
    return null;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-NZ";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const latestResult = event.results[event.results.length - 1];

    if (!latestResult || !latestResult[0]) return;

    const text = String(latestResult[0].transcript || "")
      .trim()
      .toLowerCase();

    if (!text) return;

    onResult(text);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  recognition.onerror = () => {
    if (onEnd) onEnd();
  };

  return recognition;
}
