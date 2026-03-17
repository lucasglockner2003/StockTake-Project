export function createEntry({
  rawLine = "",
  spokenName = "",
  quantity = "",
  matchedItem = "-",
  matchedItemId = null,
  status = "Not Found",
  matchSearch = "",
  source = "unknown",
}) {
  return {
    rawLine,
    spokenName,
    quantity,
    matchedItem,
    matchedItemId,
    status,
    matchSearch,
    source,
  };
}

export function createUnmatchedEntry({
  rawLine = "",
  spokenName = "",
  quantity = "",
  source = "unknown",
}) {
  return createEntry({
    rawLine,
    spokenName,
    quantity,
    matchedItem: "-",
    matchedItemId: null,
    status: "Not Found",
    matchSearch: "",
    source,
  });
}

export function createMatchedEntryFromMatchResult({
  rawLine = "",
  spokenName = "",
  quantity = "",
  matchResult,
  source = "unknown",
}) {
  return createEntry({
    rawLine,
    spokenName,
    quantity,
    matchedItem: matchResult?.matchedItem ? matchResult.matchedItem.name : "-",
    matchedItemId: matchResult?.matchedItem ? matchResult.matchedItem.id : null,
    status:
      matchResult?.matchType === "exact"
        ? "Matched"
        : matchResult?.matchType === "fuzzy"
        ? "Fuzzy Match"
        : "Not Found",
    matchSearch: matchResult?.matchedItem ? matchResult.matchedItem.name : "",
    source,
  });
}