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
          status: newSearch === "" ? "Not Found" : entry.status,
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
          status: "Matched",
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