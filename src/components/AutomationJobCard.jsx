import { JOB_STATUSES } from "../constants/app";
import { styles } from "../utils/uiStyles";
import NoticePanel from "./NoticePanel";
import PageActionBar from "./PageActionBar";
import SectionTableHeader from "./SectionTableHeader";
import StatusBadge from "./StatusBadge";

function getStatusTone(status) {
  if (status === JOB_STATUSES.RUNNING) {
    return {
      backgroundColor: "#e3f2fd",
      textColor: "#2196F3",
    };
  }

  if (status === JOB_STATUSES.DONE) {
    return {
      backgroundColor: "#e8f5e9",
      textColor: "#4CAF50",
    };
  }

  if (status === JOB_STATUSES.FAILED) {
    return {
      backgroundColor: "#ffebee",
      textColor: "#d9534f",
    };
  }

  return {
    backgroundColor: "#fff3e0",
    textColor: "#ff9800",
  };
}

function getStatusLabel(status) {
  if (status === JOB_STATUSES.PENDING) {
    return "idle";
  }

  return status;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleString();
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "-";
  }

  return Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2);
}

function getItemLookupKey(item) {
  if (item?.itemId !== null && item?.itemId !== undefined) {
    return `id:${item.itemId}`;
  }

  const normalizedName = String(item?.itemName || "").trim().toLowerCase();
  return normalizedName ? `name:${normalizedName}` : "";
}

function getLastSuccessfulQuantity(item, lastSuccessfulQuantities) {
  const itemKey = getItemLookupKey(item);

  if (!itemKey) {
    return null;
  }

  return lastSuccessfulQuantities?.[itemKey] ?? null;
}

function getRunButtonLabel(job, isRunningAction) {
  if (isRunningAction) {
    return "Enviando...";
  }

  if (job.status === JOB_STATUSES.RUNNING) {
    return "Executando...";
  }

  return "Enviar para o bot preencher no site";
}

function AutomationJobCard({
  job,
  canManage,
  lastSuccessfulQuantities,
  pendingAction,
  onRun,
  onDelete,
}) {
  const statusTone = getStatusTone(job.status);
  const isRunningAction =
    pendingAction?.jobId === job.jobId && pendingAction?.type === "run";
  const isDeletingAction =
    pendingAction?.jobId === job.jobId && pendingAction?.type === "delete";
  const hasBlockingAction = Boolean(pendingAction?.jobId);
  const disableRun =
    !canManage ||
    hasBlockingAction ||
    job.status === JOB_STATUSES.RUNNING;
  const disableDelete = !canManage || hasBlockingAction;

  return (
    <div
      style={{
        ...styles.darkPanel,
        marginBottom: "16px",
      }}
    >
      <PageActionBar marginBottom="12px" alignItems="center">
        <div>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "4px" }}>
            Job ID
          </div>
          <div style={{ color: "#f8fafc", fontWeight: 600 }}>{job.jobId}</div>
        </div>

        <StatusBadge
          label="Status"
          value={getStatusLabel(job.status)}
          backgroundColor={statusTone.backgroundColor}
          textColor={statusTone.textColor}
        />
      </PageActionBar>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <div>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "4px" }}>
            Total Items
          </div>
          <div style={{ color: "#f8fafc" }}>{job.totalItems}</div>
        </div>

        <div>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "4px" }}>
            Attempts
          </div>
          <div style={{ color: "#f8fafc" }}>{job.attemptCount || 0}</div>
        </div>

        <div>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "4px" }}>
            Updated
          </div>
          <div style={{ color: "#f8fafc" }}>{formatDateTime(job.updatedAt)}</div>
        </div>
      </div>

      {job.lastError ? (
        <NoticePanel
          backgroundColor="rgba(127, 29, 29, 0.18)"
          border="1px solid rgba(239, 68, 68, 0.24)"
          color="#fca5a5"
          fontWeight="normal"
          marginBottom="12px"
          padding="12px"
        >
          {job.lastError}
        </NoticePanel>
      ) : null}

      <div
        style={{
          marginBottom: "12px",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <SectionTableHeader
          columns={["Item", "Last Stock Take", "Qty"]}
          gridTemplateColumns="1.7fr 1fr 0.7fr"
        />

        {(job.items || []).map((item) => (
          <div
            key={`${job.jobId}-${item.sequence}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1.7fr 1fr 0.7fr",
              gap: "8px",
              padding: "10px 12px",
              borderBottom: "1px solid #1f2937",
              backgroundColor: "rgba(15, 23, 42, 0.76)",
              alignItems: "center",
            }}
          >
            <div>{item.itemName}</div>
            <div>{formatNumber(getLastSuccessfulQuantity(item, lastSuccessfulQuantities))}</div>
            <div>{formatNumber(item.quantity)}</div>
          </div>
        ))}
      </div>

      <PageActionBar marginBottom="0">
        <button
          onClick={() => onRun(job.jobId)}
          disabled={disableRun}
          style={{
            ...styles.primaryButton,
            backgroundColor: disableRun ? "#64748b" : "#2563eb",
            cursor: disableRun ? "not-allowed" : "pointer",
          }}
        >
          {getRunButtonLabel(job, isRunningAction)}
        </button>

        <button
          onClick={() => onDelete(job.jobId)}
          disabled={disableDelete}
          style={{
            ...styles.primaryButton,
            backgroundColor: disableDelete ? "#64748b" : "#ef4444",
            cursor: disableDelete ? "not-allowed" : "pointer",
          }}
        >
          {isDeletingAction ? "Deletando..." : "Deletar"}
        </button>
      </PageActionBar>
    </div>
  );
}

export default AutomationJobCard;
