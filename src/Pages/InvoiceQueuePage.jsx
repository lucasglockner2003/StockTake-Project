import { useEffect, useMemo, useState } from "react";
import { INVOICE_INTAKE_STATUSES } from "../constants/app";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import SectionTableHeader from "../components/SectionTableHeader";
import StatusBadge from "../components/StatusBadge";
import { styles } from "../utils/uiStyles";
import {
  deleteInvoice,
  ensureInvoiceQueueLoaded,
  executeInvoice,
  getInvoiceQueue,
  getInvoiceQueueCounts,
  refreshInvoiceQueue as refreshInvoiceQueueRequest,
  retryInvoice,
  subscribeInvoiceQueue,
} from "../utils/invoiceQueue";
import { buildInvoiceAutomationPayload } from "../utils/invoiceParsing";
import { runtimeConfig } from "../services/runtime-config";
import { buildBotAssetUrl } from "../utils/botServiceClient";

const MOCK_PORTAL_URL = runtimeConfig.mockPortalUrl || "http://localhost:4177";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: INVOICE_INTAKE_STATUSES.QUEUED, label: "Queued" },
  { value: INVOICE_INTAKE_STATUSES.FAILED, label: "Failed" },
  { value: INVOICE_INTAKE_STATUSES.EXECUTED, label: "Executed" },
];

