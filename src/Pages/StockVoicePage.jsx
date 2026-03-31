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

  const {
    openSearchKey,
    setOpenSearchKey,
    handleEditEntryQuantity,
    handleMatchSearchChange,
    handleSelectMatchedItem,
    handleConfirmAndApply,
    handleVoiceToggle,
    handleDeleteEntry,
    liveTranscript,
    voiceError,
    voiceStatusMessage,
    isInitializingRecognition,
    isSpeechSupported,
    isSecureVoiceContext,
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

  const voiceButtonLabel = isInitializingRecognition
    ? "Starting..."
    : isListening
    ? "Stop Listening"
    : "Start Listening";

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "30px", fontWeight: 600 }}>Stock Voice</h1>

      {!isSpeechSupported && (
        <NoticePanel
          backgroundColor="rgba(127, 29, 29, 0.18)"
          border="1px solid rgba(239, 68, 68, 0.24)"
          color="#fca5a5"
        >
          SpeechRecognition is not available in this browser. Use Chrome on localhost or HTTPS.
        </NoticePanel>
      )}

      {isSpeechSupported && !isSecureVoiceContext && (
        <NoticePanel
          backgroundColor="rgba(245, 158, 11, 0.14)"
          border="1px solid rgba(245, 158, 11, 0.24)"
          color="#fcd34d"
        >
          Voice capture requires HTTPS or localhost. Open the frontend on `localhost:5173`
          or another secure origin.
        </NoticePanel>
      )}

      {voiceToast && (
        <NoticePanel
          backgroundColor="rgba(34, 197, 94, 0.16)"
          border="1px solid rgba(34, 197, 94, 0.24)"
          color="#86efac"
          marginBottom="16px"
          padding="10px 14px"
        >
          {voiceToast}
        </NoticePanel>
      )}

      {voiceError && (
        <NoticePanel
          backgroundColor="rgba(127, 29, 29, 0.18)"
          border="1px solid rgba(239, 68, 68, 0.24)"
          color="#fca5a5"
          marginBottom="16px"
        >
          {voiceError}
        </NoticePanel>
      )}

      {voiceStatusMessage && (
        <NoticePanel
          backgroundColor="rgba(37, 99, 235, 0.12)"
          border="1px solid rgba(59, 130, 246, 0.22)"
          color="#bfdbfe"
          marginBottom="16px"
        >
          {isListening || isInitializingRecognition ? (
            <span className="saas-running-indicator">
              <span className="saas-spinner" />
              <span>{voiceStatusMessage}</span>
            </span>
          ) : (
            voiceStatusMessage
          )}
          {liveTranscript ? (
            <div style={{ marginTop: "10px", color: "#e5e7eb", fontWeight: 500 }}>
              Interim transcript: {liveTranscript}
            </div>
          ) : null}
        </NoticePanel>
      )}

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
          disabled={isListening || isInitializingRecognition}
          onChange={(e) => setSelectedArea(e.target.value)}
          style={{
            ...styles.input,
            width: "260px",
            cursor: isListening || isInitializingRecognition ? "not-allowed" : "pointer",
            opacity: isListening || isInitializingRecognition ? 0.72 : 1,
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
            color: "#e5e7eb",
            fontWeight: 600,
          }}
        >
          <input
            type="checkbox"
            checked={autoApplyMode}
            onChange={(e) => setAutoApplyMode(e.target.checked)}
            disabled={isListening || isInitializingRecognition}
          />
          Auto Apply Mode
        </label>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <button
          disabled={!isAreaSelected || isInitializingRecognition}
          onClick={handleVoiceToggle}
          style={{
            ...styles.primaryButton,
            backgroundColor: !isAreaSelected || isInitializingRecognition
              ? "#64748b"
              : isListening
              ? "#ef4444"
              : "#2563eb",
            cursor:
              !isAreaSelected || isInitializingRecognition ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          {voiceButtonLabel}
        </button>

        {selectedArea && (
          <span style={{ color: "#94a3b8", fontSize: "14px" }}>
            Current area: <strong style={{ color: "#f8fafc" }}>{selectedArea}</strong>
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
            <p style={{ color: "#94a3b8", margin: 0 }}>
              No voice input captured yet.
            </p>
          ) : (
            transcriptLines.map((line, index) => (
              <p
                key={`${line}-${index}`}
                style={{
                  margin: "0 0 8px 0",
                  color: "#e5e7eb",
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
          backgroundColor: "#16a34a",
        }}
      >
        Confirm and Apply
      </button>
    </div>
  );
}

export default StockVoicePage;
