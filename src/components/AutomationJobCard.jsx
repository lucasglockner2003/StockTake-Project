import { JOB_STATUSES } from "../constants/app";
import { styles } from "../utils/uiStyles";
import PageActionBar from "./PageActionBar";
import NoticePanel from "./NoticePanel";
import SectionTableHeader from "./SectionTableHeader";
import StatusBadge from "./StatusBadge";

function getJobStatusTone(status) {
  if (status === JOB_STATUSES.RUNNING) return "#3b82f6";
  if (status === JOB_STATUSES.DONE) return "#22c55e";
  if (status === JOB_STATUSES.FAILED) return "#ef4444";
  if (status === JOB_STATUSES.PENDING) return "#f59e0b";
  return "#cbd5e1";
}

function AutomationJobCard({
  job,
  isRunning,
  hasRunningJob,
  canManage,
  onRun,
  onRunFailure,
  onSetStatus,
  onSetError,
  onIncrementAttempt,
  onUpdateNotes,
  onReset,
  onDelete,
}) {
  return (
    <div
      style={{
        ...styles.darkPanel,
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div>
          <strong style={{ color: "#cbd5e1" }}>Job ID</strong>
          <div style={{ marginTop: "4px", color: "#f8fafc" }}>{job.jobId}</div>
        </div>

        <div>
          <strong style={{ color: "#cbd5e1" }}>Status</strong>
          <div style={{ marginTop: "6px" }}>
            <StatusBadge label="Job" value={job.status} textColor={getJobStatusTone(job.status)} />
          </div>
        </div>

        <div>
          <strong style={{ color: "#cbd5e1" }}>Total Items</strong>
          <div style={{ marginTop: "4px", color: "#f8fafc" }}>{job.totalItems}</div>
        </div>

        <div>
          <strong style={{ color: "#cbd5e1" }}>Attempts</strong>
          <div style={{ marginTop: "4px", color: "#f8fafc" }}>{job.attemptCount || 0}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <div>
          <strong style={{ color: "#cbd5e1" }}>Created At</strong>
          <div style={{ marginTop: "4px", color: "#94a3b8" }}>
            {new Date(job.createdAt).toLocaleString()}
          </div>
        </div>

        <div>
          <strong style={{ color: "#cbd5e1" }}>Updated At</strong>
          <div style={{ marginTop: "4px", color: "#94a3b8" }}>
            {new Date(job.updatedAt).toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <strong style={{ color: "#cbd5e1" }}>Session ID</strong>
        <div style={{ marginTop: "4px", color: "#94a3b8" }}>{job.sessionId}</div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <strong style={{ color: "#cbd5e1" }}>Notes</strong>
        <NoticePanel
          backgroundColor="rgba(15, 23, 42, 0.76)"
          border="1px solid #1f2937"
          color="#e5e7eb"
          fontWeight="normal"
          marginBottom="0"
          padding="12px"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {job.notes || "No notes yet."}
        </NoticePanel>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <strong style={{ color: "#cbd5e1" }}>Last Error</strong>
        <NoticePanel
          backgroundColor={job.lastError ? "rgba(127, 29, 29, 0.18)" : "rgba(15, 23, 42, 0.76)"}
          border={job.lastError ? "1px solid rgba(239, 68, 68, 0.24)" : "1px solid #1f2937"}
          color={job.lastError ? "#fca5a5" : "#94a3b8"}
          fontWeight="normal"
          marginBottom="0"
          padding="12px"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {job.lastError || "No errors."}
        </NoticePanel>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <strong>Items</strong>
        <div
          style={{
            marginTop: "8px",
            border: "1px solid #1f2937",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <SectionTableHeader
            columns={["Seq", "Item", "Qty"]}
            gridTemplateColumns="70px 1.4fr 0.8fr"
          />

          {(job.items || []).map((item) => (
            <div
              key={`${job.jobId}-${item.sequence}`}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1.4fr 0.8fr",
                gap: "8px",
                padding: "10px 12px",
                borderBottom: "1px solid #1f2937",
                backgroundColor: "rgba(15, 23, 42, 0.76)",
              }}
            >
              <div>{item.sequence}</div>
              <div>{item.itemName}</div>
              <div>{item.quantity}</div>
            </div>
          ))}
        </div>
      </div>

      <PageActionBar marginBottom="0">
        <button
          onClick={() => onRun(job.jobId)}
          disabled={!canManage || hasRunningJob || job.status === JOB_STATUSES.RUNNING}
          style={{
            ...styles.primaryButton,
            backgroundColor:
              !canManage || hasRunningJob || job.status === JOB_STATUSES.RUNNING
                ? "#64748b"
                : "#00b894",
            cursor:
              !canManage || hasRunningJob || job.status === JOB_STATUSES.RUNNING
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isRunning ? "Running bot..." : "Run Job"}
        </button>

        <button
          onClick={() => onRunFailure(job.jobId)}
          disabled={!canManage || hasRunningJob || job.status === JOB_STATUSES.RUNNING}
          style={{
            ...styles.primaryButton,
            backgroundColor:
              !canManage || hasRunningJob || job.status === JOB_STATUSES.RUNNING
                ? "#64748b"
                : "#ef4444",
            cursor:
              !canManage || hasRunningJob || job.status === JOB_STATUSES.RUNNING
                ? "not-allowed"
                : "pointer",
          }}
        >
          Simulate Failure
        </button>

        <button
          onClick={() => onSetStatus(job.jobId, JOB_STATUSES.PENDING)}
          disabled={!canManage || hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: !canManage || hasRunningJob ? "#64748b" : "#f59e0b",
          }}
        >
          Mark Pending
        </button>

        <button
          onClick={() => onSetStatus(job.jobId, JOB_STATUSES.RUNNING)}
          disabled={!canManage || hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: !canManage || hasRunningJob ? "#64748b" : "#3b82f6",
          }}
        >
          Mark Running
        </button>

        <button
          onClick={() => onSetStatus(job.jobId, JOB_STATUSES.DONE)}
          disabled={!canManage || hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: !canManage || hasRunningJob ? "#64748b" : "#22c55e",
          }}
        >
          Mark Done
        </button>

        <button
          onClick={() => onSetError(job.jobId)}
          disabled={!canManage || hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: !canManage || hasRunningJob ? "#64748b" : "#ef4444",
          }}
        >
          Set Error
        </button>

        <button
          onClick={() => onIncrementAttempt(job.jobId, job.status)}
          disabled={!canManage || hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: !canManage || hasRunningJob ? "#64748b" : "#8b5cf6",
          }}
        >
          Add Attempt
        </button>

        <button
          onClick={() => onUpdateNotes(job.jobId, job.notes)}
          disabled={!canManage || hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: !canManage || hasRunningJob ? "#64748b" : "#334155",
          }}
        >
          Edit Notes
        </button>

        <button
          onClick={() => onReset(job.jobId)}
          disabled={!canManage || hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: !canManage || hasRunningJob ? "#64748b" : "#0f766e",
          }}
        >
          Reset Job
        </button>

        <button
          onClick={() => onDelete(job.jobId)}
          disabled={!canManage || hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: !canManage || hasRunningJob ? "#64748b" : "#1f2937",
          }}
        >
          Delete Job
        </button>
      </PageActionBar>
    </div>
  );
}

export default AutomationJobCard;
