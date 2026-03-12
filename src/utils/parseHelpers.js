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
  through: 4,

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
  return text.trim().toLowerCase();
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

  const lastWord = parts.slice(-1).join(" ");
  const lastTwoWords = parts.slice(-2).join(" ");
  const lastThreeWords = parts.slice(-3).join(" ");

  let quantity = parseSpokenNumber(lastWord);
  let spokenName = parts.slice(0, -1).join(" ");

  if (quantity === null && parts.length >= 3) {
    quantity = parseSpokenNumber(lastTwoWords);
    spokenName = parts.slice(0, -2).join(" ");
  }

  if (quantity === null && parts.length >= 4) {
    quantity = parseSpokenNumber(lastThreeWords);
    spokenName = parts.slice(0, -3).join(" ");
  }

  if (quantity === null) {
    return null;
  }

  spokenName = spokenName.trim();

  if (!spokenName) {
    return null;
  }

  return {
    spokenName,
    quantity,
  };
}