import { useEffect, useMemo, useState } from "react";
import {
  extractTextFromImage,
  getMockPhotoText,
  getPhotoExampleText,
  parsePhotoTextToEntries,
  getConfirmedPhotoEntries,
  getPhotoResultTextFromConfirmedEntries,
  buildPhotoAutomationPayloadFromConfirmedEntries,
  buildPhotoAutomationJob,
} from "../utils/photo";
import {
  updateEntryQuantity,
  updateEntryMatchSearch,
  selectEntryMatchedItem,
  deleteEntryAtIndex,
  clearOpenSearchKeyIfDeleted,
} from "../utils/entries";
import { addAutomationJob } from "../utils/automation";
import {
  addDailyConfirmedOrdersFromPhoto,
  getReadyOrdersCount,
  refreshDailyOrderSummary,
} from "../utils/dailyOrders";

export function usePhotoOrder(
  items,
  setCurrentPage,
  automationPageId,
  dailyExecutionPageId
) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawExtractedText, setRawExtractedText] = useState("");
  const [photoEntries, setPhotoEntries] = useState([]);
  const [confirmedEntries, setConfirmedEntries] = useState([]);
  const [openSearchKey, setOpenSearchKey] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [isOutputLocked, setIsOutputLocked] = useState(false);
  const [photoSessionId, setPhotoSessionId] = useState(null);
  const [readyDailyOrdersCount, setReadyDailyOrdersCount] = useState(
    getReadyOrdersCount
  );
  const [isCreatingDailyOrders, setIsCreatingDailyOrders] = useState(false);

  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  useEffect(() => {
    let isMounted = true;

    async function loadDailyOrderSummary() {
      try {
        const summary = await refreshDailyOrderSummary();

        if (!isMounted) {
          return;
        }

        setReadyDailyOrdersCount(summary.ready);
      } catch {
        if (!isMounted) {
          return;
        }

        setReadyDailyOrdersCount(getReadyOrdersCount());
      }
    }

    loadDailyOrderSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  function resetPhotoFlowState() {
    setPhotoEntries([]);
    setConfirmedEntries([]);
    setOpenSearchKey(null);
    setOcrError("");
    setIsOutputLocked(false);
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }

    const imageUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setSelectedImage(imageUrl);
    setRawExtractedText("");
    resetPhotoFlowState();
  }

  function setRawExtractedTextIfUnlocked(value) {
    if (isOutputLocked) return;
    setRawExtractedText(value);
    setConfirmedEntries([]);
  }

  function commitParsedText(text) {
    setRawExtractedText(text);
    setPhotoEntries(parsePhotoTextToEntries(text, items));
    setConfirmedEntries([]);
    setOpenSearchKey(null);
    setIsOutputLocked(false);
    setPhotoSessionId(Date.now());
  }

  function handleProcessText() {
    const parsedEntries = parsePhotoTextToEntries(rawExtractedText, items);
    setPhotoEntries(parsedEntries);
    setConfirmedEntries([]);
    setOpenSearchKey(null);
    setIsOutputLocked(false);
    setPhotoSessionId(Date.now());
  }

  async function handleProcessImage() {
    if (!selectedFile) {
      setOcrError("Select an image first.");
      return;
    }

    try {
      setIsProcessingImage(true);
      setOcrError("");
      setOpenSearchKey(null);

      const extractedText = await extractTextFromImage(selectedFile);
      commitParsedText(extractedText);
    } catch (error) {
      setOcrError(error?.message || "Failed to process image.");
      console.error("Photo OCR error:", error);
    } finally {
      setIsProcessingImage(false);
    }
  }

  function handleProcessMockAi() {
    try {
      setOcrError("");
      setOpenSearchKey(null);
      commitParsedText(getMockPhotoText(items));
    } catch (error) {
      setOcrError("Failed to generate mock AI result.");
      console.error("Mock AI error:", error);
    }
  }

  function handleDeleteEntry(indexToRemove) {
    if (isOutputLocked) return;

    setPhotoEntries((prev) => deleteEntryAtIndex(prev, indexToRemove));
    setConfirmedEntries([]);
    setOpenSearchKey((prev) =>
      clearOpenSearchKeyIfDeleted(prev, `photo-${indexToRemove}`)
    );
  }

  function handleEditQuantity(indexToUpdate, newQuantity) {
    if (isOutputLocked) return;

    setPhotoEntries((prev) =>
      updateEntryQuantity(prev, indexToUpdate, newQuantity)
    );
    setConfirmedEntries([]);
  }

  function handleMatchSearchChange(indexToUpdate, newSearch) {
    if (isOutputLocked) return;

    setPhotoEntries((prev) =>
      updateEntryMatchSearch(prev, indexToUpdate, newSearch)
    );
    setConfirmedEntries([]);
  }

  function handleSelectMatchedItem(indexToUpdate, item) {
    if (isOutputLocked) return;

    setPhotoEntries((prev) =>
      selectEntryMatchedItem(prev, indexToUpdate, item)
    );
    setConfirmedEntries([]);
  }

  async function handleConfirmOutput() {
    const nextConfirmedEntries = getConfirmedPhotoEntries(photoEntries);

    if (nextConfirmedEntries.length === 0) {
      alert("There are no valid entries to confirm.");
      return;
    }

    try {
      setIsCreatingDailyOrders(true);
      const result = await addDailyConfirmedOrdersFromPhoto(nextConfirmedEntries, items);

      setConfirmedEntries(nextConfirmedEntries);
      setIsOutputLocked(true);
      setReadyDailyOrdersCount(result.summary.ready);
    } catch (error) {
      alert(error?.message || "Failed to create daily orders.");
    } finally {
      setIsCreatingDailyOrders(false);
    }
  }

  function handleUnlockOutput() {
    setIsOutputLocked(false);
    setConfirmedEntries([]);
  }

  async function handleCopyFinalText() {
    try {
      const text = getPhotoResultTextFromConfirmedEntries(confirmedEntries);
      await navigator.clipboard.writeText(text);
      alert("Final text copied!");
    } catch {
      alert("Failed to copy final text.");
    }
  }

  const automationPayload = useMemo(
    () => buildPhotoAutomationPayloadFromConfirmedEntries(confirmedEntries),
    [confirmedEntries]
  );
  const examplePhotoText = useMemo(() => getPhotoExampleText(items), [items]);

  const automationJob = useMemo(
    () => buildPhotoAutomationJob(confirmedEntries, photoSessionId),
    [confirmedEntries, photoSessionId]
  );

  async function handleCopyAutomationPayload() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(automationJob, null, 2));
      alert("Automation payload copied!");
    } catch {
      alert("Failed to copy automation payload.");
    }
  }

  async function handleSendToAutomationQueue() {
    if (confirmedEntries.length === 0) {
      alert("There is no confirmed output to send.");
      return;
    }

    try {
      const job = await addAutomationJob(automationJob);
      alert(`Automation job created: ${job.jobId}`);
      setCurrentPage(automationPageId);
    } catch (error) {
      alert(error?.message || "Failed to create automation job.");
    }
  }

  function handleSendDailyOrderToBot() {
    setReadyDailyOrdersCount(getReadyOrdersCount());
    setCurrentPage(dailyExecutionPageId);
  }

  const searchableItems = useMemo(() => items.slice(), [items]);
  const liveValidEntriesCount = useMemo(
    () => getConfirmedPhotoEntries(photoEntries).length,
    [photoEntries]
  );

  return {
    selectedImage,
    selectedFile,
    rawExtractedText,
    setRawExtractedTextIfUnlocked,
    photoEntries,
    confirmedEntries,
    openSearchKey,
    setOpenSearchKey,
    isProcessingImage,
    ocrError,
    isOutputLocked,
    searchableItems,
    liveValidEntriesCount,
    examplePhotoText,
    automationPayload,
    automationJob,
    readyDailyOrdersCount,
    isCreatingDailyOrders,
    handleImageChange,
    handleProcessText,
    handleProcessImage,
    handleProcessMockAi,
    handleDeleteEntry,
    handleEditQuantity,
    handleMatchSearchChange,
    handleSelectMatchedItem,
    handleConfirmOutput,
    handleUnlockOutput,
    handleCopyFinalText,
    handleCopyAutomationPayload,
    handleSendToAutomationQueue,
    handleSendDailyOrderToBot,
  };
}
