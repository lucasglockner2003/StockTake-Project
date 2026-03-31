import { useEffect, useMemo, useState } from "react";
import { DAILY_ORDER_STATUSES } from "../constants/app";
import { styles } from "../utils/uiStyles";
import {
  ensureDailyOrderQueueLoaded,
  getDailyOrderQueue,
  getDailyOrderQueueCounts,
  markDailyOrderReady,
  refreshDailyOrderQueue,
  resetDailyOrderExecutionState,
  runDailyOrderBotFill,
  subscribeDailyOrderQueue,
  submitDailyOrderAfterChefApproval,
  unlockDailyOrder,
  updateDailyOrderItemQuantity,
} from "../utils/dailyOrders";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";
import StatusBadge from "../components/StatusBadge";
import { getDailyOrdersBotServiceStatus } from "../services/daily-orders-service";
import { runtimeConfig } from "../services/runtime-config";
import { buildBotAssetUrl } from "../utils/botServiceClient";

const MOCK_PORTAL_URL = runtimeConfig.mockPortalUrl;

function getStatusLabel(status) {
  if (status === DAILY_ORDER_STATUSES.READY) return "READY";
  if (status === DAILY_ORDER_STATUSES.FILLING_ORDER) return "FILLING ORDER";
  if (status === DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW) {
    return "READY FOR CHEF REVIEW";
  }
  if (status === DAILY_ORDER_STATUSES.EXECUTED) return "EXECUTED";
  if (status === DAILY_ORDER_STATUSES.FAILED) return "FAILED";
  return "DRAFT";
}

