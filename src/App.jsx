import { useEffect, useMemo, useRef, useState } from "react";
import WorkspaceOverviewPage from "./Pages/WorkspaceOverviewPage";
import StockTakePage from "./Pages/StockTakePage";
import ReviewPage from "./Pages/ReviewPage";
import SupplierOrderReviewPage from "./Pages/SupplierOrderReviewPage";
import StockVoicePage from "./Pages/StockVoicePage";
import PhotoPage from "./Pages/PhotoPage";
import AutomationJobsPage from "./Pages/AutomationJobsPage";
import DailyOrderExecutionPage from "./Pages/DailyOrderExecutionPage";
import InvoiceIntakePage from "./Pages/InvoiceIntakePage";
import InvoiceQueuePage from "./Pages/InvoiceQueuePage";
import LoginPage from "./Pages/LoginPage";
import AccessDeniedPage from "./Pages/AccessDeniedPage";
import WorkspaceHeader from "./components/WorkspaceHeader";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import {
  canAccessPage,
  getAllowedPagesForRole,
  getDefaultPageForRole,
  getPageDefinition,
  getPageLabel,
} from "./constants/access-control";
import { PAGE_IDS } from "./constants/pages";
import { useAuth } from "./hooks/use-auth";
import { useStockTake } from "./hooks/useStockTake";
import { useWorkspaceOverview } from "./hooks/use-workspace-overview";
import {
  loadVoiceData,
  saveVoiceData,
  clearVoiceData,
  getInitialVoiceData,
} from "./utils/storage";

