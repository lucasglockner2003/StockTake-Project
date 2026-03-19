import { useEffect, useMemo, useState } from "react";
import {
  JOB_STATUSES,
  PAGE_IDS,
  SOURCES,
  SUPPLIER_ORDER_EXECUTION_STATUSES,
} from "../constants/app";
import {
  addAutomationJob,
  buildSupplierOrderAutomationJob,
  buildSupplierOrderPayload,
  buildSupplierOrderSnapshot,
  buildSupplierOrderText,
  getAutomationQueue,
  getSupplierOrderSnapshotSignature,
  getSupplierOrderHistory,
} from "../utils/automation";
import {
  groupSuggestedOrderBySupplier,
  UNKNOWN_SUPPLIER_LABEL,
} from "../utils/stock";
import { styles } from "../utils/uiStyles";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";
import StatusBadge from "../components/StatusBadge";

function mapJobStatusToExecutionStatus(status) {
  if (status === JOB_STATUSES.DONE) {
    return SUPPLIER_ORDER_EXECUTION_STATUSES.EXECUTED;
  }

  if (status === JOB_STATUSES.FAILED) {
    return SUPPLIER_ORDER_EXECUTION_STATUSES.FAILED;
  }

  return SUPPLIER_ORDER_EXECUTION_STATUSES.SENT_TO_QUEUE;
}