function getStatusBadgeColors(status) {
  if (status === DAILY_ORDER_STATUSES.READY) {
    return {
      backgroundColor: "#fff3e0",
      textColor: "#ff9800",
    };
  }

  if (status === DAILY_ORDER_STATUSES.FILLING_ORDER) {
    return {
      backgroundColor: "#e3f2fd",
      textColor: "#2196F3",
    };
  }

  if (status === DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW) {
    return {
      backgroundColor: "#e0f7fa",
      textColor: "#00acc1",
    };
  }

  if (status === DAILY_ORDER_STATUSES.EXECUTED) {
    return {
      backgroundColor: "#e8f5e9",
      textColor: "#4CAF50",
    };
  }

  if (status === DAILY_ORDER_STATUSES.FAILED) {
    return {
      backgroundColor: "#ffebee",
      textColor: "#d9534f",
    };
  }

  return {
    backgroundColor: "#2a2a2a",
    textColor: "#aaa",
  };
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getExecutionErrorMessage(errorCode, fallbackMessage) {
  if (errorCode === "EXECUTION_IN_PROGRESS" || errorCode === "EXECUTION_LOCKED") {
    return "Wait current execution to finish";
  }

  if (errorCode === "BOT_SERVICE_UNREACHABLE") {
    return "Check bot-service is running";
  }

  if (errorCode === "BOT_SERVICE_TIMEOUT") {
    return "Bot service timeout. Retry after checking service health.";
  }

  if (errorCode === "PORTAL_LOGIN_FAILED") {
    return "Check supplier credentials";
  }

  if (errorCode === "INVALID_SUPPLIER" || errorCode === "INVALID_ITEMS") {
    return "Order payload is invalid. Review supplier and item quantities.";
  }

  if (errorCode === "BOT_FILL_FAILED") {
    return "Bot could not complete fill stage. Fix issue and retry fill.";
  }

  if (errorCode === "FINAL_SUBMIT_FAILED") {
    return "Final submit failed. Review screenshot and retry final submit.";
  }

  return fallbackMessage || "Execution failed.";
}

function getNoticeToneStyle(tone) {
  if (tone === "success") {
    return {
      backgroundColor: "#102410",
      border: "1px solid #2f6f2f",
      color: "#9be79b",
    };
  }

  if (tone === "warning") {
    return {
      backgroundColor: "#2b2410",
      border: "1px solid #6d5b2f",
      color: "#ffe39a",
    };
  }

  if (tone === "error") {
    return {
      backgroundColor: "#3a1f1f",
      border: "1px solid #7a2d2d",
      color: "#ffb3b3",
    };
  }

  return {
    backgroundColor: "#1f1f1f",
    border: "1px solid #555",
    color: "#8de0ea",
  };
}

function DailyOrderExecutionPage() {
  const [dailyOrders, setDailyOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [runningBotFillSupplier, setRunningBotFillSupplier] = useState(null);
  const [runningFinalSubmitOrderId, setRunningFinalSubmitOrderId] = useState(null);
  const [isExecutingAllReady, setIsExecutingAllReady] = useState(false);
  const [isRetryingAllFailed, setIsRetryingAllFailed] = useState(false);
  const [retryProgress, setRetryProgress] = useState({
    current: 0,
    total: 0,
    supplier: "",
  });
  const [executionWarningByOrderId, setExecutionWarningByOrderId] = useState({});
  const [pageNotice, setPageNotice] = useState({
    tone: "",
    message: "",
  });
  const [botServiceState, setBotServiceState] = useState({
    online: false,
    running: false,
    type: "",
    phase: "",
    supplier: "",
    status: "unknown",
    message: "",
    lastCheckedAt: "",
  });

  function syncDailyOrdersFromCache() {
    setDailyOrders(getDailyOrderQueue());
  }

  useEffect(() => {
    let isActive = true;
    const unsubscribe = subscribeDailyOrderQueue(() => {
      if (!isActive) {
        return;
      }

      syncDailyOrdersFromCache();
    });

    async function hydrateDailyOrders() {
      setIsLoadingOrders(true);

      try {
        await ensureDailyOrderQueueLoaded();

        if (!isActive) {
          return;
        }

        syncDailyOrdersFromCache();
      } catch (error) {
        if (!isActive) {
          return;
        }

        setPageNotice({
          tone: "error",
          message: error?.message || "Failed to load daily orders.",
        });
      } finally {
        if (isActive) {
          setIsLoadingOrders(false);
        }
      }
    }

    hydrateDailyOrders();

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  async function refreshDailyOrders() {
    setIsLoadingOrders(true);

    try {
      await refreshDailyOrderQueue();
      setPageNotice((previous) =>
        previous.tone === "error" &&
        previous.message === "Failed to load daily orders."
          ? { tone: "", message: "" }
          : previous
      );
    } catch (error) {
      setPageNotice({
        tone: "error",
        message: error?.message || "Failed to load daily orders.",
      });
    } finally {
      setIsLoadingOrders(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function pollBotServiceStatus() {
      try {
        const status = await getDailyOrdersBotServiceStatus();
        if (!isActive) return;

        setBotServiceState({
          online: Boolean(status?.online),
          running: Boolean(status?.running),
          type: status?.type || "",
          phase: status?.phase || (status?.online ? "idle" : "offline"),
          supplier: status?.supplier || "",
          status: status?.status || (status?.online ? "ok" : "offline"),
          message:
            status?.message ||
            (status?.online ? "Bot service online." : "Bot service is offline."),
          lastCheckedAt: status?.lastCheckedAt || new Date().toISOString(),
        });
      } catch (error) {
        if (!isActive) return;

        setBotServiceState({
          online: false,
          running: false,
          type: "",
          phase: "offline",
          supplier: "",
          status: "offline",
          message: error?.message || "Bot service is offline.",
          lastCheckedAt: new Date().toISOString(),
        });
      }
    }

    pollBotServiceStatus();
    const intervalId = setInterval(pollBotServiceStatus, 7000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, []);

  const sortedDailyOrders = useMemo(
    () =>
      dailyOrders
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        ),
    [dailyOrders]
  );

  const counts = useMemo(
    () => getDailyOrderQueueCounts(sortedDailyOrders),
    [sortedDailyOrders]
  );
  const hasOrderFilling = counts.fillingOrder > 0;
  const runningExecutionSupplier = botServiceState.supplier || null;
  const isExecutionRunning = botServiceState.status === "running";

  function setWarning(orderId, message) {
    setExecutionWarningByOrderId((previous) => ({
      ...previous,
      [orderId]: message,
    }));
  }

  function clearWarning(orderId) {
    setExecutionWarningByOrderId((previous) => ({
      ...previous,
      [orderId]: "",
    }));
  }

  async function handleOrderItemQuantityChange(orderId, index, value) {
    try {
      const result = await updateDailyOrderItemQuantity(orderId, index, value);

      if (!result.ok) {
        setWarning(
          orderId,
          result.errorMessage || "This order cannot be edited right now."
        );
        return;
      }

      clearWarning(orderId);
      syncDailyOrdersFromCache();
    } catch (error) {
      setWarning(orderId, error?.message || "Failed to update order item.");
    }
  }

  async function handleMarkReady(orderId) {
    try {
      const result = await markDailyOrderReady(orderId);

      if (!result.ok) {
        setWarning(orderId, result.errorMessage || "Order could not be marked ready.");
        return;
      }

      clearWarning(orderId);
      syncDailyOrdersFromCache();
    } catch (error) {
      setWarning(orderId, error?.message || "Failed to mark order ready.");
    }
  }

  async function handleUnlockOrder(orderId) {
    try {
      const result = await unlockDailyOrder(orderId);

      if (!result.ok) {
        setWarning(orderId, result.errorMessage || "Order could not be unlocked.");
        return;
      }

      clearWarning(orderId);
      syncDailyOrdersFromCache();
    } catch (error) {
      setWarning(orderId, error?.message || "Failed to unlock order.");
    }
  }

  async function handleChefApprovedFinalSubmit(orderId) {
    if (runningBotFillSupplier || isExecutingAllReady || isRetryingAllFailed) {
      setWarning(orderId, "A bot fill is in progress. Wait before final submit.");
      return;
    }

    if (runningFinalSubmitOrderId && runningFinalSubmitOrderId !== orderId) {
      setWarning(orderId, "Another final submit is already in progress.");
      return;
    }

    clearWarning(orderId);

    try {
      setRunningFinalSubmitOrderId(orderId);
      const result = await submitDailyOrderAfterChefApproval(orderId);
      syncDailyOrdersFromCache();

      if (result.reason === "already-executed") {
        setWarning(orderId, "This order was already finally submitted.");
      } else if (result.reason === "not-ready-for-final-submit") {
        setWarning(orderId, "Final submit is allowed only for READY FOR CHEF REVIEW orders.");
      } else if (result.reason === "another-order-filling") {
        setWarning(orderId, "Another order is currently being processed.");
      } else if (result.ok) {
        setPageNotice({
          tone: "success",
          message: "Final submit completed successfully.",
        });
      } else {
        setWarning(
          orderId,
          getExecutionErrorMessage(result.errorCode, result.errorMessage)
        );
      }
    } catch {
      setPageNotice({
        tone: "error",
        message: "Failed to submit final order.",
      });
    } finally {
      setRunningFinalSubmitOrderId(null);
    }
  }

  function handleOpenSupplierReview(order) {
    if (!order) return;

    clearWarning(order.id);

    if (!MOCK_PORTAL_URL) {
      setPageNotice({
        tone: "warning",
        message: "Supplier portal URL is not configured for this environment.",
      });
      return;
    }

    if (!buildBotAssetUrl(order.reviewScreenshot)) {
      setPageNotice({
        tone: "warning",
        message: "Bot may not have reached review page yet.",
      });
    }

    window.open(MOCK_PORTAL_URL, "_blank");
  }

  async function executeBotFillForOrder(order, options = {}) {
    const { mode = "run", fromBatch = false } = options;
    if (!order) {
      return {
        ok: false,
        reason: "not-found",
      };
    }

    if (runningFinalSubmitOrderId) {
      if (!fromBatch) {
        setWarning(order.id, "A final submit is in progress. Wait until it finishes.");
      }
      return {
        ok: false,
        reason: "final-submit-running",
      };
    }

    if (
      (isExecutionRunning && runningExecutionSupplier === order.supplier) ||
      runningBotFillSupplier === order.supplier
    ) {
      if (!fromBatch) {
        setWarning(
          order.id,
          "Bot is already running for this supplier. Wait for completion before retry."
        );
        setPageNotice({
          tone: "warning",
          message: "Bot run already in progress for this supplier.",
        });
      }
      return {
        ok: false,
        reason: "execution-locked",
        errorCode: "EXECUTION_LOCKED",
        errorMessage: "Bot run already in progress for this supplier.",
      };
    }

    if (mode === "run" && order.status !== DAILY_ORDER_STATUSES.READY) {
      if (!fromBatch) {
        setWarning(order.id, "Order must be READY before bot fill.");
      }
      return {
        ok: false,
        reason: "not-ready",
      };
    }

    if (mode === "retry" && order.status !== DAILY_ORDER_STATUSES.FAILED) {
      if (!fromBatch) {
        setWarning(order.id, "Retry is available only for FAILED orders.");
      }
      return {
        ok: false,
        reason: "not-failed",
      };
    }

    clearWarning(order.id);

    try {
      setRunningBotFillSupplier(order.supplier);
      const result = await runDailyOrderBotFill(order.id);
      syncDailyOrdersFromCache();

      if (result.reason === "already-executed") {
        setWarning(order.id, "This order is already executed and cannot run again.");
      } else if (result.reason === "not-ready") {
        setWarning(order.id, "Order must be READY (or FAILED for retry) before bot fill.");
      } else if (result.reason === "another-order-filling") {
        setWarning(order.id, "Another order is already filling. Wait before running again.");
      } else if (result.reason === "invalid-order-items") {
        setWarning(order.id, "Order has no valid items with quantity > 0.");
      } else if (result.ok) {
        if (!fromBatch) {
          setPageNotice({
            tone: "success",
            message:
              mode === "retry"
                ? "Retry succeeded. Bot reached review stage."
                : "Bot filled order and stopped at review page.",
          });
        }
      } else {
        const message = getExecutionErrorMessage(
          result.errorCode,
          result.errorMessage
        );
        setWarning(order.id, message);
      }

      return result;
    } catch {
      if (!fromBatch) {
        setPageNotice({
          tone: "error",
          message:
            mode === "retry" ? "Failed to retry bot fill." : "Failed to run bot fill.",
        });
      }
      return {
        ok: false,
        reason: "unexpected-error",
      };
    } finally {
      setRunningBotFillSupplier(null);
    }
  }

  async function handleRunBotFill(orderId) {
    const order = sortedDailyOrders.find((entry) => entry.id === orderId);
    if (!order) return;
    await executeBotFillForOrder(order, { mode: "run" });
  }

  async function handleRetryBotFill(orderId) {
    const order = sortedDailyOrders.find((entry) => entry.id === orderId);
    if (!order) return;
    await executeBotFillForOrder(order, { mode: "retry" });
  }

  async function handleRunBotFillForAllReady() {
    const readyOrders = sortedDailyOrders.filter(
      (order) => order.status === DAILY_ORDER_STATUSES.READY
    );

    if (readyOrders.length === 0) {
      setPageNotice({
        tone: "warning",
        message: "There are no READY orders to execute.",
      });
      return;
    }

    if (
      runningBotFillSupplier ||
      runningFinalSubmitOrderId ||
      hasOrderFilling ||
      isRetryingAllFailed
    ) {
      setPageNotice({
        tone: "warning",
        message: "Another order is currently filling. Wait until it finishes.",
      });
      return;
    }

    try {
      setIsExecutingAllReady(true);
      let successCount = 0;
      let failedCount = 0;

      for (let index = 0; index < readyOrders.length; index += 1) {
        const order = readyOrders[index];
        const result = await executeBotFillForOrder(order, {
          mode: "run",
          fromBatch: true,
        });
        if (result.ok) successCount += 1;
        if (!result.ok) failedCount += 1;
      }

      syncDailyOrdersFromCache();
      setPageNotice({
        tone: failedCount > 0 ? "warning" : "success",
        message: `Batch fill finished. Ready for chef review: ${successCount} | Failed: ${failedCount}`,
      });
    } catch {
      setPageNotice({
        tone: "error",
        message: "Failed to execute ready orders.",
      });
    } finally {
      setIsExecutingAllReady(false);
      setRunningBotFillSupplier(null);
    }
  }

  async function handleRetryAllFailed() {
    const failedOrders = sortedDailyOrders.filter(
      (order) => order.status === DAILY_ORDER_STATUSES.FAILED
    );

    if (failedOrders.length === 0) {
      setPageNotice({
        tone: "warning",
        message: "There are no FAILED orders to retry.",
      });
      return;
    }

    if (
      runningBotFillSupplier ||
      runningFinalSubmitOrderId ||
      hasOrderFilling ||
      isExecutingAllReady
    ) {
      setPageNotice({
        tone: "warning",
        message: "Another execution is in progress. Wait until it finishes.",
      });
      return;
    }

    try {
      setIsRetryingAllFailed(true);
      let successCount = 0;
      let failedCount = 0;

      for (let index = 0; index < failedOrders.length; index += 1) {
        const order = failedOrders[index];
        setRetryProgress({
          current: index + 1,
          total: failedOrders.length,
          supplier: order.supplier || "-",
        });
        setPageNotice({
          tone: "info",
          message: `Retrying supplier ${index + 1} of ${failedOrders.length}: ${
            order.supplier || "-"
          }...`,
        });

        const result = await executeBotFillForOrder(order, {
          mode: "retry",
          fromBatch: true,
        });
        if (result.ok) successCount += 1;
        if (!result.ok) failedCount += 1;
      }

      syncDailyOrdersFromCache();
      setPageNotice({
        tone: failedCount > 0 ? "warning" : "success",
        message: `Retry batch finished. Success: ${successCount} | Failed: ${failedCount}`,
      });
    } catch {
      setPageNotice({
        tone: "error",
        message: "Failed to retry failed suppliers.",
      });
    } finally {
      setIsRetryingAllFailed(false);
      setRetryProgress({
        current: 0,
        total: 0,
        supplier: "",
      });
      setRunningBotFillSupplier(null);
    }
  }

  async function handleResetExecution() {
    const confirmed = window.confirm(
      "Are you sure you want to delete all daily execution orders? This will remove every order in this list."
    );

    if (!confirmed) return;

    if (botServiceState.running) {
      setPageNotice({
        tone: "warning",
        message: "Cannot delete orders while bot execution is running.",
      });
      return;
    }

    try {
      const result = await resetDailyOrderExecutionState();

      if (!result.ok) {
        setPageNotice({
          tone: "warning",
          message:
            result.errorMessage ||
            "Cannot delete orders while an execution is in progress.",
        });
        return;
      }

      syncDailyOrdersFromCache();
    } catch (error) {
      setPageNotice({
        tone: "error",
        message: error?.message || "Failed to delete daily execution orders.",
      });
      return;
    }

    setRunningBotFillSupplier(null);
    setRunningFinalSubmitOrderId(null);
    setIsExecutingAllReady(false);
    setIsRetryingAllFailed(false);
    setRetryProgress({
      current: 0,
      total: 0,
      supplier: "",
    });
    setExecutionWarningByOrderId({});
    setPageNotice({
      tone: "success",
      message: "All daily execution orders were deleted.",
    });
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "30px", fontWeight: 600 }}>
        Daily Order Execution
      </h1>

      <PageActionBar marginBottom="14px">
        <button
          onClick={refreshDailyOrders}
          disabled={isLoadingOrders}
          style={{
            ...styles.primaryButton,
            backgroundColor: isLoadingOrders ? "#64748b" : "#2563eb",
          }}
        >
          {isLoadingOrders ? "Refreshing..." : "Refresh"}
        </button>

        <button
          onClick={handleRunBotFillForAllReady}
          disabled={
            counts.ready === 0 ||
            isExecutingAllReady ||
            isRetryingAllFailed ||
            runningBotFillSupplier !== null ||
            runningFinalSubmitOrderId !== null ||
            hasOrderFilling
          }
          style={{
            ...styles.primaryButton,
            backgroundColor:
              counts.ready === 0 ||
              isExecutingAllReady ||
              isRetryingAllFailed ||
              runningBotFillSupplier !== null ||
              runningFinalSubmitOrderId !== null ||
              hasOrderFilling
                ? "#64748b"
                : "#00b894",
            cursor:
              counts.ready === 0 ||
              isExecutingAllReady ||
              isRetryingAllFailed ||
              runningBotFillSupplier !== null ||
              runningFinalSubmitOrderId !== null ||
              hasOrderFilling
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isExecutingAllReady
            ? "Running bot..."
            : `Run Bot Fill For All Ready (${counts.ready})`}
        </button>

        <button
          onClick={handleRetryAllFailed}
          disabled={
            counts.failed === 0 ||
            isRetryingAllFailed ||
            isExecutingAllReady ||
            runningBotFillSupplier !== null ||
            runningFinalSubmitOrderId !== null ||
            hasOrderFilling
          }
          style={{
            ...styles.primaryButton,
            backgroundColor:
              counts.failed === 0 ||
              isRetryingAllFailed ||
              isExecutingAllReady ||
              runningBotFillSupplier !== null ||
              runningFinalSubmitOrderId !== null ||
              hasOrderFilling
                ? "#64748b"
                : "#ef4444",
            cursor:
              counts.failed === 0 ||
              isRetryingAllFailed ||
              isExecutingAllReady ||
              runningBotFillSupplier !== null ||
              runningFinalSubmitOrderId !== null ||
              hasOrderFilling
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isRetryingAllFailed
            ? "Retrying All Failed..."
            : `Retry All Failed (${counts.failed})`}
        </button>

        <button
          onClick={handleResetExecution}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#ef4444",
          }}
        >
          Delete All Orders
        </button>
      </PageActionBar>

      <PageActionBar marginBottom="18px">
        <StatusBadge label="Total" value={counts.total} backgroundColor="#1f1f1f" textColor="white" />
        <StatusBadge label="Draft" value={counts.draft} backgroundColor="#2a2a2a" textColor="#aaa" />
        <StatusBadge label="Ready" value={counts.ready} backgroundColor="#fff3e0" textColor="#ff9800" />
        <StatusBadge label="Filling" value={counts.fillingOrder} backgroundColor="#e3f2fd" textColor="#2196F3" />
        <StatusBadge label="Chef Review" value={counts.readyForChefReview} backgroundColor="#e0f7fa" textColor="#00acc1" />
        <StatusBadge label="Executed" value={counts.executed} backgroundColor="#e8f5e9" textColor="#4CAF50" />
        <StatusBadge label="Failed" value={counts.failed} backgroundColor="#ffebee" textColor="#d9534f" />
      </PageActionBar>

      <NoticePanel
        backgroundColor={botServiceState.online ? "#1f1f1f" : "#3a1f1f"}
        border={botServiceState.online ? "1px solid #555" : "1px solid #7a2d2d"}
        color={botServiceState.online ? "#8de0ea" : "#ffb3b3"}
        marginBottom="10px"
        padding="10px"
      >
        Bot Service: {botServiceState.online ? "ONLINE" : "OFFLINE"}
        <br />
        Execution: {botServiceState.running ? "RUNNING" : "IDLE"}
        <br />
        Type: {botServiceState.type || "-"} | Phase: {botServiceState.phase || "-"}
        <br />
        Supplier: {botServiceState.supplier || "-"}
        <br />
        Last Check: {formatDateTime(botServiceState.lastCheckedAt)}
      </NoticePanel>

      {!botServiceState.online && (
        <NoticePanel
          backgroundColor="#3a1f1f"
          border="1px solid #7a2d2d"
          color="#ffb3b3"
          marginBottom="12px"
          padding="10px"
        >
          Bot service appears offline. Fill/submit attempts may fail until service is reachable.
        </NoticePanel>
      )}

      {botServiceState.online && botServiceState.running && (
        <NoticePanel
          backgroundColor="rgba(37, 99, 235, 0.12)"
          border="1px solid rgba(59, 130, 246, 0.22)"
          color="#bfdbfe"
          marginBottom="12px"
          padding="10px"
        >
          <span className="saas-running-indicator">
            <span className="saas-spinner" />
            <span>Running bot...</span>
          </span>
          <span style={{ marginLeft: "10px" }}>
            {botServiceState.type || "-"} for {botServiceState.supplier || "unknown supplier"} (
            {botServiceState.phase || "-"}).
          </span>
        </NoticePanel>
      )}

      {pageNotice.message && (
        <NoticePanel
          {...getNoticeToneStyle(pageNotice.tone)}
          marginBottom="12px"
          padding="10px"
        >
          {pageNotice.message}
        </NoticePanel>
      )}

      {isLoadingOrders && (
        <NoticePanel
          backgroundColor="#1f1f1f"
          border="1px solid #555"
          color="#8de0ea"
          marginBottom="12px"
          padding="10px"
        >
          Loading daily orders from backend...
        </NoticePanel>
      )}

      {(runningBotFillSupplier !== null ||
        runningFinalSubmitOrderId !== null ||
        isExecutingAllReady ||
        isRetryingAllFailed) && (
        <NoticePanel
          backgroundColor="#1f1f1f"
          border="1px solid #555"
          color="#8de0ea"
          marginBottom="12px"
        >
          {isRetryingAllFailed && retryProgress.total > 0
            ? `Retrying supplier ${retryProgress.current} of ${retryProgress.total}: ${
                retryProgress.supplier || "-"
              }...`
            : runningFinalSubmitOrderId !== null
            ? "Bot service is performing final submit on supplier portal."
            : "Bot service is filling order items on supplier portal."}
        </NoticePanel>
      )}

      {isLoadingOrders ? (
        <div style={styles.emptyState}>Loading daily confirmed orders...</div>
      ) : sortedDailyOrders.length === 0 ? (
        <div style={styles.emptyState}>No daily confirmed orders yet.</div>
      ) : (
        sortedDailyOrders.map((order) => {
          const statusColors = getStatusBadgeColors(order.status);
          const warning = executionWarningByOrderId[order.id];
          const isRunningBotFillThis =
            runningBotFillSupplier !== null &&
            order.supplier === runningBotFillSupplier;
          const isRunningForSupplier =
            isExecutionRunning &&
            runningExecutionSupplier &&
            order.supplier === runningExecutionSupplier;
          const isRunningFinalSubmitThis = runningFinalSubmitOrderId === order.id;
          const canEditItems = !order.isLocked && order.status === DAILY_ORDER_STATUSES.DRAFT;
          const canRunBotFill = order.status === DAILY_ORDER_STATUSES.READY;
          const canRetryBotFill = order.status === DAILY_ORDER_STATUSES.FAILED;
          const canMarkReady = order.status === DAILY_ORDER_STATUSES.DRAFT;
          const canUnlock =
            order.isLocked &&
            order.status !== DAILY_ORDER_STATUSES.EXECUTED &&
            order.status !== DAILY_ORDER_STATUSES.FILLING_ORDER;
          const canFinalSubmit =
            order.status === DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW;
          const canOpenSupplierReview =
            order.status === DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW ||
            order.status === DAILY_ORDER_STATUSES.EXECUTED;
          const reviewScreenshotUrl = buildBotAssetUrl(order.reviewScreenshot);
          const finalScreenshotUrl = buildBotAssetUrl(order.finalScreenshot);

          return (
            <div
              key={order.id}
              style={{
                ...styles.darkPanel,
                padding: "16px",
                marginBottom: "14px",
              }}
            >
              <PageActionBar marginBottom="10px" alignItems="center">
                <h3 style={{ margin: 0 }}>
                  {order.supplier}
                  {isRunningForSupplier ? (
                    <span
                      className="saas-running-indicator"
                      style={{ marginLeft: "10px", verticalAlign: "middle" }}
                    >
                      <span className="saas-spinner" />
                      <span>Running bot...</span>
                    </span>
                  ) : null}
                </h3>
                <StatusBadge
                  label="Status"
                  value={getStatusLabel(order.status)}
                  backgroundColor={statusColors.backgroundColor}
                  textColor={statusColors.textColor}
                  padding="6px 10px"
                  fontSize="12px"
                />
              </PageActionBar>

              {warning && (
                <NoticePanel
                  backgroundColor="#3a1f1f"
                  border="1px solid #7a2d2d"
                  color="#ffb3b3"
                  padding="10px"
                  marginBottom="10px"
                >
                  {warning}
                </NoticePanel>
              )}

              {order.status === DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW && (
                <NoticePanel
                  backgroundColor="#1f1f1f"
                  border="1px solid #555"
                  color="#8de0ea"
                  padding="10px"
                  marginBottom="10px"
                >
                  Ready for Chef Review: bot filled items and stopped before submit.
                </NoticePanel>
              )}

              {order.status === DAILY_ORDER_STATUSES.FAILED && (
                <NoticePanel
                  backgroundColor="#2b2410"
                  border="1px solid #6d5b2f"
                  color="#ffe39a"
                  padding="10px"
                  marginBottom="10px"
                >
                  Suggested Action:{" "}
                  {getExecutionErrorMessage(
                    order.lastErrorCode,
                    order.lastErrorMessage
                  )}
                </NoticePanel>
              )}

              <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "12px" }}>
                Created: {formatDateTime(order.createdAt)} | Total Qty: {order.totalQuantity}
                {" | "}Attempts: {order.attempts || 0}
              </div>

              <div
                style={{
                  border: "1px solid #1f2937",
                  borderRadius: "12px",
                  overflow: "hidden",
                  marginBottom: "12px",
                }}
              >
                <SectionTableHeader columns={["Item", "Qty", "Unit"]} gridTemplateColumns="1.4fr 0.7fr 0.7fr" />

                {(order.items || []).map((item, index) => (
                  <div
                    key={`${order.id}-${item.itemId}-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 0.7fr 0.7fr",
                      gap: "8px",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderBottom: "1px solid #1f2937",
                      backgroundColor: "rgba(15, 23, 42, 0.76)",
                    }}
                  >
                    <div>{item.itemName}</div>
                    <div>
                      {canEditItems ? (
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity}
                          onChange={(event) =>
                            handleOrderItemQuantityChange(
                              order.id,
                              index,
                              event.target.value
                            )
                          }
                          style={{
                            ...styles.input,
                            padding: "8px 10px",
                          }}
                        />
                      ) : (
                        item.quantity
                      )}
                    </div>
                    <div>{item.unit || "-"}</div>
                  </div>
                ))}
              </div>

              {reviewScreenshotUrl && (
                <div className="saas-screenshot-frame" style={{ marginBottom: "12px" }}>
                  <div className="saas-screenshot-title">Bot Execution Screenshot</div>
                  <img
                    src={reviewScreenshotUrl}
                    alt={`Review screenshot ${order.supplier}`}
                    style={{
                      maxWidth: "100%",
                      borderRadius: "10px",
                      border: "1px solid #1f2937",
                    }}
                  />
                </div>
              )}

              {order.status === DAILY_ORDER_STATUSES.EXECUTED && order.orderNumber && (
                <NoticePanel
                  backgroundColor="#102410"
                  border="1px solid #2f6f2f"
                  color="#9be79b"
                  padding="10px"
                  marginBottom="10px"
                >
                  Order Number: {order.orderNumber}
                </NoticePanel>
              )}

              {finalScreenshotUrl && order.status === DAILY_ORDER_STATUSES.EXECUTED && (
                <div className="saas-screenshot-frame" style={{ marginBottom: "12px" }}>
                  <div className="saas-screenshot-title">Bot Execution Screenshot</div>
                  <img
                    src={finalScreenshotUrl}
                    alt={`Final submit screenshot ${order.supplier}`}
                    style={{
                      maxWidth: "100%",
                      borderRadius: "10px",
                      border: "1px solid #1f2937",
                    }}
                  />
                </div>
              )}

              <NoticePanel
                backgroundColor="rgba(15, 23, 42, 0.76)"
                border="1px solid #1f2937"
                color="#cbd5e1"
                fontWeight="normal"
                marginBottom="10px"
                padding="12px"
              >
                Started: {formatDateTime(order.executionStartedAt)}
                <br />
                Filled At: {formatDateTime(order.filledAt)}
                <br />
                Ready For Review At: {formatDateTime(order.readyForReviewAt)}
                <br />
                Finished: {formatDateTime(order.executionFinishedAt)}
                <br />
                Duration: {order.executionDuration || 0} ms
                <br />
                Notes: {order.executionNotes || "No execution notes."}
                <br />
                Chef Approved At: {formatDateTime(order.chefApprovedAt)}
                <br />
                Submitted At: {formatDateTime(order.submittedAt)}
                <br />
                Submit Duration: {order.submitDuration || 0} ms
                <br />
                Final Notes: {order.finalExecutionNotes || "No final submit notes."}
                <br />
                Last Execution ID: {order.lastExecutionId || "-"}
                <br />
                Last Phase: {order.lastExecutionPhase || "-"}
                <br />
                Last Error Code: {order.lastErrorCode || "-"}
                <br />
                Last Error Message: {order.lastErrorMessage || "-"}
                <br />
                Suggested Action:{" "}
                {order.lastErrorCode
                  ? getExecutionErrorMessage(
                      order.lastErrorCode,
                      order.lastErrorMessage
                    )
                  : "-"}
              </NoticePanel>

              <PageActionBar marginBottom="0">
                <button
                  onClick={() => handleMarkReady(order.id)}
                  disabled={
                    !canMarkReady ||
                    isExecutingAllReady ||
                    isRunningBotFillThis ||
                    isRunningFinalSubmitThis ||
                    runningBotFillSupplier !== null ||
                    runningFinalSubmitOrderId !== null
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      !canMarkReady ||
                      isExecutingAllReady ||
                      isRunningBotFillThis ||
                      isRunningFinalSubmitThis ||
                        runningBotFillSupplier !== null ||
                        runningFinalSubmitOrderId !== null
                        ? "#64748b"
                        : "#f59e0b",
                  }}
                >
                  Mark Ready
                </button>

                <button
                  onClick={() => handleUnlockOrder(order.id)}
                  disabled={
                    !canUnlock ||
                    isExecutingAllReady ||
                    isRunningBotFillThis ||
                    isRunningFinalSubmitThis ||
                    runningBotFillSupplier !== null ||
                    runningFinalSubmitOrderId !== null
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      !canUnlock ||
                      isExecutingAllReady ||
                      isRunningBotFillThis ||
                      isRunningFinalSubmitThis ||
                        runningBotFillSupplier !== null ||
                        runningFinalSubmitOrderId !== null
                        ? "#64748b"
                        : "#334155",
                  }}
                >
                  Unlock Order
                </button>

                <button
                  onClick={() => handleRunBotFill(order.id)}
                  disabled={
                    !canRunBotFill ||
                    isExecutingAllReady ||
                    isRetryingAllFailed ||
                    isRunningBotFillThis ||
                    isRunningFinalSubmitThis ||
                    runningFinalSubmitOrderId !== null ||
                    (isExecutionRunning && isRunningForSupplier)
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      !canRunBotFill ||
                      isExecutingAllReady ||
                      isRetryingAllFailed ||
                      isRunningBotFillThis ||
                      isRunningFinalSubmitThis ||
                      runningFinalSubmitOrderId !== null ||
                      (isExecutionRunning && isRunningForSupplier)
                        ? "#64748b"
                        : "#2563eb",
                  }}
                >
                  {isRunningBotFillThis ? "Running bot..." : "Run Bot Fill"}
                </button>

                <button
                  onClick={() => handleRetryBotFill(order.id)}
                  disabled={
                    !canRetryBotFill ||
                    isExecutingAllReady ||
                    isRetryingAllFailed ||
                    isRunningBotFillThis ||
                    isRunningFinalSubmitThis ||
                    runningFinalSubmitOrderId !== null ||
                    (isExecutionRunning && isRunningForSupplier)
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      !canRetryBotFill ||
                      isExecutingAllReady ||
                      isRetryingAllFailed ||
                      isRunningBotFillThis ||
                      isRunningFinalSubmitThis ||
                      runningFinalSubmitOrderId !== null ||
                      (isExecutionRunning && isRunningForSupplier)
                        ? "#64748b"
                        : "#ef4444",
                  }}
                >
                  {isRunningBotFillThis && canRetryBotFill
                        ? "Retrying Bot Fill..."
                        : "Retry Bot Fill"}
                </button>

                <button
                  onClick={() => handleChefApprovedFinalSubmit(order.id)}
                  disabled={
                    !canFinalSubmit ||
                    isExecutingAllReady ||
                    isRunningBotFillThis ||
                    isRunningFinalSubmitThis ||
                    runningBotFillSupplier !== null ||
                    runningFinalSubmitOrderId !== null
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      !canFinalSubmit ||
                      isExecutingAllReady ||
                      isRunningBotFillThis ||
                        isRunningFinalSubmitThis ||
                        runningBotFillSupplier !== null ||
                        runningFinalSubmitOrderId !== null
                        ? "#64748b"
                        : "#16a34a",
                  }}
                >
                  {isRunningFinalSubmitThis
                    ? "Submitting Final Order..."
                    : "Chef Approved - Final Submit"}
                </button>

                <button
                  onClick={() => handleOpenSupplierReview(order)}
                  disabled={!canOpenSupplierReview}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: canOpenSupplierReview ? "#1f2937" : "#64748b",
                  }}
                >
                  Open Supplier Review
                </button>

                <span style={{ color: "#999", fontSize: "12px", alignSelf: "center" }}>
                  Opens supplier portal for manual verification.
                </span>
              </PageActionBar>
            </div>
          );
        })
      )}
    </div>
  );
}

export default DailyOrderExecutionPage;
