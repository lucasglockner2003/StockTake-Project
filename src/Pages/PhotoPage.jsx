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
    examplePhotoText,
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
    readyDailyOrdersCount,
    isCreatingDailyOrders,
    handleSendDailyOrderToBot,
  } = usePhotoOrder(
    items,
    setCurrentPage,
    PAGE_IDS.AUTOMATION,
    PAGE_IDS.DAILY_ORDER_EXECUTION
  );

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "30px", fontWeight: 600 }}>Photo Order</h1>

      <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
        <div style={{ marginBottom: "14px", fontSize: "13px", color: "#94a3b8" }}>
          Upload a supplier order image and extract entries for review.
        </div>

        <input type="file" accept="image/*" onChange={handleImageChange} />
      </div>

      {selectedImage && (
        <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
          <img
            src={selectedImage}
            alt="Selected order"
            style={{
              maxWidth: "100%",
              maxHeight: "300px",
              borderRadius: "12px",
              border: "1px solid #1f2937",
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
            backgroundColor: isProcessingImage ? "#64748b" : "#7c3aed",
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
            backgroundColor:
              !selectedFile || isProcessingImage ? "#64748b" : "#2563eb",
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
            backgroundColor: isProcessingImage ? "#64748b" : "#0ea5e9",
            cursor: isProcessingImage ? "not-allowed" : "pointer",
          }}
        >
          Process Text
        </button>

      </PageActionBar>

      {isProcessingImage && (
        <NoticePanel backgroundColor="rgba(37, 99, 235, 0.12)" border="1px solid rgba(59, 130, 246, 0.22)" color="#bfdbfe">
          <span className="saas-running-indicator">
            <span className="saas-spinner" />
            <span>Running bot...</span>
          </span>
          <span style={{ marginLeft: "10px" }}>Sending image to OpenAI...</span>
        </NoticePanel>
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

      <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "12px", fontWeight: 600 }}>OCR Raw Text</h2>
        <textarea
          value={rawExtractedText}
          onChange={(e) => setRawExtractedTextIfUnlocked(e.target.value)}
          readOnly={isOutputLocked}
          placeholder={`Text will appear here automatically.

Example:
${examplePhotoText}`}
          style={{
            ...styles.input,
            minHeight: "160px",
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "12px", fontWeight: 600 }}>
          Detected Entries
        </h2>

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
          disabled={
            liveValidEntriesCount === 0 || isOutputLocked || isCreatingDailyOrders
          }
          style={{
            ...styles.primaryButton,
            backgroundColor:
              liveValidEntriesCount === 0 || isOutputLocked || isCreatingDailyOrders
                ? "#64748b"
                : "#16a34a",
            cursor:
              liveValidEntriesCount === 0 || isOutputLocked || isCreatingDailyOrders
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isCreatingDailyOrders
            ? "Saving Orders..."
            : isOutputLocked
            ? "Output Locked"
            : `Confirm Output (${liveValidEntriesCount})`}
        </button>

        <button
          onClick={handleUnlockOutput}
          disabled={!isOutputLocked}
          style={{
            ...styles.primaryButton,
            backgroundColor: !isOutputLocked ? "#64748b" : "#ef4444",
            cursor: !isOutputLocked ? "not-allowed" : "pointer",
          }}
        >
          Unlock Output
        </button>
      </PageActionBar>

      <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
        <h2 style={{ marginBottom: "10px" }}>
          Confirmed Output ({confirmedEntries.length})
        </h2>

        {confirmedEntries.length === 0 ? (
          <div style={styles.emptyState}>No confirmed entries ready yet.</div>
        ) : (
          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: "12px",
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
                  padding: "10px 12px",
                  borderBottom: "1px solid #1f2937",
                  backgroundColor: "rgba(15, 23, 42, 0.76)",
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

      <div style={{ ...styles.darkPanel, marginBottom: "18px" }}>
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
            ...styles.input,
            minHeight: "220px",
            resize: "vertical",
          }}
        />
      </div>

      <PageActionBar marginBottom="0">
        <button
          onClick={handleCopyFinalText}
          disabled={confirmedEntries.length === 0}
          style={{
            ...styles.primaryButton,
            backgroundColor: confirmedEntries.length === 0 ? "#64748b" : "#16a34a",
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
            backgroundColor: automationPayload.length === 0 ? "#64748b" : "#7c3aed",
            cursor: automationPayload.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Copy Automation Payload
        </button>

        

        <button
          onClick={handleSendDailyOrderToBot}
          style={{
            ...styles.primaryButton,
            backgroundColor: readyDailyOrdersCount > 0 ? "#00b894" : "#64748b",
          }}
        >
          Send Daily Order To Bot (Ready: {readyDailyOrdersCount})
        </button>
      </PageActionBar>
    </div>
  );
}

export default PhotoPage;
