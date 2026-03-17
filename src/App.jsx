import { useEffect, useMemo, useRef, useState } from "react";
import TopSummary from "./Components/TopSummary";
import StockTakeTable from "./Components/StockTakeTable";
import ReviewPage from "./Components/ReviewPage";
import StockVoicePage from "./Components/StockVoicePage";
import PhotoPage from "./Components/PhotoPage";
import AutomationJobsPage from "./Components/AutomationJobsPage";
import { useStockTake } from "./hooks/useStockTake";
import {
  loadVoiceData,
  saveVoiceData,
  clearVoiceData,
  getInitialVoiceData,
} from "./utils/storage";

function App() {
  const [currentPage, setCurrentPage] = useState("stock");
  const [search, setSearch] = useState("");
  const inputRefs = useRef([]);

  const initialVoiceData = useMemo(() => loadVoiceData(), []);

  const [selectedArea, setSelectedArea] = useState(
    initialVoiceData.selectedArea || ""
  );
  const [isListening, setIsListening] = useState(false);
  const [transcriptLines, setTranscriptLines] = useState(
    initialVoiceData.transcriptLines || []
  );
  const [voiceEntriesByArea, setVoiceEntriesByArea] = useState(
    initialVoiceData.voiceEntriesByArea || {}
  );
  const [usedAreasOrder, setUsedAreasOrder] = useState(
    initialVoiceData.usedAreasOrder || []
  );

  const [autoApplyMode, setAutoApplyMode] = useState(false);
  const [voiceToast, setVoiceToast] = useState("");

  const {
    items,
    quantities,
    lastSaved,
    filledItems,
    missingItems,
    progress,
    okCount,
    criticalCount,
    lowCount,
    checkCount,
    groupedItems,
    suggestedOrder,
    handleQuantityChange,
    handleReset,
    handleCopyOrder,
    handleCopyTable,
    applyVoiceEntries,
    applySingleVoiceEntry,
    voiceFilledItems,
  } = useStockTake();

  useEffect(() => {
    saveVoiceData({
      selectedArea,
      transcriptLines,
      voiceEntriesByArea,
      usedAreasOrder,
    });
  }, [selectedArea, transcriptLines, voiceEntriesByArea, usedAreasOrder]);

  const areas = useMemo(() => {
    return [...new Set(items.map((item) => item.area))];
  }, [items]);

  function clearVoiceSession() {
    const emptyVoiceData = getInitialVoiceData();

    setSelectedArea(emptyVoiceData.selectedArea);
    setTranscriptLines(emptyVoiceData.transcriptLines);
    setVoiceEntriesByArea(emptyVoiceData.voiceEntriesByArea);
    setUsedAreasOrder(emptyVoiceData.usedAreasOrder);

    clearVoiceData();
  }

  function handleBackToStock() {
    setIsListening(false);
    setCurrentPage("stock");
  }

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        width: "100%",
        maxWidth: "1460px",
        margin: "0 auto",
      }}
    >
      {currentPage === "stock" && (
        <>
          <TopSummary
            filledItems={filledItems}
            totalItems={items.length}
            criticalCount={criticalCount}
            lowCount={lowCount}
            checkCount={checkCount}
            progress={progress}
            lastSaved={lastSaved}
            missingItems={missingItems}
            search={search}
            setSearch={setSearch}
            handleReset={handleReset}
            setCurrentPage={setCurrentPage}
          />

          <StockTakeTable
            groupedItems={groupedItems}
            quantities={quantities}
            search={search}
            inputRefs={inputRefs}
            handleQuantityChange={handleQuantityChange}
            voiceFilledItems={voiceFilledItems}
          />
        </>
      )}

      {currentPage === "review" && (
        <ReviewPage
          items={items}
          quantities={quantities}
          okCount={okCount}
          lowCount={lowCount}
          criticalCount={criticalCount}
          checkCount={checkCount}
          suggestedOrder={suggestedOrder}
          handleCopyOrder={handleCopyOrder}
          handleCopyTable={handleCopyTable}
          setCurrentPage={setCurrentPage}
          voiceFilledItems={voiceFilledItems}
        />
      )}

      {currentPage === "voice" && (
        <StockVoicePage
          items={items}
          areas={areas}
          selectedArea={selectedArea}
          setSelectedArea={setSelectedArea}
          isListening={isListening}
          setIsListening={setIsListening}
          transcriptLines={transcriptLines}
          setTranscriptLines={setTranscriptLines}
          voiceEntriesByArea={voiceEntriesByArea}
          setVoiceEntriesByArea={setVoiceEntriesByArea}
          usedAreasOrder={usedAreasOrder}
          setUsedAreasOrder={setUsedAreasOrder}
          handleBackToStock={handleBackToStock}
          applyVoiceEntries={applyVoiceEntries}
          applySingleVoiceEntry={applySingleVoiceEntry}
          clearVoiceSession={clearVoiceSession}
          autoApplyMode={autoApplyMode}
          setAutoApplyMode={setAutoApplyMode}
          voiceToast={voiceToast}
          setVoiceToast={setVoiceToast}
        />
      )}

      {currentPage === "photo" && (
        <PhotoPage items={items} setCurrentPage={setCurrentPage} />
      )}

      {currentPage === "automation" && (
        <AutomationJobsPage setCurrentPage={setCurrentPage} />
      )}
    </div>
  );
}

export default App;