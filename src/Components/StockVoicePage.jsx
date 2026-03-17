import { useEffect, useRef, useState } from "react";
import { createSpeechRecognition } from "../utils/voiceHelpers";
import { parseVoiceLine } from "../utils/parseHelpers";
import { findBestMatchInArea } from "../utils/matchHelpers";
import { createMatchedEntryFromMatchResult } from "../utils/entryFactories";
import { styles } from "../utils/uiStyles";
import {
  updateEntryQuantity,
  updateEntryMatchSearch,
  selectEntryMatchedItem,
  deleteEntryAtIndex,
  clearOpenSearchKeyIfDeleted,
} from "../utils/entryHelpers";
import { getFilteredItemsForEntry } from "../utils/entrySearchHelpers";
import EditableEntrySection from "./EditableEntrySection";

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
  const recognitionRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const [openSearchKey, setOpenSearchKey] = useState(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  function handleEditEntryQuantity(areaName, indexToUpdate, newQuantity) {
    setVoiceEntriesByArea((prev) => ({
      ...prev,
      [areaName]: updateEntryQuantity(
        prev[areaName] || [],
        indexToUpdate,
        newQuantity
      ),
    }));
  }

  function handleMatchSearchChange(areaName, indexToUpdate, newSearch) {
    setVoiceEntriesByArea((prev) => ({
      ...prev,
      [areaName]: updateEntryMatchSearch(
        prev[areaName] || [],
        indexToUpdate,
        newSearch
      ),
    }));
  }

  function handleSelectMatchedItem(areaName, indexToUpdate, item) {
    setVoiceEntriesByArea((prev) => ({
      ...prev,
      [areaName]: selectEntryMatchedItem(
        prev[areaName] || [],
        indexToUpdate,
        item
      ),
    }));
  }

  function showVoiceToast(message) {
    setVoiceToast(message);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setVoiceToast("");
    }, 2000);
  }

  function handleConfirmAndApply() {
    if (isListening) {
      alert("Stop listening before applying voice entries.");
      return;
    }

    const hasEntries = Object.values(voiceEntriesByArea).some(
      (entries) => entries.length > 0
    );

    if (!hasEntries) {
      alert("There are no voice entries to apply.");
      return;
    }

    const hasInvalidQuantity = Object.values(voiceEntriesByArea).some((entries) =>
      entries.some(
        (entry) =>
          (entry.status === "Matched" || entry.status === "Fuzzy Match") &&
          (entry.quantity === "" ||
            entry.quantity === null ||
            entry.quantity === undefined)
      )
    );

    if (hasInvalidQuantity) {
      alert("Please fill in all quantities before applying.");
      return;
    }

    const confirmed = window.confirm(
      "Confirmar o envio das informações para o Stock Take?"
    );

    if (!confirmed) return;

    applyVoiceEntries(voiceEntriesByArea);
    clearVoiceSession();
    setOpenSearchKey(null);
    handleBackToStock();
  }

  function addVoiceEntryToArea(area, entry) {
    setVoiceEntriesByArea((prev) => {
      const existingAreaEntries = prev[area] || [];

      return {
        ...prev,
        [area]: [...existingAreaEntries, entry],
      };
    });

    setUsedAreasOrder((prev) => {
      if (prev.includes(area)) return prev;
      return [...prev, area];
    });
  }

  function handleVoiceToggle() {
    if (!isListening) {
      const recognition = createSpeechRecognition(
        (text) => {
          setTranscriptLines((prev) => [...prev, `[${selectedArea}] ${text}`]);

          const parsedLine = parseVoiceLine(text);

          if (parsedLine && selectedArea) {
            const matchResult = findBestMatchInArea(
              parsedLine.spokenName,
              selectedArea,
              items
            );

            const newEntry = createMatchedEntryFromMatchResult({
              rawLine: parsedLine.rawLine,
              spokenName: parsedLine.spokenName,
              quantity: parsedLine.quantity,
              matchResult,
              source: parsedLine.source || "voice",
            });

            addVoiceEntryToArea(selectedArea, newEntry);

            if (autoApplyMode) {
              const applied = applySingleVoiceEntry(newEntry);

              if (applied) {
                showVoiceToast(`${newEntry.matchedItem} updated`);
              }
            }
          }
        },
        () => {
          setIsListening(false);
        }
      );

      if (!recognition) return;

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      return;
    }

    recognitionRef.current?.stop();
    setIsListening(false);
  }

  function handleBackClick() {
    if (isListening) {
      const confirmed = window.confirm(
        "Voice capture is still running. Stop and go back?"
      );

      if (!confirmed) return;

      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setOpenSearchKey(null);
    handleBackToStock();
  }

  function handleDeleteEntry(areaName, indexToRemove) {
    setVoiceEntriesByArea((prev) => {
      const updatedAreaEntries = deleteEntryAtIndex(
        prev[areaName] || [],
        indexToRemove
      );
      const updated = { ...prev };

      if (updatedAreaEntries.length > 0) {
        updated[areaName] = updatedAreaEntries;
      } else {
        delete updated[areaName];
      }

      return updated;
    });

    setUsedAreasOrder((prev) => {
      const currentEntries = voiceEntriesByArea[areaName] || [];
      const remainingEntries = deleteEntryAtIndex(currentEntries, indexToRemove);

      if (remainingEntries.length > 0) return prev;

      return prev.filter((area) => area !== areaName);
    });

    setOpenSearchKey((prev) =>
      clearOpenSearchKeyIfDeleted(prev, `${areaName}-${indexToRemove}`)
    );
  }

  return (
    <div>
      <h1>Stock Voice</h1>

      {voiceToast && (
        <div
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "10px 14px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontWeight: "bold",
          }}
        >
          {voiceToast}
        </div>
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