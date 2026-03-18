import { useEffect, useMemo, useState } from "react";
import { DAILY_ORDER_STATUSES, PAGE_IDS } from "../constants/app";
import { styles } from "../utils/uiStyles";
import {
  getDailyOrderQueue,
  getDailyOrderQueueCounts,
  markDailyOrderChefApproved,
  markDailyOrderReady,
  runDailyOrderBotFill,
  unlockDailyOrder,
  updateDailyOrderItemQuantity,
} from "../utils/dailyOrders";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";
import StatusBadge from "../components/StatusBadge";

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

function DailyOrderExecutionPage({ setCurrentPage }) {
  const [dailyOrders, setDailyOrders] = useState([]);
  const [runningBotFillOrderId, setRunningBotFillOrderId] = useState(null);
  const [isExecutingAllReady, setIsExecutingAllReady] = useState(false);
  const [executionWarningByOrderId, setExecutionWarningByOrderId] = useState({});

  function refreshDailyOrders() {
    setDailyOrders(getDailyOrderQueue());
  }

  useEffect(() => {
    refreshDailyOrders();
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

  function handleOrderItemQuantityChange(orderId, index, value) {
    updateDailyOrderItemQuantity(orderId, index, value);
    clearWarning(orderId);
    refreshDailyOrders();
  }

  function handleMarkReady(orderId) {
    markDailyOrderReady(orderId);
    clearWarning(orderId);
    refreshDailyOrders();
  }

  function handleUnlockOrder(orderId) {
    unlockDailyOrder(orderId);
    clearWarning(orderId);
    refreshDailyOrders();
  }

  function handleMarkChefApproved(orderId) {
    const result = markDailyOrderChefApproved(orderId);
    refreshDailyOrders();

    if (!result.ok) {
      if (result.reason === "already-executed") {
        setWarning(orderId, "This order is already approved/executed.");
      } else {
        setWarning(orderId, "Order is not ready for chef approval.");
      }
      return;
    }

    alert("Order marked as chef approved.");
  }

  function handleOpenSupplierReviewPlaceholder(orderId) {
    clearWarning(orderId);
    alert("Placeholder: open supplier review flow in a future phase.");
  }

  async function handleRunBotFill(orderId) {
    const order = sortedDailyOrders.find((entry) => entry.id === orderId);
    if (!order) return;

    if (runningBotFillOrderId) {
      setWarning(orderId, "Another order is already filling via bot.");
      return;
    }

    if (
      order.status !== DAILY_ORDER_STATUSES.READY &&
      order.status !== DAILY_ORDER_STATUSES.FAILED
    ) {
      setWarning(orderId, "Order must be READY (or FAILED for retry) before bot fill.");
      return;
    }

    clearWarning(orderId);

    try {
      setRunningBotFillOrderId(orderId);
      const result = await runDailyOrderBotFill(orderId);
      refreshDailyOrders();

      if (result.reason === "already-executed") {
        setWarning(orderId, "This order is already executed and cannot run again.");
      } else if (result.reason === "not-ready") {
        setWarning(orderId, "Order must be READY (or FAILED for retry) before bot fill.");
      } else if (result.reason === "another-order-filling") {
        setWarning(orderId, "Another order is already filling. Wait before running again.");
      } else if (result.reason === "invalid-order-items") {
        setWarning(orderId, "Order has no valid items with quantity > 0.");
      } else if (result.ok) {
        alert("Bot filled order and stopped at review page.");
      } else {
        alert("Bot fill failed. Check execution notes.");
      }
    } catch {
      alert("Failed to run bot fill.");
    } finally {
      setRunningBotFillOrderId(null);
    }
  }

  async function handleRunBotFillForAllReady() {
    const readyOrders = sortedDailyOrders.filter(
      (order) => order.status === DAILY_ORDER_STATUSES.READY
    );

    if (readyOrders.length === 0) {
      alert("There are no READY orders to execute.");
      return;
    }

    if (runningBotFillOrderId || hasOrderFilling) {
      alert("Another order is currently filling. Wait until it finishes.");
      return;
    }

    try {
      setIsExecutingAllReady(true);
      let successCount = 0;
      let failedCount = 0;

      for (let index = 0; index < readyOrders.length; index += 1) {
        const order = readyOrders[index];
        const result = await runDailyOrderBotFill(order.id);
        if (result.ok) successCount += 1;
        if (!result.ok) failedCount += 1;
      }

      refreshDailyOrders();
      alert(
        `Batch fill finished. Ready for chef review: ${successCount} | Failed: ${failedCount}`
      );
    } catch {
      alert("Failed to execute ready orders.");
    } finally {
      setIsExecutingAllReady(false);
      setRunningBotFillOrderId(null);
    }
  }

  return (
    <div>
      <h1>Daily Order Execution</h1>

      <PageActionBar marginBottom="14px">
        <button
          onClick={() => setCurrentPage(PAGE_IDS.PHOTO)}
          style={styles.backButton}
        >
          Back To Photo Order
        </button>

        <button
          onClick={refreshDailyOrders}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#2196F3",
          }}
        >
          Refresh
        </button>

        <button
          onClick={handleRunBotFillForAllReady}
          disabled={
            counts.ready === 0 ||
            isExecutingAllReady ||
            runningBotFillOrderId !== null ||
            hasOrderFilling
          }
          style={{
            ...styles.primaryButton,
            backgroundColor:
              counts.ready === 0 ||
              isExecutingAllReady ||
              runningBotFillOrderId !== null ||
              hasOrderFilling
                ? "#888"
                : "#00b894",
            cursor:
              counts.ready === 0 ||
              isExecutingAllReady ||
              runningBotFillOrderId !== null ||
              hasOrderFilling
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isExecutingAllReady
            ? "Running Bot Fill For All Ready..."
            : `Run Bot Fill For All Ready (${counts.ready})`}
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

      {(runningBotFillOrderId !== null || isExecutingAllReady) && (
        <NoticePanel
          backgroundColor="#1f1f1f"
          border="1px solid #555"
          color="#8de0ea"
          marginBottom="12px"
        >
          Bot service is filling order items on mock portal. Final submit remains manual.
        </NoticePanel>
      )}

      {sortedDailyOrders.length === 0 ? (
        <div style={styles.emptyState}>No daily confirmed orders yet.</div>
      ) : (
        sortedDailyOrders.map((order) => {
          const statusColors = getStatusBadgeColors(order.status);
          const warning = executionWarningByOrderId[order.id];
          const isRunningBotFillThis = runningBotFillOrderId === order.id;
          const canEditItems = !order.isLocked && order.status === DAILY_ORDER_STATUSES.DRAFT;
          const canRunBotFill =
            order.status === DAILY_ORDER_STATUSES.READY ||
            order.status === DAILY_ORDER_STATUSES.FAILED;
          const canMarkReady = order.status === DAILY_ORDER_STATUSES.DRAFT;
          const canUnlock =
            order.isLocked &&
            order.status !== DAILY_ORDER_STATUSES.EXECUTED &&
            order.status !== DAILY_ORDER_STATUSES.FILLING_ORDER;
          const canApprove = order.status === DAILY_ORDER_STATUSES.READY_FOR_CHEF_REVIEW;

          return (
            <div
              key={order.id}
              style={{
                border: "1px solid #555",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "14px",
                backgroundColor: "#1a1a1a",
              }}
            >
              <PageActionBar marginBottom="10px" alignItems="center">
                <h3 style={{ margin: 0 }}>{order.supplier}</h3>
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

              <div style={{ color: "#aaa", fontSize: "13px", marginBottom: "10px" }}>
                Created: {formatDateTime(order.createdAt)} | Total Qty: {order.totalQuantity}
                {" | "}Attempts: {order.attempts || 0}
              </div>

              <div
                style={{
                  border: "1px solid #444",
                  borderRadius: "8px",
                  overflow: "hidden",
                  marginBottom: "10px",
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
                      padding: "10px",
                      borderBottom: "1px solid #333",
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
                            width: "100%",
                            padding: "5px 8px",
                            borderRadius: "6px",
                            border: "1px solid #555",
                            backgroundColor: "#1f1f1f",
                            color: "white",
                            boxSizing: "border-box",
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

              {order.reviewScreenshot && (
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ marginBottom: "6px", color: "#aaa", fontSize: "13px" }}>
                    Review Screenshot
                  </div>
                  <img
                    src={order.reviewScreenshot}
                    alt={`Review screenshot ${order.supplier}`}
                    style={{
                      maxWidth: "100%",
                      borderRadius: "8px",
                      border: "1px solid #444",
                    }}
                  />
                </div>
              )}

              <NoticePanel
                backgroundColor="#111"
                border="1px solid #444"
                color="#ccc"
                fontWeight="normal"
                marginBottom="10px"
                padding="10px"
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
              </NoticePanel>

              <PageActionBar marginBottom="0">
                <button
                  onClick={() => handleMarkReady(order.id)}
                  disabled={
                    !canMarkReady ||
                    isExecutingAllReady ||
                    isRunningBotFillThis ||
                    runningBotFillOrderId !== null
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      !canMarkReady ||
                      isExecutingAllReady ||
                      isRunningBotFillThis ||
                      runningBotFillOrderId !== null
                        ? "#888"
                        : "#ff9800",
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
                    runningBotFillOrderId !== null
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      !canUnlock ||
                      isExecutingAllReady ||
                      isRunningBotFillThis ||
                      runningBotFillOrderId !== null
                        ? "#888"
                        : "#607d8b",
                  }}
                >
                  Unlock Order
                </button>

                <button
                  onClick={() => handleRunBotFill(order.id)}
                  disabled={
                    !canRunBotFill ||
                    isExecutingAllReady ||
                    isRunningBotFillThis ||
                    runningBotFillOrderId !== null ||
                    hasOrderFilling
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      !canRunBotFill ||
                      isExecutingAllReady ||
                      isRunningBotFillThis ||
                      runningBotFillOrderId !== null ||
                      hasOrderFilling
                        ? "#888"
                        : "#0288d1",
                  }}
                >
                  {isRunningBotFillThis ? "Running Bot Fill..." : "Run Bot Fill"}
                </button>

                <button
                  onClick={() => handleMarkChefApproved(order.id)}
                  disabled={
                    !canApprove ||
                    isExecutingAllReady ||
                    isRunningBotFillThis ||
                    runningBotFillOrderId !== null
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      !canApprove ||
                      isExecutingAllReady ||
                      isRunningBotFillThis ||
                      runningBotFillOrderId !== null
                        ? "#888"
                        : "#4CAF50",
                  }}
                >
                  Mark as Chef Approved
                </button>

                <button
                  onClick={() => handleOpenSupplierReviewPlaceholder(order.id)}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: "#795548",
                  }}
                >
                  Open Supplier Review
                </button>
              </PageActionBar>
            </div>
          );
        })
      )}
    </div>
  );
}

export default DailyOrderExecutionPage;
