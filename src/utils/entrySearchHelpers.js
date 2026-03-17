export function getFilteredItemsForEntry(items, entry, limit = 8) {
  return items
    .filter((item) =>
      !entry.matchSearch
        ? true
        : item.name.toLowerCase().includes(entry.matchSearch.toLowerCase())
    )
    .slice(0, limit);
}