const numberWords = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function normalizeText(text) {
  return text.trim().toLowerCase();
}

function parseSpokenNumber(text) {
  const normalized = normalizeText(text);

  if (!normalized) return null;

  const numericValue = Number(normalized);
  if (!Number.isNaN(numericValue)) return numericValue;

  if (numberWords[normalized] !== undefined) {
    return numberWords[normalized];
  }

  const pointMatch = normalized.match(/^(\w+)\s+point\s+(\w+)$/);
  if (pointMatch) {
    const whole = numberWords[pointMatch[1]];
    const decimal = numberWords[pointMatch[2]];

    if (whole !== undefined && decimal !== undefined) {
      return Number(`${whole}.${decimal}`);
    }
  }

  return null;
}

export function parseVoiceLine(line) {
  const normalized = normalizeText(line);
  if (!normalized) return null;

  const parts = normalized.split(" ");
  if (parts.length < 2) return null;

  const lastWord = parts[parts.length - 1];
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

  if (quantity === null || !spokenName.trim()) {
    return null;
  }

  return {
    spokenName: spokenName.trim(),
    quantity,
  };
}