const MONTH_FILTERS = [
  { value: "all", label: "All" },
  { value: "current-month", label: "Current Month" },
  { value: "last-30-days", label: "Last 30 Days" },
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

function formatMoney(value) {
  return normalizeAmount(value).toFixed(2);
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0.0%";
  return `${numeric.toFixed(1)}%`;
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

function isWithinLastDays(dateValue, days) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const now = Date.now();
  const diff = now - date.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function getInvoiceReferenceDate(invoice) {
  return invoice.invoiceDate || invoice.updatedAt || invoice.createdAt || "";
}

function InvoiceQueuePage() {
  const [invoiceQueue, setInvoiceQueue] = useState(() => getInvoiceQueue());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [openPayloadInvoiceId, setOpenPayloadInvoiceId] = useState("");
  const [activeExecuteInvoiceId, setActiveExecuteInvoiceId] = useState("");
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

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeInvoiceQueue(() => {
      if (!isMounted) {
        return;
      }

      setInvoiceQueue(getInvoiceQueue());
    });

    ensureInvoiceQueueLoaded()
      .then(() => {
        if (!isMounted) {
          return;
        }

        setInvoiceQueue(getInvoiceQueue());
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        console.warn("[invoice-queue] Failed to load initial invoice queue.", error);
        setNotice(
          "error",
          error?.message || "Failed to load invoices from backend."
        );
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const allCounts = useMemo(() => getInvoiceQueueCounts(invoiceQueue), [invoiceQueue]);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = String(search || "").trim().toLowerCase();

    return invoiceQueue.filter((invoice) => {
      const monthMatch =
        monthFilter === "all"
          ? true
          : monthFilter === "current-month"
            ? isCurrentMonth(getInvoiceReferenceDate(invoice))
            : isWithinLastDays(getInvoiceReferenceDate(invoice), 30);

      const statusMatch =
        statusFilter === "all" ? true : invoice.status === statusFilter;

      const searchMatch =
        normalizedSearch === ""
          ? true
          : String(invoice.supplier || "").toLowerCase().includes(normalizedSearch) ||
            String(invoice.invoiceNumber || "")
              .toLowerCase()
              .includes(normalizedSearch);

      return monthMatch && statusMatch && searchMatch;
    });
  }, [invoiceQueue, search, statusFilter, monthFilter]);

  const summaryMetrics = useMemo(() => {
    const totalSpend = filteredInvoices.reduce(
      (sum, invoice) => sum + normalizeAmount(invoice.totalAmount),
      0
    );
    const executedSpend = filteredInvoices
      .filter((invoice) => invoice.status === INVOICE_INTAKE_STATUSES.EXECUTED)
      .reduce((sum, invoice) => sum + normalizeAmount(invoice.totalAmount), 0);
    const failedCount = filteredInvoices.filter(
      (invoice) => invoice.status === INVOICE_INTAKE_STATUSES.FAILED
    ).length;
    const executedCount = filteredInvoices.filter(
      (invoice) => invoice.status === INVOICE_INTAKE_STATUSES.EXECUTED
    ).length;

    return {
      totalSpend,
      executedSpend,
      failedCount,
      executedCount,
    };
  }, [filteredInvoices]);

  const supplierSpendRows = useMemo(() => {
    const groups = filteredInvoices.reduce((acc, invoice) => {
      const supplier = invoice.supplier || "Unknown Supplier";
      if (!acc[supplier]) {
        acc[supplier] = {
          supplier,
          invoiceCount: 0,
          totalSpend: 0,
          executedSpend: 0,
          failedCount: 0,
        };
      }

      const amount = normalizeAmount(invoice.totalAmount);
      acc[supplier].invoiceCount += 1;
      acc[supplier].totalSpend += amount;
      if (invoice.status === INVOICE_INTAKE_STATUSES.EXECUTED) {
        acc[supplier].executedSpend += amount;
      }
      if (invoice.status === INVOICE_INTAKE_STATUSES.FAILED) {
        acc[supplier].failedCount += 1;
      }

      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [filteredInvoices]);

  const supplierPerformanceRows = useMemo(() => {
    const groups = filteredInvoices.reduce((acc, invoice) => {
      const supplier = invoice.supplier || "Unknown Supplier";
      if (!acc[supplier]) {
        acc[supplier] = {
          supplier,
          invoiceCount: 0,
          executedInvoiceCount: 0,
          failedInvoiceCount: 0,
          totalSpend: 0,
          executedSpend: 0,
        };
      }

      const amount = normalizeAmount(invoice.totalAmount);
      acc[supplier].invoiceCount += 1;
      acc[supplier].totalSpend += amount;
      if (invoice.status === INVOICE_INTAKE_STATUSES.EXECUTED) {
        acc[supplier].executedInvoiceCount += 1;
        acc[supplier].executedSpend += amount;
      }
      if (invoice.status === INVOICE_INTAKE_STATUSES.FAILED) {
        acc[supplier].failedInvoiceCount += 1;
      }

      return acc;
    }, {});

    return Object.values(groups)
      .map((supplierRow) => ({
        ...supplierRow,
        failedRate:
          supplierRow.invoiceCount > 0
            ? (supplierRow.failedInvoiceCount / supplierRow.invoiceCount) * 100
            : 0,
      }))
      .sort((a, b) => b.executedSpend - a.executedSpend);
  }, [filteredInvoices]);

  const topItemsBySpendRows = useMemo(() => {
    const itemGroups = filteredInvoices.reduce((acc, invoice) => {
      const payload = getInvoicePayload(invoice);
      const supplier = invoice.supplier || "Unknown Supplier";

      (payload.items || []).forEach((item) => {
        const itemName = String(item.itemName || item.name || "").trim();
        if (!itemName) return;

        const quantity = normalizeAmount(item.quantity);
        const unitPrice = normalizeAmount(item.unitPrice);
        const lineTotal =
          normalizeAmount(item.lineTotal) > 0
            ? normalizeAmount(item.lineTotal)
            : quantity * unitPrice;

        if (!acc[itemName]) {
          acc[itemName] = {
            itemName,
            totalQuantity: 0,
            totalSpend: 0,
            suppliers: {},
          };
        }

        acc[itemName].totalQuantity += quantity;
        acc[itemName].totalSpend += lineTotal;
        acc[itemName].suppliers[supplier] = true;
      });

      return acc;
    }, {});

    return Object.values(itemGroups)
      .map((row) => ({
        itemName: row.itemName,
        totalQuantity: row.totalQuantity,
        totalSpend: row.totalSpend,
        supplierCount: Object.keys(row.suppliers).length,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [filteredInvoices]);

  const topSupplierLabel =
    supplierSpendRows.length === 0
      ? "-"
      : `${supplierSpendRows[0].supplier} (${supplierSpendRows[0].totalSpend.toFixed(2)})`;

  const topSupplierByInvoiceCount = useMemo(
    () =>
      supplierPerformanceRows
        .slice()
        .sort((a, b) => b.invoiceCount - a.invoiceCount)[0] || null,
    [supplierPerformanceRows]
  );

  const topSupplierByInvoiceCountLabel =
    !topSupplierByInvoiceCount
      ? "-"
      : `${topSupplierByInvoiceCount.supplier} (${topSupplierByInvoiceCount.invoiceCount})`;

  const topSupplierByExecutedSpendLabel =
    supplierPerformanceRows.length === 0
      ? "-"
      : `${supplierPerformanceRows[0].supplier} (${formatMoney(
          supplierPerformanceRows[0].executedSpend
        )})`;

  const totalSuppliers = supplierPerformanceRows.length;
  const failedInvoiceRate =
    filteredInvoices.length > 0
      ? (summaryMetrics.failedCount / filteredInvoices.length) * 100
      : 0;
  const averageInvoiceValue =
    filteredInvoices.length > 0
      ? summaryMetrics.totalSpend / filteredInvoices.length
      : 0;

  async function refreshInvoiceQueue() {
    try {
      await refreshInvoiceQueueRequest();
      setInvoiceQueue(getInvoiceQueue());
    } catch (error) {
      setNotice("error", error?.message || "Failed to load invoices.");
    }
  }

  function setNotice(tone, message) {
    setPageNotice({ tone, message });
  }

  async function retryExistingInvoice(invoice, options = {}) {
    const { fromBatch = false } = options;

    try {
      setActiveRetryInvoiceId(invoice.id);

      if (!fromBatch) {
        setNotice(
          "info",
          `Retrying invoice ${invoice.invoiceNumber || invoice.id}...`
        );
      }

      refreshInvoiceQueue();
      const result = await retryInvoice(invoice.id);

      const ok = Boolean(result?.ok);

      if (!fromBatch) {
        setNotice(
          ok ? "success" : "error",
          ok
            ? "Invoice retry executed successfully."
            : result?.errorMessage || "Invoice retry failed."
        );
      }

      return { ok };
    } catch (error) {
      refreshInvoiceQueue();

      if (!fromBatch) {
        setNotice(
          "error",
          error?.message || "Failed to retry invoice."
        );
      }

      return { ok: false, reason: "transport-error" };
    } finally {
      setActiveRetryInvoiceId("");
    }
  }

  async function executeQueuedInvoice(invoice) {
    if (invoice.status !== INVOICE_INTAKE_STATUSES.QUEUED) {
      setNotice("warning", "Run Bot is available only for QUEUED invoices.");
      return;
    }

    if (isRetryingAllFailed) {
      setNotice("warning", "Batch retry is in progress. Wait for completion.");
      return;
    }

    if (activeRetryInvoiceId || activeExecuteInvoiceId) {
      setNotice("warning", "Another invoice execution is already in progress.");
      return;
    }

    try {
      setActiveExecuteInvoiceId(invoice.id);
      setNotice(
        "info",
        `Running bot for invoice ${invoice.invoiceNumber || invoice.id}...`
      );

      refreshInvoiceQueue();
      const result = await executeInvoice(invoice.id);
      const executedNow =
        result?.invoice?.status === INVOICE_INTAKE_STATUSES.EXECUTED;

      setNotice(
        executedNow ? "success" : "warning",
        executedNow
          ? "Invoice executed successfully."
          : result?.invoice?.executionMetadata?.lastErrorMessage ||
              "Invoice remains queued. Check bot-service availability and configuration."
      );
    } catch (error) {
      refreshInvoiceQueue();
      setNotice(
        "error",
        error?.message || "Failed to execute invoice in bot-service."
      );
    } finally {
      setActiveExecuteInvoiceId("");
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

    if (
      (activeRetryInvoiceId && activeRetryInvoiceId !== invoice.id) ||
      activeExecuteInvoiceId
    ) {
      setNotice("warning", "Another invoice retry is already in progress.");
      return;
    }

    await retryExistingInvoice(invoice);
  }

  async function handleRetryAllFailed() {
    const failedInvoices = invoiceQueue.filter(
      (invoice) => invoice.status === INVOICE_INTAKE_STATUSES.FAILED
    );

    if (failedInvoices.length === 0) {
      setNotice("warning", "There are no FAILED invoices to retry.");
      return;
    }

    if (isRetryingAllFailed || activeRetryInvoiceId || activeExecuteInvoiceId) {
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

        const outcome = await retryExistingInvoice(invoice, {
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

  async function handleDeleteInvoice(invoiceId) {
    try {
      await deleteInvoice(invoiceId);
      if (openPayloadInvoiceId === invoiceId) {
        setOpenPayloadInvoiceId("");
      }
      setNotice("success", "Invoice removed from queue.");
    } catch (error) {
      setNotice("error", error?.message || "Failed to delete invoice.");
    }
  }

  function handleOpenSupplierPortal() {
    if (!MOCK_PORTAL_URL) {
      setNotice("warning", "Supplier portal URL is not configured for this environment.");
      return;
    }

    window.open(MOCK_PORTAL_URL, "_blank");
  }

  function handleViewScreenshot(invoice) {
    const screenshot = buildBotAssetUrl(invoice?.executionMetadata?.screenshot);
    if (!screenshot) {
      setNotice("warning", "No screenshot available for this invoice.");
      return;
    }

    window.open(screenshot, "_blank");
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: "30px", fontWeight: 600 }}>Invoice Queue</h1>

      <PageActionBar>
        <button
          onClick={refreshInvoiceQueue}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#2563eb",
          }}
        >
          Refresh Queue
        </button>

        <button
          onClick={handleRetryAllFailed}
          disabled={
            allCounts.failed === 0 ||
            isRetryingAllFailed ||
            !!activeRetryInvoiceId ||
            !!activeExecuteInvoiceId
          }
          style={{
            ...styles.primaryButton,
            backgroundColor:
              allCounts.failed === 0 ||
              isRetryingAllFailed ||
              !!activeRetryInvoiceId ||
              !!activeExecuteInvoiceId
                ? "#64748b"
                : "#ef4444",
            cursor:
              allCounts.failed === 0 ||
              isRetryingAllFailed ||
              !!activeRetryInvoiceId ||
              !!activeExecuteInvoiceId
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isRetryingAllFailed
            ? "Retrying All Failed..."
            : `Retry All Failed (${allCounts.failed})`}
        </button>
      </PageActionBar>

      <PageActionBar marginBottom="14px">
        <StatusBadge
          label="Total Spend"
          value={formatMoney(summaryMetrics.totalSpend)}
          backgroundColor="#1f1f1f"
          textColor="#9be79b"
        />
        <StatusBadge
          label="Executed Spend"
          value={formatMoney(summaryMetrics.executedSpend)}
          backgroundColor="#1f1f1f"
          textColor="#4CAF50"
        />
        <StatusBadge
          label="Failed Invoices"
          value={summaryMetrics.failedCount}
          backgroundColor="#ffebee"
          textColor="#d9534f"
        />
        <StatusBadge
          label="Executed Invoices"
          value={summaryMetrics.executedCount}
          backgroundColor="#e8f5e9"
          textColor="#4CAF50"
        />
        <StatusBadge
          label="Top Supplier"
          value={topSupplierLabel}
          backgroundColor="#1f1f1f"
          textColor="#8de0ea"
        />
      </PageActionBar>

      <PageActionBar marginBottom="14px">
        <StatusBadge
          label="Total Suppliers"
          value={totalSuppliers}
          backgroundColor="#1f1f1f"
          textColor="white"
        />
        <StatusBadge
          label="Top By Invoices"
          value={topSupplierByInvoiceCountLabel}
          backgroundColor="#1f1f1f"
          textColor="#8de0ea"
        />
        <StatusBadge
          label="Top By Executed Spend"
          value={topSupplierByExecutedSpendLabel}
          backgroundColor="#1f1f1f"
          textColor="#4CAF50"
        />
        <StatusBadge
          label="Failed Rate"
          value={formatPercent(failedInvoiceRate)}
          backgroundColor="#1f1f1f"
          textColor="#d9534f"
        />
        <StatusBadge
          label="Avg Invoice Value"
          value={formatMoney(averageInvoiceValue)}
          backgroundColor="#1f1f1f"
          textColor="#9be79b"
        />
      </PageActionBar>

      <PageActionBar alignItems="center">
        <select
          value={monthFilter}
          onChange={(event) => setMonthFilter(event.target.value)}
          style={{
            ...styles.input,
            width: "auto",
            minWidth: "180px",
          }}
        >
          {MONTH_FILTERS.map((filterOption) => (
            <option key={filterOption.value} value={filterOption.value}>
              {filterOption.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{
            ...styles.input,
            width: "auto",
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
            ...styles.input,
            width: "auto",
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

      <div style={{ ...styles.darkPanel, marginBottom: "12px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "10px" }}>Spend By Supplier</h2>

        <SectionTableHeader
          columns={[
            "Supplier",
            "Invoices",
            "Total Spend",
            "Executed Spend",
            "Failed",
          ]}
          gridTemplateColumns="1.4fr 0.7fr 0.9fr 0.9fr 0.7fr"
          marginBottom="6px"
        />

        {supplierSpendRows.length === 0 ? (
          <div style={styles.emptyState}>No supplier spend data for current filters.</div>
        ) : (
          supplierSpendRows.map((supplierRow) => (
            <div
              key={supplierRow.supplier}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.7fr 0.9fr 0.9fr 0.7fr",
                gap: "8px",
                alignItems: "center",
                padding: "10px",
                borderBottom: "1px solid #333",
              }}
            >
              <div>
                <strong>{supplierRow.supplier}</strong>
              </div>
              <div>{supplierRow.invoiceCount}</div>
              <div>{formatMoney(supplierRow.totalSpend)}</div>
              <div>{formatMoney(supplierRow.executedSpend)}</div>
              <div>{supplierRow.failedCount}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ ...styles.darkPanel, marginBottom: "12px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "10px" }}>Top Items By Spend</h2>

        <SectionTableHeader
          columns={["Item", "Total Qty", "Total Spend", "Supplier Count"]}
          gridTemplateColumns="1.4fr 0.9fr 0.9fr 0.8fr"
          marginBottom="6px"
        />

        {topItemsBySpendRows.length === 0 ? (
          <div style={styles.emptyState}>No item analytics for current filters.</div>
        ) : (
          topItemsBySpendRows.map((itemRow) => (
            <div
              key={itemRow.itemName}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.9fr 0.9fr 0.8fr",
                gap: "8px",
                alignItems: "center",
                padding: "10px",
                borderBottom: "1px solid #333",
              }}
            >
              <div>
                <strong>{itemRow.itemName}</strong>
              </div>
              <div>{itemRow.totalQuantity}</div>
              <div>{formatMoney(itemRow.totalSpend)}</div>
              <div>{itemRow.supplierCount}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ ...styles.darkPanel, marginBottom: "12px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "10px" }}>Supplier Performance</h2>

        <SectionTableHeader
          columns={[
            "Supplier",
            "Invoices",
            "Executed",
            "Failed",
            "Failed Rate",
            "Total Spend",
            "Executed Spend",
          ]}
          gridTemplateColumns="1.3fr 0.6fr 0.6fr 0.6fr 0.8fr 0.9fr 0.9fr"
          marginBottom="6px"
        />

        {supplierPerformanceRows.length === 0 ? (
          <div style={styles.emptyState}>No supplier performance data for current filters.</div>
        ) : (
          supplierPerformanceRows.map((supplierRow) => (
            <div
              key={supplierRow.supplier}
              style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 0.6fr 0.6fr 0.6fr 0.8fr 0.9fr 0.9fr",
                gap: "8px",
                alignItems: "center",
                padding: "10px",
                borderBottom: "1px solid #333",
              }}
            >
              <div>
                <strong>{supplierRow.supplier}</strong>
              </div>
              <div>{supplierRow.invoiceCount}</div>
              <div>{supplierRow.executedInvoiceCount}</div>
              <div>{supplierRow.failedInvoiceCount}</div>
              <div>{formatPercent(supplierRow.failedRate)}</div>
              <div>{formatMoney(supplierRow.totalSpend)}</div>
              <div>{formatMoney(supplierRow.executedSpend)}</div>
            </div>
          ))
        )}
      </div>

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
          const screenshotUrl = buildBotAssetUrl(invoice?.executionMetadata?.screenshot);
          const hasScreenshot = Boolean(screenshotUrl);
          const isRetryingThis = activeRetryInvoiceId === invoice.id;
          const isExecutingThis = activeExecuteInvoiceId === invoice.id;
          const canExecute =
            invoice.status === INVOICE_INTAKE_STATUSES.QUEUED &&
            !isRetryingAllFailed &&
            !activeRetryInvoiceId &&
            !activeExecuteInvoiceId;
          const canRetry =
            invoice.status === INVOICE_INTAKE_STATUSES.FAILED &&
            !isRetryingAllFailed &&
            !activeRetryInvoiceId &&
            !activeExecuteInvoiceId;

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
                  <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                    {invoice.invoiceDate || "-"}
                  </div>
                </div>
                <div>{formatMoney(invoice.totalAmount)}</div>
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

              <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "12px" }}>
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
                <div className="saas-screenshot-frame" style={{ marginBottom: "12px" }}>
                  <div className="saas-screenshot-title">Bot Execution Screenshot</div>
                  <img
                    src={screenshotUrl}
                    alt={`Invoice ${invoice.invoiceNumber || invoice.id}`}
                    style={{
                      maxWidth: "100%",
                      width: "100%",
                      borderRadius: "10px",
                      border: "1px solid #1f2937",
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
                      ...styles.input,
                      minHeight: "180px",
                      resize: "vertical",
                    }}
                  />
                </div>
              )}

              <PageActionBar marginBottom="0">
                {invoice.status === INVOICE_INTAKE_STATUSES.QUEUED && (
                  <button
                    onClick={() => executeQueuedInvoice(invoice)}
                    disabled={!canExecute}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: canExecute ? "#2563eb" : "#64748b",
                      cursor: canExecute ? "pointer" : "not-allowed",
                    }}
                  >
                    {isExecutingThis ? "Running bot..." : "Run Bot"}
                  </button>
                )}

                {invoice.status === INVOICE_INTAKE_STATUSES.FAILED && (
                  <button
                    onClick={() => handleRetryInvoice(invoice)}
                    disabled={!canRetry}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: canRetry ? "#ef4444" : "#64748b",
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
                    backgroundColor: "#7c3aed",
                  }}
                >
                  {openPayloadInvoiceId === invoice.id ? "Hide Payload" : "View Payload"}
                </button>

                <button
                  onClick={() => handleDeleteInvoice(invoice.id)}
                  disabled={
                    isRetryingAllFailed ||
                    !!activeRetryInvoiceId ||
                    !!activeExecuteInvoiceId
                  }
                  style={{
                    ...styles.primaryButton,
                    backgroundColor:
                      isRetryingAllFailed ||
                      !!activeRetryInvoiceId ||
                      !!activeExecuteInvoiceId
                        ? "#64748b"
                        : "#ef4444",
                    cursor:
                      isRetryingAllFailed ||
                      !!activeRetryInvoiceId ||
                      !!activeExecuteInvoiceId
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
                    backgroundColor: "#1f2937",
                  }}
                >
                  Open Supplier Portal
                </button>

                <button
                  onClick={() => handleViewScreenshot(invoice)}
                  disabled={!hasScreenshot}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: hasScreenshot ? "#334155" : "#64748b",
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
