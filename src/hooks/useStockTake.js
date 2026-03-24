import { useEffect, useMemo, useRef, useState } from "react";
import { ENTRY_STATUSES } from "../constants/app";
import { items } from "../data/items";
import {
  fetchTodayStockTake,
  resetStockTake,
  saveStockTakeItemQuantity,
} from "../repositories/stock-take-repository";
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
    (entry?.status === ENTRY_STATUSES.MATCHED ||
      entry?.status === ENTRY_STATUSES.FUZZY_MATCH) &&
    entry?.quantity !== null &&
    entry?.quantity !== undefined &&
    entry?.quantity !== ""
  );
}

export function useStockTake({ enabled = true } = {}) {
  const [quantities, setQuantities] = useState({});
  const [lastSaved, setLastSaved] = useState(null);
  const [voiceFilledItems, setVoiceFilledItems] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const saveTimeoutsRef = useRef({});
  const latestSaveSequenceRef = useRef({});
  const sequenceCounterRef = useRef(0);
  const activeSaveRequestsRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setIsLoading(false);
      setIsSaving(false);
      setErrorMessage("");
      return () => {
        isMounted = false;
      };
    }

    async function loadRemoteStockTake() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const stockTake = await fetchTodayStockTake();

        if (!isMounted) {
          return;
        }

        setQuantities(stockTake.quantities);
        setLastSaved(stockTake.lastSavedAt);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error?.message || "Failed to load today's stock take.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRemoteStockTake();

    return () => {
      isMounted = false;

      Object.values(saveTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, [enabled]);

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
  const itemsById = useMemo(() => {
    return items.reduce((accumulator, item) => {
      accumulator[item.id] = item;
      return accumulator;
    }, {});
  }, []);

  function clearPendingSave(itemId) {
    const timeoutId = saveTimeoutsRef.current[itemId];

    if (!timeoutId) {
      return;
    }

    window.clearTimeout(timeoutId);
    delete saveTimeoutsRef.current[itemId];
  }

  function clearAllPendingSaves() {
    Object.keys(saveTimeoutsRef.current).forEach((itemId) => {
      clearPendingSave(itemId);
    });
  }

  function scheduleQuantitySave(itemId, nextQuantity) {
    const item = itemsById[itemId];

    if (!item) {
      return;
    }

    clearPendingSave(itemId);

    const sequence = sequenceCounterRef.current + 1;
    sequenceCounterRef.current = sequence;
    latestSaveSequenceRef.current[itemId] = sequence;

    saveTimeoutsRef.current[itemId] = window.setTimeout(async () => {
      delete saveTimeoutsRef.current[itemId];
      activeSaveRequestsRef.current += 1;
      setIsSaving(true);

      try {
        const mutation = await saveStockTakeItemQuantity(item, nextQuantity);

        if (latestSaveSequenceRef.current[itemId] !== sequence) {
          return;
        }

        setLastSaved(mutation.lastSavedAt);
        setErrorMessage("");
      } catch (error) {
        if (latestSaveSequenceRef.current[itemId] !== sequence) {
          return;
        }

        setErrorMessage(error?.message || "Failed to save stock take changes.");
      } finally {
        activeSaveRequestsRef.current = Math.max(activeSaveRequestsRef.current - 1, 0);
        setIsSaving(
          activeSaveRequestsRef.current > 0 ||
            Object.keys(saveTimeoutsRef.current).length > 0
        );
      }
    }, 420);
  }

  function commitQuantity(itemId, value) {
    const normalizedValue = value === "" ? "" : Number(value);

    setQuantities((prev) => ({
      ...prev,
      [itemId]: normalizedValue,
    }));

    setVoiceFilledItems((prev) => {
      if (!prev[itemId]) return prev;

      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });

    scheduleQuantitySave(itemId, normalizedValue);
  }

  function handleQuantityChange(itemId, value) {
    commitQuantity(itemId, value);
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "Are you sure you want to reset the stock take?"
    );
    if (!confirmed) return;

    clearAllPendingSaves();
    activeSaveRequestsRef.current = 0;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const stockTake = await resetStockTake();

      setQuantities(stockTake.quantities);
      setVoiceFilledItems({});
      setLastSaved(stockTake.lastSavedAt);
    } catch (error) {
      setErrorMessage(error?.message || "Failed to reset today's stock take.");
    } finally {
      setIsLoading(false);
      setIsSaving(false);
    }
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
    const appliedEntries = [];

    setQuantities((prev) => {
      const updated = { ...prev };

      Object.values(voiceEntriesByArea).forEach((entries) => {
        entries.forEach((entry) => {
          if (!canApplyEntry(entry)) return;

          const nextQuantity = Number(entry.quantity);
          updated[entry.matchedItemId] = nextQuantity;
          appliedEntries.push({
            itemId: entry.matchedItemId,
            quantity: nextQuantity,
          });
        });
      });

      return updated;
    });

    if (appliedEntries.length > 0) {
      setVoiceFilledItems((prev) => {
        const updated = { ...prev };

        appliedEntries.forEach(({ itemId }) => {
          updated[itemId] = true;
        });

        return updated;
      });

      appliedEntries.forEach(({ itemId, quantity }) => {
        scheduleQuantitySave(itemId, quantity);
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

    scheduleQuantitySave(entry.matchedItemId, Number(entry.quantity));

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
    isLoading,
    isSaving,
    errorMessage,
  };
}
