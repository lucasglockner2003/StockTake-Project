import { useEffect, useMemo, useState } from "react";
import { items } from "../data/items";
import {
  clearQuantities,
  loadQuantities,
  saveQuantities,
} from "../utils/storage";
import {
  getFilledItemsCount,
  getMissingItemsCount,
  getProgress,
  getStatusCounts,
  getSuggestedOrder,
  getOrderText,
  groupItemsByArea,
  getReviewTableText,
} from "../utils/stock";

function canApplyEntry(entry) {
  return (
    entry?.matchedItemId !== null &&
    entry?.matchedItemId !== undefined &&
    (entry?.status === "Matched" || entry?.status === "Fuzzy Match") &&
    entry?.quantity !== null &&
    entry?.quantity !== undefined &&
    entry?.quantity !== ""
  );
}

export function useStockTake() {
  const [quantities, setQuantities] = useState(() => loadQuantities());
  const [lastSaved, setLastSaved] = useState(null);
  const [voiceFilledItems, setVoiceFilledItems] = useState({});

  useEffect(() => {
    saveQuantities(quantities);
    setLastSaved(new Date());
  }, [quantities]);

  const filledItems = useMemo(() => getFilledItemsCount(quantities), [quantities]);
  const missingItems = useMemo(
    () => getMissingItemsCount(items, quantities),
    [quantities]
  );
  const progress = useMemo(() => getProgress(items, quantities), [quantities]);
  const reviewTableText = useMemo(
    () => getReviewTableText(items, quantities),
    [quantities]
  );

  const { okCount, criticalCount, lowCount, checkCount } = useMemo(
    () => getStatusCounts(items, quantities),
    [quantities]
  );

  const groupedItems = useMemo(() => groupItemsByArea(items), []);
  const suggestedOrder = useMemo(
    () => getSuggestedOrder(items, quantities),
    [quantities]
  );
  const orderText = useMemo(() => getOrderText(suggestedOrder), [suggestedOrder]);

  function handleQuantityChange(itemId, value) {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: value === "" ? "" : Number(value),
    }));

    setVoiceFilledItems((prev) => {
      if (!prev[itemId]) return prev;

      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  }

  function handleReset() {
    const confirmed = window.confirm(
      "Are you sure you want to reset the stock take?"
    );
    if (!confirmed) return;

    setQuantities({});
    setVoiceFilledItems({});
    clearQuantities();
  }

  async function handleCopyOrder() {
    try {
      await navigator.clipboard.writeText(orderText);
      alert("Order copied!");
    } catch {
      alert("Failed to copy order.");
    }
  }

  async function handleCopyTable() {
    try {
      await navigator.clipboard.writeText(reviewTableText);
      alert("Table copied!");
    } catch {
      alert("Failed to copy table.");
    }
  }

  function applyVoiceEntries(voiceEntriesByArea) {
    const appliedItemIds = [];

    setQuantities((prev) => {
      const updated = { ...prev };

      Object.values(voiceEntriesByArea).forEach((entries) => {
        entries.forEach((entry) => {
          if (!canApplyEntry(entry)) return;

          updated[entry.matchedItemId] = Number(entry.quantity);
          appliedItemIds.push(entry.matchedItemId);
        });
      });

      return updated;
    });

    if (appliedItemIds.length > 0) {
      setVoiceFilledItems((prev) => {
        const updated = { ...prev };

        appliedItemIds.forEach((itemId) => {
          updated[itemId] = true;
        });

        return updated;
      });
    }
  }

  function applySingleVoiceEntry(entry) {
    if (!canApplyEntry(entry)) return false;

    setQuantities((prev) => ({
      ...prev,
      [entry.matchedItemId]: Number(entry.quantity),
    }));

    setVoiceFilledItems((prev) => ({
      ...prev,
      [entry.matchedItemId]: true,
    }));

    return true;
  }

  return {
    items,
    quantities,
    lastSaved,
    filledItems,
    missingItems,
    progress,
    okCount,
    criticalCount,
    lowCount,
    checkCount,
    groupedItems,
    suggestedOrder,
    handleQuantityChange,
    handleReset,
    handleCopyOrder,
    handleCopyTable,
    applyVoiceEntries,
    applySingleVoiceEntry,
    voiceFilledItems,
  };
}