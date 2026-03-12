function normalizeText(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function getItemSearchTerms(item) {
  const aliases = item.aliases || [];
  return [item.name, ...aliases].map(normalizeText);
}

function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function getSimilarityScore(a, b) {
  if (!a || !b) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

export function findBestMatchInArea(spokenName, selectedArea, items) {
  const normalizedSpokenName = normalizeText(spokenName);

  const areaItems = items.filter((item) => item.area === selectedArea);

  if (areaItems.length === 0) {
    return {
      matchedItem: null,
      matchType: "none",
    };
  }

  for (const item of areaItems) {
    const searchTerms = getItemSearchTerms(item);

    if (searchTerms.includes(normalizedSpokenName)) {
      return {
        matchedItem: item,
        matchType: "exact",
      };
    }
  }

  for (const item of areaItems) {
    const searchTerms = getItemSearchTerms(item);

    const hasIncludesMatch = searchTerms.some(
      (term) =>
        term.includes(normalizedSpokenName) ||
        normalizedSpokenName.includes(term)
    );

    if (hasIncludesMatch) {
      return {
        matchedItem: item,
        matchType: "fuzzy",
      };
    }
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const item of areaItems) {
    const searchTerms = getItemSearchTerms(item);

    for (const term of searchTerms) {
      const score = getSimilarityScore(normalizedSpokenName, term);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }
  }

  if (bestMatch && bestScore >= 0.6) {
    return {
      matchedItem: bestMatch,
      matchType: "fuzzy",
    };
  }

  return {
    matchedItem: null,
    matchType: "none",
  };
}