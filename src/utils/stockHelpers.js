import { getItemStatus, getNumericValue, isFilled } from "./statusHelpers";

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