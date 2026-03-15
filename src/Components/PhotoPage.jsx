import { useEffect, useMemo, useState } from "react";
import {
  extractTextFromImage,
  getMockPhotoText,
  getPhotoResultText,
  parsePhotoTextToEntries,
} from "../utils/photoHelpers";

function PhotoPage({ items, setCurrentPage }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawExtractedText, setRawExtractedText] = useState("");
  const [photoEntries, setPhotoEntries] = useState([]);
  const [openSearchKey, setOpenSearchKey] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [ocrError, setOcrError] = useState("");

  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  function getStatusColor(status) {
    if (status === "Matched") return "#4CAF50";
    if (status === "Fuzzy Match") return "#ff9800";
    if (status === "Not Found") return "#ff4d4d";
    return "#999";
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
    setPhotoEntries([]);
    setOcrError("");
  }

  function handleProcessText() {
    const parsedEntries = parsePhotoTextToEntries(rawExtractedText, items);
    setPhotoEntries(parsedEntries);
  }

  async function handleProcessImage() {
    if (!selectedFile) {
      setOcrError("Select an image first.");
      return;
    }

    try {
      setIsProcessingImage(true);
      setOcrError("");

      const extractedText = await extractTextFromImage(selectedFile);
      setRawExtractedText(extractedText);

      const parsedEntries = parsePhotoTextToEntries(extractedText, items);
      setPhotoEntries(parsedEntries);
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

      const mockText = getMockPhotoText();
      setRawExtractedText(mockText);

      const parsedEntries = parsePhotoTextToEntries(mockText, items);
      setPhotoEntries(parsedEntries);
    } catch (error) {
      setOcrError("Failed to generate mock AI result.");
      console.error("Mock AI error:", error);
    }
  }

  function handleDeleteEntry(indexToRemove) {
    setPhotoEntries((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  function handleEditQuantity(indexToUpdate, newQuantity) {
    setPhotoEntries((prev) =>
      prev.map((entry, index) =>
        index === indexToUpdate
          ? {
              ...entry,
              quantity: newQuantity === "" ? "" : Math.max(Number(newQuantity), 0),
            }
          : entry
      )
    );
  }

  function handleMatchSearchChange(indexToUpdate, newSearch) {
    setPhotoEntries((prev) =>
      prev.map((entry, index) =>
        index === indexToUpdate
          ? {
              ...entry,
              matchSearch: newSearch,
              matchedItem: newSearch === "" ? "-" : entry.matchedItem,
              matchedItemId: newSearch === "" ? null : entry.matchedItemId,
              status: newSearch === "" ? "Not Found" : entry.status,
            }
          : entry
      )
    );
  }

  function handleSelectMatchedItem(indexToUpdate, item) {
    setPhotoEntries((prev) =>
      prev.map((entry, index) =>
        index === indexToUpdate
          ? {
              ...entry,
              matchedItem: item.name,
              matchedItemId: item.id,
              status: "Matched",
              matchSearch: item.name,
            }
          : entry
      )
    );
  }

  async function handleCopyFinalText() {
    try {
      const text = getPhotoResultText(photoEntries);
      await navigator.clipboard.writeText(text);
      alert("Final text copied!");
    } catch {
      alert("Failed to copy final text.");
    }
  }

  const searchableItems = useMemo(() => items.slice(), [items]);

  return (
    <div>
      <h1>Photo Order</h1>

      <button
        onClick={() => setCurrentPage("stock")}
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
            padding: "12px 20px",
            backgroundColor: isProcessingImage ? "#888" : "#8e44ad",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: isProcessingImage ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          Process Mock AI
        </button>

        <button
          onClick={handleProcessImage}
          disabled={!selectedFile || isProcessingImage}
          style={{
            padding: "12px 20px",
            backgroundColor: !selectedFile || isProcessingImage ? "#888" : "#7b3ff2",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: !selectedFile || isProcessingImage ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {isProcessingImage ? "Processing Image..." : "Process Image"}
        </button>

        <button
          onClick={handleProcessText}
          disabled={isProcessingImage}
          style={{
            padding: "12px 20px",
            backgroundColor: isProcessingImage ? "#888" : "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: isProcessingImage ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          Process Text
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
          onChange={(e) => setRawExtractedText(e.target.value)}
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

      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ marginBottom: "10px" }}>Detected Entries</h2>

        {photoEntries.length === 0 ? (
          <div
            style={{
              border: "1px solid #555",
              borderRadius: "8px",
              padding: "14px",
              backgroundColor: "#1f1f1f",
              color: "#999",
            }}
          >
            No detected entries yet.
          </div>
        ) : (
          <>
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
              <div>Detected</div>
              <div>Quantity</div>
              <div>Matched Item</div>
              <div>Status</div>
              <div>Action</div>
            </div>

            {photoEntries.map((entry, index) => {
              const searchKey = `photo-${index}`;

              const filteredItems = searchableItems
                .filter((item) =>
                  !entry.matchSearch
                    ? true
                    : item.name.toLowerCase().includes(entry.matchSearch.toLowerCase())
                )
                .slice(0, 8);

              return (
                <div
                  key={`${entry.rawLine}-${index}`}
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
                    onChange={(e) => handleEditQuantity(index, e.target.value)}
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
                        handleMatchSearchChange(index, e.target.value);
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
                          <div style={{ padding: "8px 10px", color: "#999" }}>
                            No items found
                          </div>
                        ) : (
                          filteredItems.map((item) => (
                            <div
                              key={item.id}
                              onMouseDown={() => {
                                handleSelectMatchedItem(index, item);
                                setOpenSearchKey(null);
                              }}
                              style={{
                                padding: "8px 10px",
                                cursor: "pointer",
                                borderBottom: "1px solid #444",
                                color: "white",
                              }}
                            >
                              {item.name} — {item.area}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      color: getStatusColor(entry.status),
                      fontWeight: "bold",
                    }}
                  >
                    {entry.status}
                  </div>

                  <button
                    onClick={() => handleDeleteEntry(index)}
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
          </>
        )}
      </div>

      <button
        onClick={handleCopyFinalText}
        disabled={photoEntries.length === 0}
        style={{
          padding: "12px 20px",
          backgroundColor: photoEntries.length === 0 ? "#888" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: photoEntries.length === 0 ? "not-allowed" : "pointer",
          fontWeight: "bold",
        }}
      >
        Copy Final Text
      </button>
    </div>
  );
}

export default PhotoPage;