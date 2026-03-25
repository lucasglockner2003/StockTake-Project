import { useEffect, useMemo, useState } from "react";
import { SUPPLIER_ORDER_EXECUTION_STATUSES } from "../constants/app";
import { USER_ROLES } from "../constants/access-control";
import { useAuth } from "../hooks/use-auth";
import {
  clearSupplierOrderHistory,
  ensureSupplierOrderHistoryLoaded,
  getSupplierOrderHistory,
  refreshSupplierOrderHistory,
  subscribeSupplierOrderHistory,
} from "../utils/supplierHistory";
import { UNKNOWN_SUPPLIER_LABEL } from "../utils/stock";
import { styles } from "../utils/uiStyles";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";
import StatusBadge from "../components/StatusBadge";

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
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function SupplierOrderReviewPage() {
  const { user } = useAuth();
  const [supplierOrderHistory, setSupplierOrderHistory] = useState(() =>
    getSupplierOrderHistory()
  );
  const [loading, setLoading] = useState(false);
  const [historyNotice, setHistoryNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canManageHistory = user?.role === USER_ROLES.ADMIN;

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeSupplierOrderHistory(() => {
      if (!isMounted) {
        return;
      }

      setSupplierOrderHistory(getSupplierOrderHistory());
    });

    async function loadHistory() {
      try {
        setLoading(true);
        setErrorMessage("");
        await ensureSupplierOrderHistoryLoaded();

        if (!isMounted) {
          return;
        }

        setSupplierOrderHistory(getSupplierOrderHistory());
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error?.message || "Failed to load supplier order history.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  async function handleRefreshHistory() {
    try {
      setLoading(true);
      setErrorMessage("");
      setHistoryNotice("");
      await refreshSupplierOrderHistory();
      setSupplierOrderHistory(getSupplierOrderHistory());
    } catch (error) {
      setErrorMessage(error?.message || "Failed to refresh supplier order history.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClearHistory() {
    const confirmed = window.confirm(
      "Are you sure you want to delete all supplier order history?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");
      await clearSupplierOrderHistory();
      setSupplierOrderHistory([]);
      setHistoryNotice("Supplier order history deleted.");
    } catch (error) {
      setErrorMessage(error?.message || "Failed to delete supplier order history.");
    }
  }

  const totalOrders = supplierOrderHistory.length;
  const totalQuantity = useMemo(
    () =>
      supplierOrderHistory.reduce(
        (sum, entry) => sum + Number(entry.totalQuantity || 0),
        0
      ),
    [supplierOrderHistory]
  );

  return (
    <div>
      <h1>History Orders</h1>

      {!canManageHistory ? (
        <NoticePanel
          backgroundColor="#1f1f1f"
          border="1px solid #555"
          color="#8de0ea"
        >
          Read-only access. Managers can audit supplier revisions but only admins can clear history.
        </NoticePanel>
      ) : null}

      {errorMessage ? (
        <NoticePanel
          backgroundColor="#3a1f1f"
          border="1px solid #7a2d2d"
          color="#ffb3b3"
        >
          {errorMessage}
        </NoticePanel>
      ) : null}

      <PageActionBar marginBottom="14px" alignItems="center">
        <button
          onClick={handleRefreshHistory}
          disabled={loading}
          style={{
            ...styles.primaryButton,
            backgroundColor: loading ? "#888" : "#607d8b",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Refreshing..." : "Refresh History"}
        </button>

        <button
          onClick={handleClearHistory}
          disabled={!canManageHistory || supplierOrderHistory.length === 0}
          style={{
            ...styles.primaryButton,
            backgroundColor:
              !canManageHistory || supplierOrderHistory.length === 0
                ? "#888"
                : "#dc2626",
            cursor:
              !canManageHistory || supplierOrderHistory.length === 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          Delete History
        </button>

        <StatusBadge
          label="Orders"
          value={totalOrders}
          backgroundColor="#1f1f1f"
          textColor="white"
        />

        <StatusBadge
          label="Total Qty"
          value={totalQuantity}
          backgroundColor="#1f1f1f"
          textColor="white"
        />
      </PageActionBar>

      {historyNotice ? (
        <NoticePanel
          backgroundColor="#102410"
          border="1px solid #2f6f2f"
          color="#9be79b"
          marginBottom="12px"
        >
          {historyNotice}
        </NoticePanel>
      ) : null}

      {supplierOrderHistory.length === 0 ? (
        <div style={styles.emptyState}>No supplier order history yet.</div>
      ) : (
        <div style={{ ...styles.darkPanel, marginBottom: "0" }}>
          <NoticePanel
            backgroundColor="#1f1f1f"
            border="1px solid #555"
            color="#8de0ea"
            marginBottom="12px"
          >
            Read-only history of supplier orders already sent to queue.
          </NoticePanel>

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
              gridTemplateColumns="1fr 0.55fr 1.2fr 0.55fr 0.7fr 0.9fr"
            />

            {supplierOrderHistory.map((entry, index) => {
              const status = entry.status || SUPPLIER_ORDER_EXECUTION_STATUSES.PENDING;
              const colors = getExecutionStatusColors(status);

              return (
                <div
                  key={`history-${entry.jobId || "unknown"}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 0.55fr 1.2fr 0.55fr 0.7fr 0.9fr",
                    gap: "8px",
                    alignItems: "center",
                    padding: "10px",
                    borderBottom:
                      index === supplierOrderHistory.length - 1
                        ? "none"
                        : "1px solid #333",
                  }}
                >
                  <div>{entry.supplier || UNKNOWN_SUPPLIER_LABEL}</div>
                  <div>Rev {entry.revisionNumber || 1}</div>
                  <div>{formatDateTime(entry.snapshotTimestamp || entry.timestamp)}</div>
                  <div>{(entry.items || []).length}</div>
                  <div>{entry.totalQuantity || 0}</div>
                  <div>
                    <StatusBadge
                      label="Status"
                      value={status}
                      backgroundColor={colors.backgroundColor}
                      textColor={colors.textColor}
                      padding="5px 8px"
                      fontSize="11px"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SupplierOrderReviewPage;
