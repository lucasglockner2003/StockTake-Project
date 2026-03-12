function StockVoicePage({
  areas,
  selectedArea,
  setSelectedArea,
  isListening,
  setIsListening,
  transcriptLines,
  voiceEntries,
  setCurrentPage,
  handleBackToStock,
}) {
  const isAreaSelected = selectedArea !== "";
  const voiceButtonLabel = isListening ? "Stop Listening" : "Start Listening";

  return (
    <div>
      <h1>Stock Voice</h1>

      <button
        onClick={handleBackToStock}
        style={{padding: "10px 16px", backgroundColor: "#ccc", color: "#111", border: "none", borderRadius: "8px",
          cursor: "pointer", fontWeight: "bold", marginBottom: "20px",}}>
        Back to Stock Take
      </button>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px",}}>
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
          {areas.map((area) => (<option key={area} value={area}> {area}</option>))}

        </select>
      </div>

      <div style={{ marginBottom: "24px" }}>
            <button
                disabled={!isAreaSelected}
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.7fr 1fr 0.8fr",
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
        </div>

        {voiceEntries.length === 0 ? (
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
          voiceEntries.map((entry, index) => (
            <div
              key={`${entry.spokenName}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.7fr 1fr 0.8fr",
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
            </div>
          ))
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