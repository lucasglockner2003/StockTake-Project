import { PAGE_IDS } from "../constants/app";
import { getFilteredItemsForEntry } from "../utils/entries";
import { styles } from "../utils/uiStyles";
import EditableEntrySection from "../components/EditableEntrySection";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";
import { usePhotoOrder } from "../hooks/usePhotoOrder";

function PhotoPage({ items, setCurrentPage }) {
  const {
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
    automationPayload,
    automationJob,
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
    readyDailyOrdersCount,
    handleSendDailyOrderToBot,
  } = usePhotoOrder(
    items,
    setCurrentPage,
    PAGE_IDS.AUTOMATION,
    PAGE_IDS.DAILY_ORDER_EXECUTION
  );

  return (
    <div>
      <h1>Photo Order</h1>

      <PageActionBar>
        <button
          onClick={() => setCurrentPage(PAGE_IDS.STOCK)}
          style={styles.backButton}
        >
          Back to Stock Take
        </button>
      </PageActionBar>

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

      <PageActionBar>
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
          onClick={() => setCurrentPage(PAGE_IDS.AUTOMATION)}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#ff9800",
          }}
        >
          View Automation Jobs
        </button>

        <button
          onClick={() => setCurrentPage(PAGE_IDS.DAILY_ORDER_EXECUTION)}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#607d8b",
          }}
        >
          View Daily Orders
        </button>

        <button
          onClick={() => setCurrentPage(PAGE_IDS.INVOICE_INTAKE)}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#00b894",
          }}
        >
          Invoice Intake
        </button>
      </PageActionBar>

      {isProcessingImage && (
        <NoticePanel backgroundColor="#1f1f1f">Sending image to OpenAI...</NoticePanel>
      )}

      {ocrError && (
        <NoticePanel
          backgroundColor="#3a1f1f"
          border="1px solid #7a2d2d"
          color="#ffb3b3"
        >
          {ocrError}
        </NoticePanel>
      )}

      <div style={{ marginBottom: "20px" }}>
        <h2>OCR Raw Text</h2>
        <textarea
          value={rawExtractedText}
          onChange={(e) => setRawExtractedTextIfUnlocked(e.target.value)}
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

      <PageActionBar marginBottom="28px">
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
      </PageActionBar>

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
            <SectionTableHeader
              columns={["Seq", "Item", "Qty", "Source"]}
              gridTemplateColumns="70px 1.4fr 0.8fr 0.8fr"
            />

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

      <PageActionBar marginBottom="0">
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

        <button
          onClick={handleSendDailyOrderToBot}
          style={{
            ...styles.primaryButton,
            backgroundColor: readyDailyOrdersCount > 0 ? "#00b894" : "#607d8b",
          }}
        >
          Send Daily Order To Bot (Ready: {readyDailyOrdersCount})
        </button>
      </PageActionBar>
    </div>
  );
}

export default PhotoPage;
