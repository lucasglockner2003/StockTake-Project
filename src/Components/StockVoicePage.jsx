import { useRef } from "react";
import { createSpeechRecognition } from "../utils/voiceHelpers";
import { parseVoiceLine } from "../utils/parseHelpers";

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
}) {
  const isAreaSelected = !!selectedArea;
  const voiceButtonLabel = isListening ? "Stop Listening" : "Start Listening";
  const recognitionRef = useRef(null);

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
            addVoiceEntryToArea(selectedArea, {
              spokenName: parsedLine.spokenName,
              quantity: parsedLine.quantity,
              matchedItem: "-",
              status: "Pending Match",
            });
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

      const updated = {
        ...prev,
      };

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
  }

  return (
    <div>
      <h1>Stock Voice</h1>

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
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
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

                {entries.map((entry, index) => (
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
                    <div>{entry.quantity}</div>
                    <div>{entry.matchedItem}</div>
                    <div>{entry.status}</div>

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
                ))}
              </div>
            );
          })
        )}
      </div>

      <button
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