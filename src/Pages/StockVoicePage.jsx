import { styles } from "../utils/uiStyles";
import { getFilteredItemsForEntry } from "../utils/entries";
import EditableEntrySection from "../components/EditableEntrySection";
import NoticePanel from "../components/NoticePanel";
import { useVoiceSession } from "../hooks/useVoiceSession";

function StockVoicePage({
  areas,
  selectedArea,
  setSelectedArea,
  isListening,
  setIsListening,
  transcriptLines,
  setTranscriptLines,
  voiceEntriesByArea,
  setVoiceEntriesByArea,
  usedAreasOrder,
  setUsedAreasOrder,
  handleBackToStock,
  items,
  applyVoiceEntries,
  applySingleVoiceEntry,
  clearVoiceSession,
  autoApplyMode,
  setAutoApplyMode,
  voiceToast,
  setVoiceToast,
}) {
  const isAreaSelected = !!selectedArea;
  const voiceButtonLabel = isListening ? "Stop Listening" : "Start Listening";

  const {
    openSearchKey,
    setOpenSearchKey,
    handleEditEntryQuantity,
    handleMatchSearchChange,
    handleSelectMatchedItem,
    handleConfirmAndApply,
    handleVoiceToggle,
    handleBackClick,
    handleDeleteEntry,
  } = useVoiceSession({
    selectedArea,
    isListening,
    setIsListening,
    setTranscriptLines,
    voiceEntriesByArea,
    setVoiceEntriesByArea,
    setUsedAreasOrder,
    handleBackToStock,
    items,
    applyVoiceEntries,
    applySingleVoiceEntry,
    clearVoiceSession,
    autoApplyMode,
    setVoiceToast,
  });

  return (
    <div>
      <h1>Stock Voice</h1>

      {voiceToast && (
        <NoticePanel
          backgroundColor="#4CAF50"
          border="1px solid #4CAF50"
          marginBottom="16px"
          padding="10px 14px"
        >
          {voiceToast}
        </NoticePanel>
      )}

      <button onClick={handleBackClick} style={styles.backButton}>
        Back to Stock Take
      </button>

      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          Select Area
        </label>

        <select
          value={selectedArea}
          disabled={isListening}
          onChange={(e) => setSelectedArea(e.target.value)}
          style={{
            padding: "10px 12px",
            width: "260px",
            borderRadius: "8px",
            border: "1px solid #cccccc",
            fontSize: "14px",
            backgroundColor: isListening ? "#e0e0e0" : "white",
            color: "#111",
            cursor: isListening ? "not-allowed" : "pointer",
          }}
        >
          <option value="" disabled>
            Select an area
          </option>

          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "white",
            fontWeight: "bold",
          }}
        >
          <input
            type="checkbox"
            checked={autoApplyMode}
            onChange={(e) => setAutoApplyMode(e.target.checked)}
            disabled={isListening}
          />
          Auto Apply Mode
        </label>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <button
          disabled={!isAreaSelected}
          onClick={handleVoiceToggle}
          style={{
            ...styles.primaryButton,
            backgroundColor: !isAreaSelected
              ? "#999"
              : isListening
              ? "#d9534f"
              : "#2196F3",
            cursor: !isAreaSelected ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          {voiceButtonLabel}
        </button>

        {selectedArea && (
          <span style={{ color: "#aaa", fontSize: "14px" }}>
            Current area: <strong style={{ color: "white" }}>{selectedArea}</strong>
          </span>
        )}
      </div>

      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ marginBottom: "10px" }}>Captured Transcription</h2>

        <div
          style={{
            ...styles.darkPanel,
            minHeight: "120px",
          }}
        >
          {transcriptLines.length === 0 ? (
            <p style={{ color: "#999", margin: 0 }}>
              No voice input captured yet.
            </p>
          ) : (
            transcriptLines.map((line, index) => (
              <p
                key={`${line}-${index}`}
                style={{
                  margin: "0 0 8px 0",
                  color: "white",
                }}
              >
                {line}
              </p>
            ))
          )}
        </div>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ marginBottom: "10px" }}>Preview</h2>

        {usedAreasOrder.length === 0 ? (
          <div style={styles.emptyState}>No preview entries yet.</div>
        ) : (
          usedAreasOrder.map((area) => {
            const entries = voiceEntriesByArea[area] || [];
            const areaItems = items.filter((item) => item.area === area);

            return (
              <EditableEntrySection
                key={area}
                title={area}
                entries={entries}
                searchKeyPrefix={area}
                openSearchKey={openSearchKey}
                setOpenSearchKey={setOpenSearchKey}
                getFilteredItems={(entry) =>
                  getFilteredItemsForEntry(areaItems, entry)
                }
                onEditQuantity={(entryIndex, value) =>
                  handleEditEntryQuantity(area, entryIndex, value)
                }
                onMatchSearchChange={(entryIndex, value) =>
                  handleMatchSearchChange(area, entryIndex, value)
                }
                onSelectMatchedItem={(entryIndex, item) =>
                  handleSelectMatchedItem(area, entryIndex, item)
                }
                onDelete={(entryIndex) => handleDeleteEntry(area, entryIndex)}
              />
            );
          })
        )}
      </div>

      <button
        onClick={handleConfirmAndApply}
        style={{
          ...styles.primaryButton,
          backgroundColor: "#4CAF50",
        }}
      >
        Confirm and Apply
      </button>
    </div>
  );
}

export default StockVoicePage;
