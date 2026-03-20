import { useEffect, useMemo, useRef, useState } from "react";
import StockTakePage from "./Pages/StockTakePage";
import ReviewPage from "./Pages/ReviewPage";
import SupplierOrderReviewPage from "./Pages/SupplierOrderReviewPage";
import StockVoicePage from "./Pages/StockVoicePage";
import PhotoPage from "./Pages/PhotoPage";
import AutomationJobsPage from "./Pages/AutomationJobsPage";
import DailyOrderExecutionPage from "./Pages/DailyOrderExecutionPage";
import InvoiceIntakePage from "./Pages/InvoiceIntakePage";
import InvoiceQueuePage from "./Pages/InvoiceQueuePage";
import { PAGE_IDS } from "./constants/pages";
import { useStockTake } from "./hooks/useStockTake";
import {
  loadVoiceData,
  saveVoiceData,
  clearVoiceData,
  getInitialVoiceData,
} from "./utils/storage";

const SIDEBAR_PAGES = [
  { id: PAGE_IDS.STOCK, label: "Stock Take" },
  { id: PAGE_IDS.VOICE, label: "Stock Voice" },
  { id: PAGE_IDS.REVIEW, label: "Review" },
  { id: PAGE_IDS.PHOTO, label: "Photo Order" },
  { id: PAGE_IDS.INVOICE_INTAKE, label: "Invoice Intake" },
  { id: PAGE_IDS.INVOICE_QUEUE, label: "Invoice Queue" },
  { id: PAGE_IDS.AUTOMATION, label: "Automation Jobs" },
  { id: PAGE_IDS.DAILY_ORDER_EXECUTION, label: "Daily Execution" },
  { id: PAGE_IDS.SUPPLIER_REVIEW, label: "History Orders" },
];

function App() {
  const [currentPage, setCurrentPage] = useState(PAGE_IDS.STOCK);
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
    setCurrentPage(PAGE_IDS.STOCK);
  }

  function handleSidebarNavigation(nextPageId) {
    if (nextPageId === currentPage) return;

    if (currentPage === PAGE_IDS.VOICE && isListening) {
      alert("Stop listening before navigating away from Stock Voice.");
      return;
    }

    setCurrentPage(nextPageId);
  }

  function renderCurrentPage() {
    if (currentPage === PAGE_IDS.STOCK) {
      return (
        <StockTakePage
          filledItems={filledItems}
          items={items}
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
          groupedItems={groupedItems}
          quantities={quantities}
          inputRefs={inputRefs}
          handleQuantityChange={handleQuantityChange}
          voiceFilledItems={voiceFilledItems}
        />
      );
    }

    if (currentPage === PAGE_IDS.REVIEW) {
      return (
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
      );
    }

    if (currentPage === PAGE_IDS.SUPPLIER_REVIEW) {
      return (
        <SupplierOrderReviewPage
          suggestedOrder={suggestedOrder}
          setCurrentPage={setCurrentPage}
        />
      );
    }

    if (currentPage === PAGE_IDS.VOICE) {
      return (
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
      );
    }

    if (currentPage === PAGE_IDS.PHOTO) {
      return <PhotoPage items={items} setCurrentPage={setCurrentPage} />;
    }

    if (currentPage === PAGE_IDS.INVOICE_INTAKE) {
      return <InvoiceIntakePage />;
    }

    if (currentPage === PAGE_IDS.INVOICE_QUEUE) {
      return <InvoiceQueuePage />;
    }

    if (currentPage === PAGE_IDS.AUTOMATION) {
      return <AutomationJobsPage />;
    }

    if (currentPage === PAGE_IDS.DAILY_ORDER_EXECUTION) {
      return <DailyOrderExecutionPage />;
    }

    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 10% 0%, #17394f 0%, #0b1220 30%, #070d18 100%)",
        color: "#e2e8f0",
        padding: "16px",
        fontFamily: "'Segoe UI', 'Trebuchet MS', sans-serif",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "250px minmax(0, 1fr)",
          gap: "16px",
          minHeight: "calc(100vh - 32px)",
        }}
      >
        <aside
          className="dashboard-sidebar"
          style={{
            position: "sticky",
            top: "16px",
            alignSelf: "start",
            height: "calc(100vh - 32px)",
            borderRadius: "12px",
            border: "1px solid #1f4d4a",
            background:
              "linear-gradient(180deg, rgba(9,64,63,0.98) 0%, rgba(8,39,51,0.98) 100%)",
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
          }}
        >
          <div style={{ marginBottom: "10px", padding: "2px 6px" }}>
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#9ce2d7",
              }}
            >
              SmartOps
            </div>
            <div
              style={{
                marginTop: "2px",
                fontSize: "24px",
                lineHeight: 1,
                fontWeight: 700,
                color: "#f8fafc",
              }}
            >
              Dashboard
            </div>
          </div>

          <div className="dashboard-sidebar-nav" style={{ display: "grid", gap: "4px" }}>
            {SIDEBAR_PAGES.map((page) => {
              const isActive = page.id === currentPage;

              return (
                <button
                  key={page.id}
                  className={`dashboard-sidebar-nav-item${isActive ? " is-active" : ""}`}
                  onClick={() => handleSidebarNavigation(page.id)}
                >
                  <span style={{ fontSize: "14px", fontWeight: isActive ? 700 : 600 }}>
                    {page.label}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main
          style={{
            minWidth: 0,
            borderRadius: "14px",
            border: "1px solid #24344d",
            backgroundColor: "#0b1220",
            padding: "14px",
            boxShadow: "0 16px 30px rgba(0, 0, 0, 0.28)",
          }}
        >
          <div
            style={{
              borderRadius: "12px",
              border: "1px solid #24344d",
              backgroundColor: "#0f172a",
              padding: "14px",
            }}
          >
            {renderCurrentPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
