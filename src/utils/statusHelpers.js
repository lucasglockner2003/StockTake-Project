export function isFilled(quantity) {
  return quantity !== undefined && quantity !== null && quantity !== "";
}

export function getNumericValue(quantity) {
  if (!isFilled(quantity)) return 0;

  const value = Number(quantity);
  return Number.isNaN(value) ? 0 : value;
}

export function getItemStatus(item, quantity) {
  if (!isFilled(quantity)) return "Pending";

  const value = getNumericValue(quantity);
  const checkLimit = item.idealStock * 5;
  const criticalLimit = item.idealStock * 0.25;
  const lowLimit = item.idealStock * 0.5;

  if (value >= checkLimit) return "Check";

  if (item.critical) {
    if (value <= criticalLimit) return "Critical";
    if (value <= lowLimit) return "Low";
  }

  return "Ok";
}

const statusColors = {
  Pending: "#999",
  Critical: "#ff4d4d",
  Low: "#ff9800",
  Check: "#ff9800",
  Ok: "#4CAF50",
};

export function getStatusColor(item, quantity) {
  const status = getItemStatus(item, quantity);
  return statusColors[status] || "#999";
}