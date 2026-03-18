import { JOB_STATUSES } from "../constants/app";
import { styles } from "../utils/uiStyles";
import PageActionBar from "./PageActionBar";
import NoticePanel from "./NoticePanel";
import SectionTableHeader from "./SectionTableHeader";

function AutomationJobCard({
  job,
  isRunning,
  hasRunningJob,
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
        border: "1px solid #555",
        borderRadius: "10px",
        padding: "14px",
        marginBottom: "16px",
        backgroundColor: "#1a1a1a",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <div>
          <strong>Job ID</strong>
          <div>{job.jobId}</div>
        </div>

        <div>
          <strong>Status</strong>
          <div>{job.status}</div>
        </div>

        <div>
          <strong>Total Items</strong>
          <div>{job.totalItems}</div>
        </div>

        <div>
          <strong>Attempts</strong>
          <div>{job.attemptCount || 0}</div>
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
          <strong>Created At</strong>
          <div>{new Date(job.createdAt).toLocaleString()}</div>
        </div>

        <div>
          <strong>Updated At</strong>
          <div>{new Date(job.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <strong>Session ID</strong>
        <div>{job.sessionId}</div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <strong>Notes</strong>
        <NoticePanel
          backgroundColor="#111"
          border="1px solid #444"
          color="white"
          fontWeight="normal"
          marginBottom="0"
          padding="10px"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {job.notes || "No notes yet."}
        </NoticePanel>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <strong>Last Error</strong>
        <NoticePanel
          backgroundColor="#111"
          border="1px solid #444"
          color={job.lastError ? "#ffb3b3" : "#aaa"}
          fontWeight="normal"
          marginBottom="0"
          padding="10px"
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
            border: "1px solid #444",
            borderRadius: "8px",
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
                padding: "10px",
                borderBottom: "1px solid #333",
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
          disabled={hasRunningJob || job.status === JOB_STATUSES.RUNNING}
          style={{
            ...styles.primaryButton,
            backgroundColor:
              hasRunningJob || job.status === JOB_STATUSES.RUNNING
                ? "#888"
                : "#00b894",
            cursor:
              hasRunningJob || job.status === JOB_STATUSES.RUNNING
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isRunning ? "Running..." : "Run Job"}
        </button>

        <button
          onClick={() => onRunFailure(job.jobId)}
          disabled={hasRunningJob || job.status === JOB_STATUSES.RUNNING}
          style={{
            ...styles.primaryButton,
            backgroundColor:
              hasRunningJob || job.status === JOB_STATUSES.RUNNING
                ? "#888"
                : "#c0392b",
            cursor:
              hasRunningJob || job.status === JOB_STATUSES.RUNNING
                ? "not-allowed"
                : "pointer",
          }}
        >
          Simulate Failure
        </button>

        <button
          onClick={() => onSetStatus(job.jobId, JOB_STATUSES.PENDING)}
          disabled={hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: hasRunningJob ? "#888" : "#ff9800",
          }}
        >
          Mark Pending
        </button>

        <button
          onClick={() => onSetStatus(job.jobId, JOB_STATUSES.RUNNING)}
          disabled={hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: hasRunningJob ? "#888" : "#2196F3",
          }}
        >
          Mark Running
        </button>

        <button
          onClick={() => onSetStatus(job.jobId, JOB_STATUSES.DONE)}
          disabled={hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: hasRunningJob ? "#888" : "#4CAF50",
          }}
        >
          Mark Done
        </button>

        <button
          onClick={() => onSetError(job.jobId)}
          disabled={hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: hasRunningJob ? "#888" : "#d9534f",
          }}
        >
          Set Error
        </button>

        <button
          onClick={() => onIncrementAttempt(job.jobId)}
          disabled={hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: hasRunningJob ? "#888" : "#6f42c1",
          }}
        >
          Add Attempt
        </button>

        <button
          onClick={() => onUpdateNotes(job.jobId, job.notes)}
          disabled={hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: hasRunningJob ? "#888" : "#666",
          }}
        >
          Edit Notes
        </button>

        <button
          onClick={() => onReset(job.jobId)}
          disabled={hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: hasRunningJob ? "#888" : "#795548",
          }}
        >
          Reset Job
        </button>

        <button
          onClick={() => onDelete(job.jobId)}
          disabled={hasRunningJob}
          style={{
            ...styles.primaryButton,
            backgroundColor: hasRunningJob ? "#888" : "#444",
          }}
        >
          Delete Job
        </button>
      </PageActionBar>
    </div>
  );
}

export default AutomationJobCard;
