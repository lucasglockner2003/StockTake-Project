import { useEffect, useMemo, useState } from "react";
import {
  extractTextFromImage,
  getMockPhotoText,
  parsePhotoTextToEntries,
  getConfirmedPhotoEntries,
  getPhotoResultTextFromConfirmedEntries,
  buildPhotoAutomationPayloadFromConfirmedEntries,
  buildPhotoAutomationJob,
} from "../utils/photo";
import { addAutomationJob } from "../utils/automation";
import { styles } from "../utils/uiStyles";
import {
  updateEntryQuantity,
  updateEntryMatchSearch,
  selectEntryMatchedItem,
  deleteEntryAtIndex,
  clearOpenSearchKeyIfDeleted,
  getFilteredItemsForEntry,
} from "../utils/entries";
import EditableEntrySection from "../components/EditableEntrySection";

function PhotoPage({ items, setCurrentPage }) {
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

  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

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
      setRawExtractedText(extractedText);
      setPhotoEntries(parsePhotoTextToEntries(extractedText, items));
      setConfirmedEntries([]);
      setIsOutputLocked(false);
      setPhotoSessionId(Date.now());
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

      const mockText = getMockPhotoText();
      setRawExtractedText(mockText);
      setPhotoEntries(parsePhotoTextToEntries(mockText, items));
      setConfirmedEntries([]);
      setIsOutputLocked(false);
      setPhotoSessionId(Date.now());
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

  function handleConfirmOutput() {
    const nextConfirmedEntries = getConfirmedPhotoEntries(photoEntries);

    if (nextConfirmedEntries.length === 0) {
      alert("There are no valid entries to confirm.");
      return;
    }

    setConfirmedEntries(nextConfirmedEntries);
    setIsOutputLocked(true);
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

  async function handleCopyAutomationPayload() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(automationJob, null, 2));
      alert("Automation payload copied!");
    } catch {
      alert("Failed to copy automation payload.");
    }
  }

  function handleSendToAutomationQueue() {
    if (confirmedEntries.length === 0) {
      alert("There is no confirmed output to send.");
      return;
    }

    const job = addAutomationJob(automationJob);
    alert(`Automation job created: ${job.jobId}`);
    setCurrentPage("automation");
  }

  const searchableItems = useMemo(() => items.slice(), [items]);
  const liveValidEntriesCount = useMemo(
    () => getConfirmedPhotoEntries(photoEntries).length,
    [photoEntries]
  );
  const automationPayload = useMemo(
    () => buildPhotoAutomationPayloadFromConfirmedEntries(confirmedEntries),
    [confirmedEntries]
  );
  const automationJob = useMemo(
    () => buildPhotoAutomationJob(confirmedEntries, photoSessionId),
    [confirmedEntries, photoSessionId]
  );

  return (
    <div>
      <h1>Photo Order</h1>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <button onClick={() => setCurrentPage("stock")} style={styles.backButton}>
          Back to Stock Take
        </button>

        
      </div>

      <div style={{ marginBottom: "20px" }}>
        <input type="file" accept="image/*" onChange={handleImageChange} />
      </div>

      {selectedImage && (
        <div style={{ marginBottom: "20px" }}>
          <img
            src={selectedImage}
            alt="Selected order"
            style={{
              maxWidth: "100%",
              maxHeight: "300px",
              borderRadius: "8px",
              border: "1px solid #444",
            }}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={handleProcessMockAi}
          disabled={isProcessingImage}
          style={{
            ...styles.primaryButton,
            backgroundColor: isProcessingImage ? "#888" : "#8e44ad",
            cursor: isProcessingImage ? "not-allowed" : "pointer",
          }}
        >
          Process Mock AI
        </button>

        <button
          onClick={handleProcessImage}
          disabled={!selectedFile || isProcessingImage}
          style={{
            ...styles.primaryButton,
            backgroundColor: !selectedFile || isProcessingImage ? "#888" : "#7b3ff2",
            cursor:
              !selectedFile || isProcessingImage ? "not-allowed" : "pointer",
          }}
        >
          {isProcessingImage ? "Processing Image..." : "Process Image"}
        </button>

        <button
          onClick={handleProcessText}
          disabled={isProcessingImage}
          style={{
            ...styles.primaryButton,
            backgroundColor: isProcessingImage ? "#888" : "#2196F3",
            cursor: isProcessingImage ? "not-allowed" : "pointer",
          }}
        >
          Process Text
        </button>

        <button
          onClick={() => setCurrentPage("automation")}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#ff9800",
          }}
        >
          View Automation Jobs
        </button>
        
      </div>

      {isProcessingImage && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "#1f1f1f",
            border: "1px solid #444",
            color: "white",
            fontWeight: "bold",
          }}
        >
          Sending image to OpenAI...
        </div>
      )}

      {ocrError && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "#3a1f1f",
            border: "1px solid #7a2d2d",
            color: "#ffb3b3",
            fontWeight: "bold",
          }}
        >
          {ocrError}
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <h2>OCR Raw Text</h2>
        <textarea
          value={rawExtractedText}
          onChange={(e) => {
            if (isOutputLocked) return;
            setRawExtractedText(e.target.value);
            setConfirmedEntries([]);
          }}
          readOnly={isOutputLocked}
          placeholder={`Text will appear here automatically.

Example:
Wings: 25
Tomato: 12
Potato: 8
Salsa: 15`}
          style={{
            width: "100%",
            minHeight: "160px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #555",
            backgroundColor: "#1f1f1f",
            color: "white",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <h2 style={{ marginBottom: "10px" }}>Detected Entries</h2>

        <EditableEntrySection
          entries={photoEntries}
          searchKeyPrefix="photo"
          openSearchKey={openSearchKey}
          setOpenSearchKey={setOpenSearchKey}
          getFilteredItems={(entry) =>
            getFilteredItemsForEntry(searchableItems, entry)
          }
          onEditQuantity={handleEditQuantity}
          onMatchSearchChange={handleMatchSearchChange}
          onSelectMatchedItem={handleSelectMatchedItem}
          onDelete={handleDeleteEntry}
          emptyText="No detected entries yet."
          showAreaInDropdown
          rowKeyBuilder={(entry, index) => `${entry.rawLine}-${index}`}
          firstColumnLabel="Detected"
          isLocked={isOutputLocked}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "28px",
        }}
      >
        <button
          onClick={handleConfirmOutput}
          disabled={liveValidEntriesCount === 0 || isOutputLocked}
          style={{
            ...styles.primaryButton,
            backgroundColor:
              liveValidEntriesCount === 0 || isOutputLocked ? "#888" : "#4CAF50",
            cursor:
              liveValidEntriesCount === 0 || isOutputLocked
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isOutputLocked
            ? "Output Locked"
            : `Confirm Output (${liveValidEntriesCount})`}
        </button>

        <button
          onClick={handleUnlockOutput}
          disabled={!isOutputLocked}
          style={{
            ...styles.primaryButton,
            backgroundColor: !isOutputLocked ? "#888" : "#d9534f",
            cursor: !isOutputLocked ? "not-allowed" : "pointer",
          }}
        >
          Unlock Output
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ marginBottom: "10px" }}>
          Confirmed Output ({confirmedEntries.length})
        </h2>

        {confirmedEntries.length === 0 ? (
          <div style={styles.emptyState}>No confirmed entries ready yet.</div>
        ) : (
          <div
            style={{
              border: "1px solid #555",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1.4fr 0.8fr 0.8fr",
                gap: "8px",
                alignItems: "center",
                padding: "8px 10px",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#aaa",
                borderBottom: "1px solid #444",
              }}
            >
              <div>Seq</div>
              <div>Item</div>
              <div>Qty</div>
              <div>Source</div>
            </div>

            {confirmedEntries.map((entry) => (
              <div
                key={`${entry.itemId}-${entry.sequence}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 1.4fr 0.8fr 0.8fr",
                  gap: "8px",
                  alignItems: "center",
                  padding: "10px",
                  borderBottom: "1px solid #333",
                }}
              >
                <div>{entry.sequence}</div>
                <div>{entry.itemName}</div>
                <div>{entry.quantity}</div>
                <div>{entry.source}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ marginBottom: "10px" }}>
          Automation Payload Preview ({automationPayload.length})
        </h2>

        <textarea
          readOnly
          value={
            automationPayload.length > 0
              ? JSON.stringify(automationJob, null, 2)
              : ""
          }
          placeholder="Automation payload will appear here."
          style={{
            width: "100%",
            minHeight: "220px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #555",
            backgroundColor: "#1f1f1f",
            color: "white",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleCopyFinalText}
          disabled={confirmedEntries.length === 0}
          style={{
            ...styles.primaryButton,
            backgroundColor: confirmedEntries.length === 0 ? "#888" : "#4CAF50",
            cursor: confirmedEntries.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Copy Final Text
        </button>

        <button
          onClick={handleCopyAutomationPayload}
          disabled={automationPayload.length === 0}
          style={{
            ...styles.primaryButton,
            backgroundColor: automationPayload.length === 0 ? "#888" : "#6f42c1",
            cursor: automationPayload.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Copy Automation Payload
        </button>

        <button
          onClick={handleSendToAutomationQueue}
          disabled={confirmedEntries.length === 0}
          style={{
            ...styles.primaryButton,
            backgroundColor: confirmedEntries.length === 0 ? "#888" : "#ff9800",
            cursor: confirmedEntries.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Send To Automation Queue
        </button>
      </div>
    </div>
  );
}

export default PhotoPage;