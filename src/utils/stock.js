export const UNKNOWN_SUPPLIER_LABEL = "Unknown Supplier";

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

export function getFilledItemsCount(quantities) {
  return Object.keys(quantities).filter((key) => isFilled(quantities[key])).length;
}

export function getMissingItemsCount(items, quantities) {
  return items.length - getFilledItemsCount(quantities);
}

export function getProgress(items, quantities) {
  if (items.length === 0) return 0;

  const filled = getFilledItemsCount(quantities);
  return Math.round((filled / items.length) * 100);
}

export function getStatusCounts(items, quantities) {
  return items.reduce(
    (acc, item) => {
      const status = getItemStatus(item, quantities[item.id]);

      if (status === "Ok") acc.okCount += 1;
      if (status === "Critical") acc.criticalCount += 1;
      if (status === "Low") acc.lowCount += 1;
      if (status === "Check") acc.checkCount += 1;

      return acc;
    },
    {
      okCount: 0,
      criticalCount: 0,
      lowCount: 0,
      checkCount: 0,
    }
  );
}

export function groupItemsByArea(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.area]) {
      acc[item.area] = [];
    }

    acc[item.area].push(item);
    return acc;
  }, {});
}

export function getSuggestedOrder(items, quantities) {
  return items.map((item) => {
    const currentStock = getNumericValue(quantities[item.id]);
    const isItemFilled = isFilled(quantities[item.id]);
    const orderAmount = Math.max(item.idealStock - currentStock, 0);

    return {
      ...item,
      currentStock,
      isFilled: isItemFilled,
      orderAmount,
    };
  });
}

export function getOrderText(suggestedOrder) {
  const header = ["Item", "Current", "Ideal", "Order", "Unit"].join("\t");

  const rows = suggestedOrder
    .filter((item) => item.orderAmount > 0)
    .map((item) =>
      [
        item.name,
        item.currentStock,
        item.idealStock,
        item.orderAmount,
        item.unit,
      ].join("\t")
    );

  return [header, ...rows].join("\n");
}

export function getReviewTableText(items, quantities) {
  const header = ["Item", "Area", "Unit", "Ideal", "Count", "Status", "Order"].join(
    "\t"
  );

  const rows = items.map((item) => {
    const currentStock = getNumericValue(quantities[item.id]);
    const status = getItemStatus(item, quantities[item.id]);
    const orderAmount = Math.max(item.idealStock - currentStock, 0);

    return [
      item.name,
      item.area,
      item.unit,
      item.idealStock,
      currentStock,
      status,
      orderAmount,
    ].join("\t");
  });

  return [header, ...rows].join("\n");
}

export function groupSuggestedOrderBySupplier(suggestedOrder) {
  const validItems = (suggestedOrder || []).filter((item) => item.orderAmount > 0);

  return validItems.reduce((acc, item) => {
    const supplier = item.supplier || UNKNOWN_SUPPLIER_LABEL;

    if (!acc[supplier]) {
      acc[supplier] = [];
    }

    acc[supplier].push(item);
    return acc;
  }, {});
}
