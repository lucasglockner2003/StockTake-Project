export function getEntryStatusColor(status) {
  if (status === "Matched") return "#4CAF50";
  if (status === "Fuzzy Match") return "#ff9800";
  if (status === "Not Found") return "#ff4d4d";
  return "#999";
}