function App() {
  const { isAuthenticated, isReady, loading, logout, user } = useAuth();
  const [currentPage, setCurrentPage] = useState(PAGE_IDS.OVERVIEW);
  const [search, setSearch] = useState("");
  const [authNotice, setAuthNotice] = useState("");
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
    isLoading: isStockTakeLoading,
    isSaving: isStockTakeSaving,
    errorMessage: stockTakeErrorMessage,
  } = useStockTake({
    enabled: isAuthenticated && isReady,
  });

  useEffect(() => {
    saveVoiceData({
      selectedArea,
      transcriptLines,
      voiceEntriesByArea,
      usedAreasOrder,
    });
  }, [selectedArea, transcriptLines, voiceEntriesByArea, usedAreasOrder]);

  useEffect(() => {
    if (!authNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAuthNotice("");
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authNotice]);

  function clearVoiceSession() {
    const emptyVoiceData = getInitialVoiceData();

    setSelectedArea(emptyVoiceData.selectedArea);
    setTranscriptLines(emptyVoiceData.transcriptLines);
    setVoiceEntriesByArea(emptyVoiceData.voiceEntriesByArea);
    setUsedAreasOrder(emptyVoiceData.usedAreasOrder);

    clearVoiceData();
  }

  useEffect(() => {
    if (!isReady || isAuthenticated) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const emptyVoiceData = getInitialVoiceData();

      setSelectedArea(emptyVoiceData.selectedArea);
      setTranscriptLines(emptyVoiceData.transcriptLines);
      setVoiceEntriesByArea(emptyVoiceData.voiceEntriesByArea);
      setUsedAreasOrder(emptyVoiceData.usedAreasOrder);

      clearVoiceData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isAuthenticated, isReady]);

  const areas = useMemo(() => {
    return [...new Set(items.map((item) => item.area))];
  }, [items]);

  const allowedPages = useMemo(() => getAllowedPagesForRole(user?.role), [user?.role]);
  const currentPageDefinition = useMemo(
    () => getPageDefinition(currentPage),
    [currentPage]
  );
  const defaultPageForRole = useMemo(
    () => getDefaultPageForRole(user?.role),
    [user?.role]
  );
  const canAccessCurrentPage = useMemo(
    () => canAccessPage(user?.role, currentPage),
    [currentPage, user?.role]
  );
  const workspaceOverview = useWorkspaceOverview({
    role: user?.role,
    enabled: isAuthenticated && isReady,
    stockState: {
      items,
      quantities,
      filledItems,
      missingItems,
      progress,
      okCount,
      criticalCount,
      lowCount,
      checkCount,
      suggestedOrder,
      voiceFilledItems,
    },
  });

  function handleBackToStock() {
    setIsListening(false);
    setCurrentPage(PAGE_IDS.STOCK);
  }

  function handleSidebarNavigation(nextPageId) {
    if (nextPageId === currentPage) return;

    if (!canAccessPage(user?.role, nextPageId)) {
      const fallbackPage = defaultPageForRole;

      setAuthNotice(
        `Your role does not allow access to ${getPageLabel(nextPageId)}.`
      );

      if (fallbackPage) {
        setCurrentPage(fallbackPage);
      }

      return;
    }

    if (currentPage === PAGE_IDS.VOICE && isListening) {
      alert("Stop listening before navigating away from Stock Voice.");
      return;
    }

    setCurrentPage(nextPageId);
  }

  function handleLoginSuccess(session) {
    const nextPage = getDefaultPageForRole(session?.user?.role) || PAGE_IDS.OVERVIEW;
    setCurrentPage(nextPage);
    setAuthNotice(
      session?.user?.email
        ? `Signed in successfully as ${session.user.email}.`
        : "Signed in successfully."
    );
  }

  function handleLogout() {
    setIsListening(false);
    clearVoiceSession();
    setCurrentPage(PAGE_IDS.OVERVIEW);
    setAuthNotice("");
    logout();
  }

  useEffect(() => {
    if (!isAuthenticated || !defaultPageForRole) {
      return undefined;
    }

    if (canAccessCurrentPage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentPage(defaultPageForRole);
      setAuthNotice(
        `You were redirected to ${getPageLabel(
          defaultPageForRole
        )} because your role cannot access ${getPageLabel(currentPage)}.`
      );
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    canAccessCurrentPage,
    currentPage,
    defaultPageForRole,
    isAuthenticated,
  ]);

  if (!isReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 10% 0%, #17394f 0%, #0b1220 30%, #070d18 100%)",
          color: "#e2e8f0",
          padding: "24px",
          fontFamily: "'Segoe UI', 'Trebuchet MS', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            borderRadius: "16px",
            border: "1px solid #27445f",
            backgroundColor: "#0f172a",
            padding: "24px",
            textAlign: "center",
            boxShadow: "0 20px 36px rgba(0, 0, 0, 0.28)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#8ad9d0",
              fontWeight: 700,
              marginBottom: "10px",
            }}
          >
            SmartOps
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "#f8fafc",
              marginBottom: "8px",
            }}
          >
            Loading secure session
          </div>
          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#94a3b8",
            }}
          >
            Checking stored authentication and preparing the workspace.
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (!defaultPageForRole || allowedPages.length === 0) {
    return <AccessDeniedPage onLogout={handleLogout} />;
  }

  function renderCurrentPage() {
    if (!canAccessCurrentPage) {
      return null;
    }

    if (currentPage === PAGE_IDS.OVERVIEW) {
      return (
        <WorkspaceOverviewPage
          dashboard={workspaceOverview.dashboard}
          onNavigate={handleSidebarNavigation}
        />
      );
    }

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
          isLoading={isStockTakeLoading}
          isSaving={isStockTakeSaving}
          errorMessage={stockTakeErrorMessage}
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
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          minHeight: "calc(100vh - 32px)",
        }}
      >
        <div
          style={{
            flex: "0 0 280px",
            width: "280px",
            maxWidth: "100%",
          }}
        >
          <WorkspaceSidebar
            allowedPages={allowedPages}
            currentPage={currentPage}
            loading={loading}
            notice={authNotice}
            onLogout={handleLogout}
            onNavigate={handleSidebarNavigation}
            user={user}
          />
        </div>

        <main
          style={{
            flex: "1 1 760px",
            minWidth: 0,
            display: "grid",
            gap: "16px",
          }}
        >
          <WorkspaceHeader
            currentPage={currentPageDefinition}
            snapshot={workspaceOverview.snapshot}
            user={user}
          />

          <div
            style={{
              borderRadius: "16px",
              border: "1px solid #24344d",
              backgroundColor: "#0b1220",
              padding: "16px",
              boxShadow: "0 16px 30px rgba(0, 0, 0, 0.28)",
            }}
          >
            <div
              style={{
                borderRadius: "14px",
                border: "1px solid #24344d",
                backgroundColor: "#0f172a",
                padding: "16px",
              }}
            >
              {renderCurrentPage()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
