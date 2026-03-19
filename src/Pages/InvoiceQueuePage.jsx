import { useMemo, useState } from "react";
import { INVOICE_INTAKE_STATUSES, PAGE_IDS } from "../constants/app";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";
import StatusBadge from "../components/StatusBadge";
import { styles } from "../utils/uiStyles";
import {
  completeInvoiceBotExecution,
  enqueueInvoiceForBot,
  getInvoiceQueue,
  getInvoiceQueueCounts,
  replaceInvoiceQueue,
} from "../utils/invoiceQueue";
import { executeInvoiceIntake } from "../utils/botServiceClient";
import { buildInvoiceAutomationPayload } from "../utils/invoiceParsing";

const MOCK_PORTAL_URL = String(
  import.meta.env.VITE_MOCK_PORTAL_URL || "http://localhost:4177"
).replace(/\/+$/, "");

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: INVOICE_INTAKE_STATUSES.QUEUED, label: "Queued" },
  { value: INVOICE_INTAKE_STATUSES.FAILED, label: "Failed" },
  { value: INVOICE_INTAKE_STATUSES.EXECUTED, label: "Executed" },
];

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getStatusColors(status) {
  if (status === INVOICE_INTAKE_STATUSES.QUEUED) {
    return { backgroundColor: "#fff3e0", textColor: "#ff9800" };
  }

  if (status === INVOICE_INTAKE_STATUSES.EXECUTED) {
    return { backgroundColor: "#e8f5e9", textColor: "#4CAF50" };
  }

  if (status === INVOICE_INTAKE_STATUSES.FAILED) {
    return { backgroundColor: "#ffebee", textColor: "#d9534f" };
  }

  return { backgroundColor: "#2a2a2a", textColor: "#aaa" };
}