function getExecutionStatusColors(status) {
  if (status === SUPPLIER_ORDER_EXECUTION_STATUSES.SENT_TO_QUEUE) {
    return {
      backgroundColor: "#fff3e0",
      textColor: "#ff9800",
    };
  }

  if (status === SUPPLIER_ORDER_EXECUTION_STATUSES.EXECUTED) {
    return {
      backgroundColor: "#e8f5e9",
      textColor: "#4CAF50",
    };
  }

  if (status === SUPPLIER_ORDER_EXECUTION_STATUSES.FAILED) {
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

function SupplierOrderReviewPage({ suggestedOrder, setCurrentPage }) {
  const initialEditableItems = useMemo(() => {
    const grouped = groupSuggestedOrderBySupplier(suggestedOrder);

    return Object.entries(grouped).flatMap(([supplier, items]) =>
      items.map((item) => ({
        ...item,
        supplier,
        orderAmount: Number(item.orderAmount) || 0,
      }))
    );
  }, [suggestedOrder]);

  const [editableItems, setEditableItems] = useState(initialEditableItems);
  const [automationJobs, setAutomationJobs] = useState(() => getAutomationQueue());
  const [supplierOrderHistory, setSupplierOrderHistory] = useState(() =>
    getSupplierOrderHistory()
  );
  const [showHistory, setShowHistory] = useState(false);
  const [revisionDraftBySupplier, setRevisionDraftBySupplier] = useState({});
  const [snapshotWarnings, setSnapshotWarnings] = useState({});

  useEffect(() => {
    setEditableItems(initialEditableItems);
  }, [initialEditableItems]);

  useEffect(() => {
    setAutomationJobs(getAutomationQueue());
    setSupplierOrderHistory(getSupplierOrderHistory());
  }, []);

  const groupedBySupplier = useMemo(
    () =>
      editableItems.reduce((acc, item) => {
        const supplier = item.supplier || UNKNOWN_SUPPLIER_LABEL;

        if (!acc[supplier]) {
          acc[supplier] = [];
        }

        acc[supplier].push(item);
        return acc;
      }, {}),
    [editableItems]
  );

  const suppliers = useMemo(
    () => Object.keys(groupedBySupplier).sort((a, b) => a.localeCompare(b)),
    [groupedBySupplier]
  );

  const sortedSupplierGroups = useMemo(
    () =>
      suppliers.reduce((acc, supplier) => {
        const supplierItems = groupedBySupplier[supplier] || [];

        acc[supplier] = supplierItems
          .slice()
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

        return acc;
      }, {}),
    [groupedBySupplier, suppliers]
  );

  const activeItemsBySupplier = useMemo(
    () =>
      suppliers.reduce((acc, supplier) => {
        acc[supplier] = (sortedSupplierGroups[supplier] || []).filter(
          (item) => Number(item.orderAmount) > 0
        );

        return acc;
      }, {}),
    [sortedSupplierGroups, suppliers]
  );

  const activeSuppliers = useMemo(
    () =>
      suppliers.filter(
        (supplier) => (activeItemsBySupplier[supplier] || []).length > 0
      ),
    [activeItemsBySupplier, suppliers]
  );

  const latestSupplierJobBySupplier = useMemo(() => {
    const supplierJobs = (automationJobs || []).filter(
      (job) => job.source === SOURCES.REVIEW_SUPPLIER_ORDER
    );

    return supplierJobs.reduce((acc, job) => {
      const supplier =
        job?.metadata?.supplierOrder?.supplier ||
        job?.items?.[0]?.supplier ||
        UNKNOWN_SUPPLIER_LABEL;

      const previousJob = acc[supplier];
      const currentTime = new Date(job.updatedAt || job.createdAt || 0).getTime();
      const previousTime = previousJob
        ? new Date(previousJob.updatedAt || previousJob.createdAt || 0).getTime()
        : -1;

      if (!previousJob || currentTime > previousTime) {
        acc[supplier] = job;
      }

      return acc;
    }, {});
  }, [automationJobs]);

  const supplierHistoryBySupplier = useMemo(
    () =>
      (supplierOrderHistory || []).reduce((acc, entry) => {
        const supplier = entry.supplier || UNKNOWN_SUPPLIER_LABEL;

        if (!acc[supplier]) {
          acc[supplier] = [];
        }

        acc[supplier].push(entry);
        return acc;
      }, {}),
    [supplierOrderHistory]
  );

  const latestRevisionBySupplier = useMemo(
    () =>
      suppliers.reduce((acc, supplier) => {
        const entries = supplierHistoryBySupplier[supplier] || [];
        const latestRevision = entries.reduce((maxRevision, entry) => {
          const revision = Number(entry.revisionNumber || 1);
          return Math.max(maxRevision, revision);
        }, 0);

        acc[supplier] = latestRevision;
        return acc;
      }, {}),
    [supplierHistoryBySupplier, suppliers]
  );

  const sendableSuppliers = useMemo(
    () =>
      activeSuppliers.filter((supplier) => {
        const hasSentSnapshot = (latestRevisionBySupplier[supplier] || 0) > 0;
        const hasDraftRevision = Number(revisionDraftBySupplier[supplier] || 0) > 0;

        return !hasSentSnapshot || hasDraftRevision;
      }),
    [activeSuppliers, latestRevisionBySupplier, revisionDraftBySupplier]
  );

  function normalizeOrderAmount(value) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return 0;
    }

    return Math.max(numeric, 0);
  }

  function handleOrderAmountChange(itemId, nextValue) {
    const normalizedValue = normalizeOrderAmount(nextValue);
    const editedItem = editableItems.find((item) => item.id === itemId);

    setEditableItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, orderAmount: normalizedValue } : item
      )
    );

    if (editedItem?.supplier) {
      clearSupplierWarning(editedItem.supplier);
    }
  }

  function getSupplierSummary(supplier) {
    const items = activeItemsBySupplier[supplier] || [];
    const totalItems = items.length;
    const totalOrderQuantity = items.reduce(
      (sum, item) => sum + Number(item.orderAmount || 0),
      0
    );

    const pricedItems = items.filter((item) => {
      const price = Number(item.price);
      return Number.isFinite(price);
    });

    const totalEstimatedValue = pricedItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.orderAmount || 0),
      0
    );

    return {
      totalItems,
      totalOrderQuantity,
      hasEstimatedValue: pricedItems.length > 0,
      totalEstimatedValue,
    };
  }

  function refreshExecutionData() {
    setAutomationJobs(getAutomationQueue());
    setSupplierOrderHistory(getSupplierOrderHistory());
  }

  function clearSupplierWarning(supplier) {
    setSnapshotWarnings((previous) => ({
      ...previous,
      [supplier]: "",
    }));
  }

  function setSupplierWarning(supplier, message) {
    setSnapshotWarnings((previous) => ({
      ...previous,
      [supplier]: message,
    }));
  }

  function createNewRevisionForSupplier(supplier) {
    const latestRevision = Number(latestRevisionBySupplier[supplier] || 0);
    const nextRevision = latestRevision + 1;

    setRevisionDraftBySupplier((previous) => ({
      ...previous,
      [supplier]: nextRevision,
    }));
    clearSupplierWarning(supplier);
  }

  function clearRevisionDraftForSupplier(supplier) {
    setRevisionDraftBySupplier((previous) => {
      const next = { ...previous };
      delete next[supplier];
      return next;
    });
  }

  function getRevisionToSend(supplier) {
    const hasSentSnapshot = Number(latestRevisionBySupplier[supplier] || 0) > 0;
    const draftRevision = Number(revisionDraftBySupplier[supplier] || 0);

    if (hasSentSnapshot) {
      return draftRevision;
    }

    return 1;
  }

  function hasDuplicateSnapshot(candidateSnapshot) {
    const candidateSignature = getSupplierOrderSnapshotSignature(candidateSnapshot);

    if (!candidateSignature) return false;

    return (supplierOrderHistory || []).some((entry) => {
      const entrySnapshot =
        entry.snapshot ||
        buildSupplierOrderSnapshot(
          entry.supplier,
          entry.items || [],
          entry.revisionNumber || 1,
          entry.snapshotTimestamp || entry.timestamp
        );

      return (
        getSupplierOrderSnapshotSignature(entrySnapshot) === candidateSignature
      );
    });
  }

  function getSupplierExecutionInfo(supplier) {
    const latestJob = latestSupplierJobBySupplier[supplier];

    if (latestJob) {
      const metadata = latestJob.metadata?.supplierOrder || {};

      return {
        status: metadata.status || mapJobStatusToExecutionStatus(latestJob.status),
        lastSentAt:
          metadata.lastSentAt || metadata.sentAt || latestJob.createdAt || null,
        attempts:
          metadata.attempts !== undefined
            ? metadata.attempts
            : Number(latestJob.attemptCount || 0),
      };
    }

    return {
      status: SUPPLIER_ORDER_EXECUTION_STATUSES.PENDING,
      lastSentAt: null,
      attempts: 0,
    };
  }

  async function copyTextToClipboard(text, successMessage, failureMessage) {
    try {
      await navigator.clipboard.writeText(text);
      alert(successMessage);
    } catch {
      alert(failureMessage);
    }
  }

  function handleSendSupplierToQueue(supplier) {
    const revisionNumber = getRevisionToSend(supplier);

    if (!revisionNumber) {
      alert("This supplier has a locked snapshot. Create a new revision first.");
      return;
    }

    const supplierItems = activeItemsBySupplier[supplier] || [];
    const snapshot = buildSupplierOrderSnapshot(
      supplier,
      supplierItems.map((item) => ({
        name: item.name,
        quantity: item.orderAmount,
        unit: item.unit,
      })),
      revisionNumber
    );

    if (hasDuplicateSnapshot(snapshot)) {
      setSupplierWarning(
        supplier,
        "An identical snapshot already exists in supplier order history. Change quantities before sending."
      );
      return;
    }

    const jobData = buildSupplierOrderAutomationJob(supplier, supplierItems, {
      revisionNumber,
    });

    if (jobData.items.length === 0) {
      alert("There are no items to send for this supplier.");
      return;
    }

    const job = addAutomationJob(jobData);
    clearRevisionDraftForSupplier(supplier);
    clearSupplierWarning(supplier);
    refreshExecutionData();
    alert(`Supplier order job created: ${job.jobId}`);
    setCurrentPage(PAGE_IDS.AUTOMATION);
  }

  async function handleCopySupplierText(supplier) {
    const supplierItems = activeItemsBySupplier[supplier] || [];
    const orderText = buildSupplierOrderText(supplier, supplierItems);

    if (!orderText) {
      alert("There are no items to copy for this supplier.");
      return;
    }

    await copyTextToClipboard(
      orderText,
      "Supplier order text copied!",
      "Failed to copy supplier order text."
    );
  }

  async function handleCopySupplierPayload(supplier) {
    const supplierItems = activeItemsBySupplier[supplier] || [];
    const payload = buildSupplierOrderPayload(supplier, supplierItems);

    if (payload.items.length === 0) {
      alert("There are no supplier items to copy.");
      return;
    }

    await copyTextToClipboard(
      JSON.stringify(payload, null, 2),
      "Supplier automation payload copied!",
      "Failed to copy supplier automation payload."
    );
  }

  function handleSendAllSuppliersToQueue() {
    if (sendableSuppliers.length === 0) {
      if (activeSuppliers.length > 0) {
        alert("All active suppliers have locked snapshots. Create a revision first.");
        return;
      }

      alert("There are no supplier items to send.");
      return;
    }

    const suppliersWithDuplicateSnapshot = sendableSuppliers.filter((supplier) => {
      const revisionNumber = getRevisionToSend(supplier);
      if (!revisionNumber) return true;

      const supplierItems = activeItemsBySupplier[supplier] || [];
      const snapshot = buildSupplierOrderSnapshot(
        supplier,
        supplierItems.map((item) => ({
          name: item.name,
          quantity: item.orderAmount,
          unit: item.unit,
        })),
        revisionNumber
      );

      return hasDuplicateSnapshot(snapshot);
    });

    if (suppliersWithDuplicateSnapshot.length > 0) {
      setSnapshotWarnings((previous) => {
        const next = { ...previous };
        suppliersWithDuplicateSnapshot.forEach((supplier) => {
          next[supplier] =
            "An identical snapshot already exists in supplier order history. Change quantities before sending.";
        });
        return next;
      });
    }

    const suppliersReadyToSend = sendableSuppliers.filter(
      (supplier) => !suppliersWithDuplicateSnapshot.includes(supplier)
    );

    if (suppliersReadyToSend.length === 0) {
      alert("No supplier order was sent because all snapshots are duplicates.");
      return;
    }

    const createdJobs = suppliersReadyToSend.map((supplier) => {
      const supplierItems = activeItemsBySupplier[supplier] || [];
      const revisionNumber = getRevisionToSend(supplier);

      return addAutomationJob(
        buildSupplierOrderAutomationJob(supplier, supplierItems, {
          revisionNumber,
        })
      );
    });

    suppliersReadyToSend.forEach((supplier) => {
      clearRevisionDraftForSupplier(supplier);
      clearSupplierWarning(supplier);
    });

    refreshExecutionData();
    alert(`${createdJobs.length} supplier order job(s) created.`);
    setCurrentPage(PAGE_IDS.AUTOMATION);
  }

  async function handleCopyAllOrdersText() {
    const allOrderText = activeSuppliers
      .map((supplier) =>
        buildSupplierOrderText(supplier, activeItemsBySupplier[supplier] || [])
      )
      .filter(Boolean)
      .join("\n\n");

    if (!allOrderText) {
      alert("There are no supplier orders to copy.");
      return;
    }

    await copyTextToClipboard(
      allOrderText,
      "All supplier orders copied!",
      "Failed to copy supplier orders."
    );
  }

  return (
    <div>
      <h1>Supplier Order Review</h1>

      <PageActionBar marginBottom="15px">
        <button
          onClick={handleCopyAllOrdersText}
          disabled={activeSuppliers.length === 0}
          style={{
            ...styles.primaryButton,
            backgroundColor: activeSuppliers.length === 0 ? "#888" : "#4CAF50",
            cursor: activeSuppliers.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Copy ALL Orders Text
        </button>

        <button
          onClick={handleSendAllSuppliersToQueue}
          disabled={sendableSuppliers.length === 0}
          style={{
            ...styles.primaryButton,
            backgroundColor: sendableSuppliers.length === 0 ? "#888" : "#ff9800",
            cursor: sendableSuppliers.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Send ALL Suppliers To Queue
        </button>

        <button
          onClick={() => setShowHistory((prev) => !prev)}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#607d8b",
          }}
        >
          {showHistory ? "Hide Supplier Order History" : "View Supplier Order History"}
        </button>
      </PageActionBar>

      {showHistory && (
        <div style={{ ...styles.darkPanel, marginBottom: "16px" }}>
          <h3 style={{ marginTop: 0 }}>Supplier Order History</h3>

          {supplierOrderHistory.length === 0 ? (
            <div style={styles.emptyState}>No supplier order history yet.</div>
          ) : (
            <div
              style={{
                border: "1px solid #444",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <SectionTableHeader
                columns={[
                  "Supplier",
                  "Revision",
                  "Snapshot At",
                  "Items",
                  "Total Qty",
                  "Status",
                ]}
                gridTemplateColumns="1fr 0.5fr 1.2fr 0.5fr 0.7fr 0.8fr"
              />

              {supplierOrderHistory.map((entry) => (
                <div
                  key={`history-${entry.jobId}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 0.5fr 1.2fr 0.5fr 0.7fr 0.8fr",
                    gap: "8px",
                    alignItems: "center",
                    padding: "10px",
                    borderBottom: "1px solid #333",
                  }}
                >
                  <div>{entry.supplier || UNKNOWN_SUPPLIER_LABEL}</div>
                  <div>Rev {entry.revisionNumber || 1}</div>
                  <div>{formatDateTime(entry.snapshotTimestamp || entry.timestamp)}</div>
                  <div>{(entry.items || []).length}</div>
                  <div>{entry.totalQuantity || 0}</div>
                  <div>{entry.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {suppliers.length === 0 ? (
        <div style={styles.emptyState}>
          No items with order amount greater than zero.
        </div>
      ) : (
        <div>
          {activeSuppliers.length === 0 && (
            <NoticePanel backgroundColor="#1f1f1f">
              No supplier has order amount greater than zero right now.
            </NoticePanel>
          )}

          {suppliers.map((supplier) => {
            const supplierItems = sortedSupplierGroups[supplier] || [];
            const summary = getSupplierSummary(supplier);
            const hasActiveItems = summary.totalItems > 0;
            const latestRevision = Number(latestRevisionBySupplier[supplier] || 0);
            const hasSentSnapshot = latestRevision > 0;
            const draftRevision = Number(revisionDraftBySupplier[supplier] || 0);
            const isSnapshotLocked = hasSentSnapshot && draftRevision === 0;
            const currentRevision = draftRevision || (hasSentSnapshot ? latestRevision : 1);
            const canSendSupplier = hasActiveItems && (!hasSentSnapshot || draftRevision > 0);
            const executionInfo = getSupplierExecutionInfo(supplier);
            const executionColors = getExecutionStatusColors(executionInfo.status);
            const supplierWarning = snapshotWarnings[supplier];

            return (
              <div key={supplier} style={{ marginBottom: "26px" }}>
                <PageActionBar marginBottom="10px" alignItems="center" gap="10px">
                  <h2 style={{ margin: 0 }}>{supplier}</h2>

                  <StatusBadge
                    label="Status"
                    value={executionInfo.status}
                    backgroundColor={executionColors.backgroundColor}
                    textColor={executionColors.textColor}
                    padding="6px 10px"
                    fontSize="12px"
                  />

                  <StatusBadge
                    label="Rev"
                    value={currentRevision}
                    backgroundColor="#1f1f1f"
                    textColor="white"
                    padding="6px 10px"
                    fontSize="12px"
                  />

                  <span style={{ color: "#aaa", fontSize: "13px" }}>
                    {summary.totalItems} item(s)
                  </span>

                  <span style={{ color: "#aaa", fontSize: "13px" }}>
                    {summary.totalOrderQuantity} total qty
                  </span>

                  {summary.hasEstimatedValue && (
                    <span style={{ color: "#aaa", fontSize: "13px" }}>
                      Est. ${summary.totalEstimatedValue.toFixed(2)}
                    </span>
                  )}
                </PageActionBar>

                <div style={{ color: "#aaa", fontSize: "12px", marginBottom: "8px" }}>
                  Last sent: {formatDateTime(executionInfo.lastSentAt)} | Attempts:{" "}
                  {executionInfo.attempts}
                </div>

                {isSnapshotLocked && (
                  <NoticePanel
                    backgroundColor="#1f1f1f"
                    border="1px solid #555"
                    color="#f5d98b"
                    padding="10px"
                    marginBottom="10px"
                  >
                    LOCKED SNAPSHOT (Rev {latestRevision}). Create a new revision to
                    send updated quantities.
                  </NoticePanel>
                )}

                {supplierWarning && (
                  <NoticePanel
                    backgroundColor="#3a1f1f"
                    border="1px solid #7a2d2d"
                    color="#ffb3b3"
                    padding="10px"
                    marginBottom="10px"
                  >
                    {supplierWarning}
                  </NoticePanel>
                )}

                <SectionTableHeader
                  columns={["Item", "Current", "Ideal", "Order"]}
                  gridTemplateColumns="1.2fr 0.7fr 0.7fr 1fr"
                  gap="6px"
                  padding="6px 10px"
                  marginBottom="6px"
                />

                {supplierItems.length === 0 ? (
                  <div style={styles.emptyState}>
                    No items mapped for this supplier.
                  </div>
                ) : (
                  supplierItems.map((item) => (
                    <div
                      key={`${supplier}-${item.id}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 0.7fr 0.7fr 1fr",
                        gap: "6px",
                        alignItems: "center",
                        border: "1px solid #ddd",
                        padding: "6px 10px",
                        marginBottom: "4px",
                        borderRadius: "6px",
                      }}
                    >
                      <div>
                        <strong>{item.name}</strong>
                      </div>
                      <div>{item.currentStock}</div>
                      <div>{item.idealStock}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.orderAmount}
                          onChange={(event) =>
                            handleOrderAmountChange(item.id, event.target.value)
                          }
                          style={{
                            width: "100px",
                            padding: "5px 8px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                            boxSizing: "border-box",
                          }}
                        />
                        <span>{item.unit}</span>
                      </div>
                    </div>
                  ))
                )}

                {!hasActiveItems && (
                  <div style={{ ...styles.emptyState, marginBottom: "10px" }}>
                    No items with order amount greater than zero for this supplier.
                  </div>
                )}

                <PageActionBar marginBottom="0">
                  <button
                    onClick={() => handleCopySupplierText(supplier)}
                    disabled={!hasActiveItems}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: !hasActiveItems ? "#888" : "#4CAF50",
                      cursor: !hasActiveItems ? "not-allowed" : "pointer",
                    }}
                  >
                    Copy {supplier} Order Text
                  </button>

                  <button
                    onClick={() => handleCopySupplierPayload(supplier)}
                    disabled={!hasActiveItems}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: !hasActiveItems ? "#888" : "#6f42c1",
                      cursor: !hasActiveItems ? "not-allowed" : "pointer",
                    }}
                  >
                    Copy {supplier} Payload
                  </button>

                  <button
                    onClick={() => handleSendSupplierToQueue(supplier)}
                    disabled={!canSendSupplier}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: !canSendSupplier ? "#888" : "#ff9800",
                      cursor: !canSendSupplier ? "not-allowed" : "pointer",
                    }}
                  >
                    Send {supplier} To Queue
                  </button>

                  <button
                    onClick={() => createNewRevisionForSupplier(supplier)}
                    disabled={!hasSentSnapshot || draftRevision > 0}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor:
                        !hasSentSnapshot || draftRevision > 0 ? "#888" : "#607d8b",
                      cursor:
                        !hasSentSnapshot || draftRevision > 0
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    Create New Revision
                  </button>
                </PageActionBar>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SupplierOrderReviewPage;
