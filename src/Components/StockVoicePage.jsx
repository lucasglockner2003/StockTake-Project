import { useRef, useState } from "react";
import { createSpeechRecognition } from "../utils/voiceHelpers";
import { parseVoiceLine } from "../utils/parseHelpers";
import { findBestMatchInArea } from "../utils/matchHelpers";

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
  const [openSearchKey, setOpenSearchKey] = useState(null);

  function handleEditEntryQuantity(areaName, indexToUpdate, newQuantity) {
    setVoiceEntriesByArea((prev) => {
      const updatedEntries = [...(prev[areaName] || [])];

      const parsedQuantity =
        newQuantity === "" ? "" : Math.max(Number(newQuantity), 0);

      updatedEntries[indexToUpdate] = {
        ...updatedEntries[indexToUpdate],
        quantity: parsedQuantity,
      };

      return {
        ...prev,
        [areaName]: updatedEntries,
      };
    });
  }

  function handleMatchSearchChange(areaName, indexToUpdate, newSearch) {
    setVoiceEntriesByArea((prev) => {
      const updatedEntries = [...(prev[areaName] || [])];
      const currentEntry = updatedEntries[indexToUpdate];

      updatedEntries[indexToUpdate] = {
        ...currentEntry,
        matchSearch: newSearch,
        matchedItem: newSearch === "" ? "-" : currentEntry.matchedItem,
        matchedItemId: newSearch === "" ? null : currentEntry.matchedItemId,
        status: newSearch === "" ? "Not Found" : currentEntry.status,
      };

      return {
        ...prev,
        [areaName]: updatedEntries,
      };
    });
  }

  function handleSelectMatchedItem(areaName, indexToUpdate, item) {
    setVoiceEntriesByArea((prev) => {
      const updatedEntries = [...(prev[areaName] || [])];

      updatedEntries[indexToUpdate] = {
        ...updatedEntries[indexToUpdate],
        matchedItem: item.name,
        matchedItemId: item.id,
        status: "Matched",
        matchSearch: item.name,
      };

      return {
        ...prev,
        [areaName]: updatedEntries,
      };
    });
  }

  function getVoiceStatusColor(status) {
    if (status === "Matched") return "#4CAF50";
    if (status === "Fuzzy Match") return "#ff9800";
    if (status === "Not Found") return "#ff4d4d";
    return "#999";
  }

  function showVoiceToast(message) {
    setVoiceToast(message);

    setTimeout(() => {
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

            const newEntry = {
              spokenName: parsedLine.spokenName,
              quantity: parsedLine.quantity,
              matchedItem: matchResult.matchedItem
                ? matchResult.matchedItem.name
                : "-",
              matchedItemId: matchResult.matchedItem
                ? matchResult.matchedItem.id
                : null,
              status:
                matchResult.matchType === "exact"
                  ? "Matched"
                  : matchResult.matchType === "fuzzy"
                  ? "Fuzzy Match"
                  : "Not Found",
              matchSearch: matchResult.matchedItem
                ? matchResult.matchedItem.name
                : "",
            };

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

    handleBackToStock();
  }

  function handleDeleteEntry(areaName, indexToRemove) {
    setVoiceEntriesByArea((prev) => {
      const updatedAreaEntries = (prev[areaName] || []).filter(
        (_, index) => index !== indexToRemove
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
      const remainingEntries = currentEntries.filter(
        (_, index) => index !== indexToRemove
      );

      if (remainingEntries.length > 0) return prev;

      return prev.filter((area) => area !== areaName);
    });

    setOpenSearchKey((prev) => {
      const deletingKey = `${areaName}-${indexToRemove}`;
      return prev === deletingKey ? null : prev;
    });
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

      <button
        onClick={handleBackClick}
        style={{
          padding: "10px 16px",
          backgroundColor: "#ccc",
          color: "#111",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          marginBottom: "20px",
        }}
      >
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
            padding: "12px 20px",
            backgroundColor: !isAreaSelected
              ? "#999"
              : isListening
              ? "#d9534f"
              : "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: !isAreaSelected ? "not-allowed" : "pointer",
            fontWeight: "bold",
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
            border: "1px solid #555",
            borderRadius: "8px",
            padding: "14px",
            minHeight: "120px",
            backgroundColor: "#1f1f1f",
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
          <div
            style={{
              border: "1px solid #555",
              borderRadius: "8px",
              padding: "14px",
              backgroundColor: "#1f1f1f",
              color: "#999",
            }}
          >
            No preview entries yet.
          </div>
        ) : (
          usedAreasOrder.map((area) => {
            const entries = voiceEntriesByArea[area] || [];

            return (
              <div key={area} style={{ marginBottom: "24px" }}>
                <h3 style={{ marginBottom: "10px" }}>{area}</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.7fr 1fr 0.8fr 100px",
                    gap: "8px",
                    alignItems: "center",
                    padding: "8px 10px",
                    marginBottom: "8px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#aaa",
                    borderBottom: "1px solid #444",
                  }}
                >
                  <div>Spoken</div>
                  <div>Quantity</div>
                  <div>Matched Item</div>
                  <div>Status</div>
                  <div>Action</div>
                </div>

                {entries.map((entry, index) => {
                  const searchKey = `${area}-${index}`;

                  const filteredItems = items
                    .filter((item) => item.area === area)
                    .filter((item) =>
                      !entry.matchSearch
                        ? true
                        : item.name
                            .toLowerCase()
                            .includes(entry.matchSearch.toLowerCase())
                    )
                    .slice(0, 8);

                  return (
                    <div
                      key={`${area}-${entry.spokenName}-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 0.7fr 1fr 0.8fr 100px",
                        gap: "8px",
                        alignItems: "center",
                        padding: "10px",
                        marginBottom: "6px",
                        border: "1px solid #555",
                        borderRadius: "8px",
                      }}
                    >
                      <div>{entry.spokenName}</div>

                      <input
                        type="number"
                        step="0.1"
                        value={entry.quantity === "" ? "" : entry.quantity}
                        onChange={(e) =>
                          handleEditEntryQuantity(area, index, e.target.value)
                        }
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: "1px solid #ccc",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />

                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          value={entry.matchSearch || ""}
                          onFocus={() => setOpenSearchKey(searchKey)}
                          onChange={(e) => {
                            handleMatchSearchChange(area, index, e.target.value);
                            setOpenSearchKey(searchKey);
                          }}
                          placeholder="Search item..."
                          style={{
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                            width: "100%",
                            boxSizing: "border-box",
                          }}
                        />

                        {openSearchKey === searchKey && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              backgroundColor: "#2a2a2a",
                              border: "1px solid #555",
                              borderRadius: "6px",
                              maxHeight: "160px",
                              overflowY: "auto",
                              zIndex: 20,
                              marginTop: "4px",
                            }}
                          >
                            {filteredItems.length === 0 ? (
                              <div
                                style={{
                                  padding: "8px 10px",
                                  color: "#999",
                                }}
                              >
                                No items found
                              </div>
                            ) : (
                              filteredItems.map((item) => (
                                <div
                                  key={item.id}
                                  onMouseDown={() => {
                                    handleSelectMatchedItem(area, index, item);
                                    setOpenSearchKey(null);
                                  }}
                                  style={{
                                    padding: "8px 10px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid #444",
                                    color: "white",
                                  }}
                                >
                                  {item.name}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          color: getVoiceStatusColor(entry.status),
                          fontWeight: "bold",
                        }}
                      >
                        {entry.status}
                      </div>

                      <button
                        onClick={() => handleDeleteEntry(area, index)}
                        style={{
                          padding: "8px 10px",
                          backgroundColor: "#d9534f",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={handleConfirmAndApply}
        style={{
          padding: "12px 20px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Confirm and Apply
      </button>
    </div>
  );
}

export default StockVoicePage;