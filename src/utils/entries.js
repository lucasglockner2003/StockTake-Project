import { ENTRY_MATCH_TYPES, ENTRY_STATUSES, SOURCES } from "../constants/app";

export function createEntry({
  rawLine = "",
  spokenName = "",
  quantity = "",
  matchedItem = "-",
  matchedItemId = null,
  status = ENTRY_STATUSES.NOT_FOUND,
  matchSearch = "",
  source = SOURCES.UNKNOWN,
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
  source = SOURCES.UNKNOWN,
}) {
  return createEntry({
    rawLine,
    spokenName,
    quantity,
    matchedItem: "-",
    matchedItemId: null,
    status: ENTRY_STATUSES.NOT_FOUND,
    matchSearch: "",
    source,
  });
}

export function createMatchedEntryFromMatchResult({
  rawLine = "",
  spokenName = "",
  quantity = "",
  matchResult,
  source = SOURCES.UNKNOWN,
}) {
  return createEntry({
    rawLine,
    spokenName,
    quantity,
    matchedItem: matchResult?.matchedItem ? matchResult.matchedItem.name : "-",
    matchedItemId: matchResult?.matchedItem ? matchResult.matchedItem.id : null,
    status:
      matchResult?.matchType === ENTRY_MATCH_TYPES.EXACT
        ? ENTRY_STATUSES.MATCHED
        : matchResult?.matchType === ENTRY_MATCH_TYPES.FUZZY
        ? ENTRY_STATUSES.FUZZY_MATCH
        : ENTRY_STATUSES.NOT_FOUND,
    matchSearch: matchResult?.matchedItem ? matchResult.matchedItem.name : "",
    source,
  });
}

export function normalizeEntryQuantity(newQuantity) {
  return newQuantity === "" ? "" : Math.max(Number(newQuantity), 0);
}

export function updateEntryQuantity(entries, indexToUpdate, newQuantity) {
  return entries.map((entry, index) =>
    index === indexToUpdate
      ? {
          ...entry,
          quantity: normalizeEntryQuantity(newQuantity),
        }
      : entry
  );
}

export function updateEntryMatchSearch(entries, indexToUpdate, newSearch) {
  return entries.map((entry, index) =>
    index === indexToUpdate
      ? {
          ...entry,
          matchSearch: newSearch,
          matchedItem: newSearch === "" ? "-" : entry.matchedItem,
          matchedItemId: newSearch === "" ? null : entry.matchedItemId,
          status: newSearch === "" ? ENTRY_STATUSES.NOT_FOUND : entry.status,
        }
      : entry
  );
}

export function selectEntryMatchedItem(entries, indexToUpdate, item) {
  return entries.map((entry, index) =>
    index === indexToUpdate
      ? {
          ...entry,
          matchedItem: item.name,
          matchedItemId: item.id,
          status: ENTRY_STATUSES.MATCHED,
          matchSearch: item.name,
        }
      : entry
  );
}

export function deleteEntryAtIndex(entries, indexToRemove) {
  return entries.filter((_, index) => index !== indexToRemove);
}

export function buildEntrySearchKey(prefix, index) {
  return `${prefix}-${index}`;
}

export function clearOpenSearchKeyIfDeleted(currentOpenSearchKey, deletingKey) {
  return currentOpenSearchKey === deletingKey ? null : currentOpenSearchKey;
}

export function getFilteredItemsForEntry(items, entry, limit = 8) {
  return items
    .filter((item) =>
      !entry.matchSearch
        ? true
        : item.name.toLowerCase().includes(entry.matchSearch.toLowerCase())
    )
    .slice(0, limit);
}

export function getEntryStatusColor(status) {
  if (status === ENTRY_STATUSES.MATCHED) return "#4CAF50";
  if (status === ENTRY_STATUSES.FUZZY_MATCH) return "#ff9800";
  if (status === ENTRY_STATUSES.NOT_FOUND) return "#ff4d4d";
  return "#999";
}