function getNoticeStyle(tone) {
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

function normalizeAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function getInvoicePayload(invoice) {
  const lastPayload = invoice?.executionMetadata?.lastPayload;
  if (lastPayload && Array.isArray(lastPayload.items) && lastPayload.items.length > 0) {
    return lastPayload;
  }

  return buildInvoiceAutomationPayload(invoice);
}

function isCurrentMonth(dateValue) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function InvoiceQueuePage({ setCurrentPage }) {
  const [invoiceQueue, setInvoiceQueue] = useState(() => getInvoiceQueue());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openPayloadInvoiceId, setOpenPayloadInvoiceId] = useState("");
  const [activeRetryInvoiceId, setActiveRetryInvoiceId] = useState("");
  const [isRetryingAllFailed, setIsRetryingAllFailed] = useState(false);
  const [retryProgress, setRetryProgress] = useState({
    current: 0,
    total: 0,
    label: "",
  });
  const [pageNotice, setPageNotice] = useState({
    tone: "",
    message: "",
  });

  const counts = useMemo(() => getInvoiceQueueCounts(invoiceQueue), [invoiceQueue]);

  const totalSpend = useMemo(
    () =>
      invoiceQueue.reduce(
        (sum, invoice) => sum + normalizeAmount(invoice.totalAmount),
        0
      ),
    [invoiceQueue]
  );

  const currentMonthSpend = useMemo(
    () =>
      invoiceQueue
        .filter((invoice) =>
          isCurrentMonth(invoice.invoiceDate || invoice.updatedAt || invoice.createdAt)
        )
        .reduce((sum, invoice) => sum + normalizeAmount(invoice.totalAmount), 0),
    [invoiceQueue]
  );

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = String(search || "").trim().toLowerCase();

    return invoiceQueue.filter((invoice) => {
      const statusMatch =
        statusFilter === "all" ? true : invoice.status === statusFilter;

      const searchMatch =
        normalizedSearch === ""
          ? true
          : String(invoice.supplier || "").toLowerCase().includes(normalizedSearch) ||
            String(invoice.invoiceNumber || "")
              .toLowerCase()
              .includes(normalizedSearch);

      return statusMatch && searchMatch;
    });
  }, [invoiceQueue, search, statusFilter]);

  function refreshInvoiceQueue() {
    setInvoiceQueue(getInvoiceQueue());
  }

  function setNotice(tone, message) {
    setPageNotice({ tone, message });
  }

  async function retryInvoice(invoice, options = {}) {
    const { fromBatch = false } = options;
    const payload = getInvoicePayload(invoice);

    if (!payload?.items || payload.items.length === 0) {
      if (!fromBatch) {
        setNotice("warning", "Invoice payload has no valid items for retry.");
      }
      return { ok: false, reason: "invalid-payload" };
    }

    try {
      setActiveRetryInvoiceId(invoice.id);

      if (!fromBatch) {
        setNotice(
          "info",
          `Retrying invoice ${invoice.invoiceNumber || invoice.id}...`
        );
      }

      const { invoice: queuedInvoice } = enqueueInvoiceForBot({
        ...invoice,
        executionMetadata: {
          ...(invoice.executionMetadata || {}),
          lastPayload: payload,
        },
      });

      refreshInvoiceQueue();

      const executionResult = await executeInvoiceIntake(payload);
      completeInvoiceBotExecution(queuedInvoice.id, executionResult);
      refreshInvoiceQueue();

      const ok =
        executionResult.ok &&
        executionResult.status === INVOICE_INTAKE_STATUSES.EXECUTED;

      if (!fromBatch) {
        setNotice(
          ok ? "success" : "error",
          ok
            ? "Invoice retry executed successfully."
            : executionResult.message ||
                executionResult.notes ||
                "Invoice retry failed."
        );
      }

      return { ok };
    } catch (error) {
      completeInvoiceBotExecution(invoice.id, {
        ok: false,
        status: INVOICE_INTAKE_STATUSES.FAILED,
        errorCode: "BOT_SERVICE_UNREACHABLE",
        message: error?.message || "Failed to reach invoice bot service.",
      });
      refreshInvoiceQueue();

      if (!fromBatch) {
        setNotice(
          "error",
          error?.message || "Failed to reach invoice bot service."
        );
      }

      return { ok: false, reason: "transport-error" };
    } finally {
      setActiveRetryInvoiceId("");
    }
  }

  async function handleRetryInvoice(invoice) {
    if (invoice.status !== INVOICE_INTAKE_STATUSES.FAILED) {
      setNotice("warning", "Retry is available only for FAILED invoices.");
      return;
    }

    if (isRetryingAllFailed) {
      setNotice("warning", "Batch retry is in progress. Wait for completion.");
      return;
    }

    if (activeRetryInvoiceId && activeRetryInvoiceId !== invoice.id) {
      setNotice("warning", "Another invoice retry is already in progress.");
      return;
    }

    await retryInvoice(invoice);
  }

  async function handleRetryAllFailed() {
    const failedInvoices = invoiceQueue.filter(
      (invoice) => invoice.status === INVOICE_INTAKE_STATUSES.FAILED
    );

    if (failedInvoices.length === 0) {
      setNotice("warning", "There are no FAILED invoices to retry.");
      return;
    }

    if (isRetryingAllFailed || activeRetryInvoiceId) {
      setNotice("warning", "Another retry is currently in progress.");
      return;
    }

    try {
      setIsRetryingAllFailed(true);
      let successCount = 0;
      let failedCount = 0;

      for (let index = 0; index < failedInvoices.length; index += 1) {
        const invoice = failedInvoices[index];
        setRetryProgress({
          current: index + 1,
          total: failedInvoices.length,
          label: invoice.invoiceNumber || invoice.id,
        });
        setNotice(
          "info",
          `Retrying invoice ${index + 1} of ${failedInvoices.length}: ${
            invoice.invoiceNumber || invoice.id
          }...`
        );

        const outcome = await retryInvoice(invoice, {
          fromBatch: true,
        });
        if (outcome.ok) {
          successCount += 1;
        } else {
          failedCount += 1;
        }
      }

      setNotice(
        failedCount > 0 ? "warning" : "success",
        `Retry all failed finished. Success: ${successCount} | Failed: ${failedCount}`
      );
    } finally {
      setIsRetryingAllFailed(false);
      setRetryProgress({
        current: 0,
        total: 0,
        label: "",
      });
      refreshInvoiceQueue();
    }
  }

  function handleDeleteInvoice(invoiceId) {
    const nextQueue = getInvoiceQueue().filter((invoice) => invoice.id !== invoiceId);
    const normalizedQueue = replaceInvoiceQueue(nextQueue);
    setInvoiceQueue(normalizedQueue);
    if (openPayloadInvoiceId === invoiceId) {
      setOpenPayloadInvoiceId("");
    }
    setNotice("success", "Invoice removed from queue.");
  }

  function handleOpenSupplierPortal() {
    window.open(MOCK_PORTAL_URL, "_blank");
  }

  function handleViewScreenshot(invoice) {
    const screenshot = invoice?.executionMetadata?.screenshot;
    if (!screenshot) {
      setNotice("warning", "No screenshot available for this invoice.");
      return;
    }

    window.open(screenshot, "_blank");
  }

  return (
    <div>
      <h1>Invoice Queue</h1>

      <PageActionBar>
        <button
          onClick={() => setCurrentPage(PAGE_IDS.INVOICE_INTAKE)}
          style={styles.backButton}
        >
          Back To Invoice Intake
        </button>

        <button
          onClick={refreshInvoiceQueue}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#2196F3",
          }}
        >
          Refresh Queue
        </button>

        <button
          onClick={handleRetryAllFailed}
          disabled={counts.failed === 0 || isRetryingAllFailed || !!activeRetryInvoiceId}
          style={{
            ...styles.primaryButton,
            backgroundColor:
              counts.failed === 0 || isRetryingAllFailed || !!activeRetryInvoiceId
                ? "#888"
                : "#d9534f",
            cursor:
              counts.failed === 0 || isRetryingAllFailed || !!activeRetryInvoiceId
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isRetryingAllFailed
            ? "Retrying All Failed..."
            : `Retry All Failed (${counts.failed})`}
        </button>
      </PageActionBar>

      <PageActionBar marginBottom="14px">
        <StatusBadge
          label="Total"
          value={counts.total}
          backgroundColor="#1f1f1f"
          textColor="white"
        />
        <StatusBadge
          label="Queued"
          value={counts.queued}
          backgroundColor="#fff3e0"
          textColor="#ff9800"
        />
        <StatusBadge
          label="Failed"
          value={counts.failed}
          backgroundColor="#ffebee"
          textColor="#d9534f"
        />
        <StatusBadge
          label="Executed"
          value={counts.executed}
          backgroundColor="#e8f5e9"
          textColor="#4CAF50"
        />
        <StatusBadge
          label="Total Spend"
          value={totalSpend.toFixed(2)}
          backgroundColor="#1f1f1f"
          textColor="#9be79b"
        />
        <StatusBadge
          label="Month Spend"
          value={currentMonthSpend.toFixed(2)}
          backgroundColor="#1f1f1f"
          textColor="#8de0ea"
        />
      </PageActionBar>

      <PageActionBar alignItems="center">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            minWidth: "180px",
          }}
        >
          {STATUS_FILTERS.map((filterOption) => (
            <option key={filterOption.value} value={filterOption.value}>
              {filterOption.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search supplier or invoice number..."
          style={{
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            minWidth: "280px",
          }}
        />
      </PageActionBar>

      {pageNotice.message && (
        <NoticePanel {...getNoticeStyle(pageNotice.tone)} marginBottom="12px">
          {pageNotice.message}
        </NoticePanel>
      )}

      {isRetryingAllFailed && retryProgress.total > 0 && (
        <NoticePanel
          backgroundColor="#1f1f1f"
          border="1px solid #555"
          color="#8de0ea"
          marginBottom="12px"
        >
          Retrying invoice {retryProgress.current} of {retryProgress.total}:{" "}
          {retryProgress.label}
        </NoticePanel>
      )}

      <SectionTableHeader
        columns={["Supplier", "Invoice", "Amount", "Status", "Attempts"]}
        gridTemplateColumns="1.4fr 1fr 0.8fr 0.8fr 0.8fr"
      />

      {filteredInvoices.length === 0 ? (
        <div style={styles.emptyState}>No invoices found for current filters.</div>
      ) : (
        filteredInvoices.map((invoice) => {
          const statusColors = getStatusColors(invoice.status);
          const payload = getInvoicePayload(invoice);
          const hasScreenshot = Boolean(invoice?.executionMetadata?.screenshot);
          const isRetryingThis = activeRetryInvoiceId === invoice.id;
          const canRetry =
            invoice.status === INVOICE_INTAKE_STATUSES.FAILED &&
            !isRetryingAllFailed &&
            !activeRetryInvoiceId;

          return (
            <div
              key={invoice.id}
              style={{
                ...styles.darkPanel,
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 0.8fr 0.8fr 0.8fr",
                  gap: "8px",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <strong>{invoice.supplier || "Unknown Supplier"}</strong>
                </div>
                <div>
                  <strong>{invoice.invoiceNumber || "-"}</strong>
                  <div style={{ color: "#aaa", fontSize: "12px" }}>
                    {invoice.invoiceDate || "-"}
                  </div>
                </div>
                <div>{normalizeAmount(invoice.totalAmount).toFixed(2)}</div>
                <StatusBadge
                  label="Status"
                  value={invoice.status || INVOICE_INTAKE_STATUSES.DRAFT}
                  backgroundColor={statusColors.backgroundColor}
                  textColor={statusColors.textColor}
                  fontSize="12px"
                  padding="6px 10px"
                />
                <div>{invoice.attempts || 0}</div>
              </div>

              <div style={{ color: "#aaa", fontSize: "13px", marginBottom: "10px" }}>
                Execution ID: {invoice.executionMetadata?.executionId || "-"}
                {" | "}Duration: {invoice.executionMetadata?.duration || 0} ms
                {" | "}Queued:{" "}
                {formatDateTime(invoice.executionMetadata?.lastQueuedAt)}
                {" | "}Updated: {formatDateTime(invoice.updatedAt)}
              </div>

              {invoice.status === INVOICE_INTAKE_STATUSES.FAILED && (
                <NoticePanel
                  backgroundColor="#3a1f1f"
                  border="1px solid #7a2d2d"
                  color="#ffb3b3"
                  marginBottom="10px"
                  padding="10px"
                >
                  {invoice.executionMetadata?.lastErrorMessage ||
                    "Invoice execution failed without a detailed error message."}
                </NoticePanel>
              )}

              {hasScreenshot && (
                <div style={{ marginBottom: "10px" }}>
                  <img
                    src={invoice.executionMetadata.screenshot}
                    alt={`Invoice ${invoice.invoiceNumber || invoice.id}`}
                    style={{
                      maxWidth: "360px",
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #444",
                    }}
                  />
                </div>
              )}

              {openPayloadInvoiceId === invoice.id && (
                <div style={{ marginBottom: "10px" }}>
                  <textarea
                    readOnly
                    value={JSON.stringify(payload, null, 2)}
                    style={{
                      width: "100%",
                      minHeight: "180px",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #555",
                      backgroundColor: "#111",
                      color: "white",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              <PageActionBar marginBottom="0">
                {invoice.status === INVOICE_INTAKE_STATUSES.FAILED && (
                  <button
                    onClick={() => handleRetryInvoice(invoice)}
                    disabled={!canRetry}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: canRetry ? "#d9534f" : "#888",
                      cursor: canRetry ? "pointer" : "not-allowed",
                    }}
                  >
                    {isRetryingThis ? "Retrying..." : "Retry"}
                  </button>
                )}

                <button
                  onClick={() =>
                    setOpenPayloadInvoiceId((previous) =>
                      previous === invoice.id ? "" : invoice.id
                    )
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: "#6f42c1",
                  }}
                >
                  {openPayloadInvoiceId === invoice.id ? "Hide Payload" : "View Payload"}
                </button>

                <button
                  onClick={() => handleDeleteInvoice(invoice.id)}
                  disabled={isRetryingAllFailed || !!activeRetryInvoiceId}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      isRetryingAllFailed || !!activeRetryInvoiceId ? "#888" : "#d9534f",
                    cursor:
                      isRetryingAllFailed || !!activeRetryInvoiceId
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Delete
                </button>

                <button
                  onClick={handleOpenSupplierPortal}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: "#795548",
                  }}
                >
                  Open Supplier Portal
                </button>

                <button
                  onClick={() => handleViewScreenshot(invoice)}
                  disabled={!hasScreenshot}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: hasScreenshot ? "#607d8b" : "#888",
                    cursor: hasScreenshot ? "pointer" : "not-allowed",
                  }}
                >
                  View Screenshot
                </button>
              </PageActionBar>
            </div>
          );
        })
      )}
    </div>
  );
}

export default InvoiceQueuePage;
