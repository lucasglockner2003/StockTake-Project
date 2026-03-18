import { useEffect, useMemo, useState } from "react";
import {
  clearAutomationQueue,
  filterAutomationJobs,
  getAutomationJobCounts,
  getAutomationQueue,
  removeAutomationJob,
  updateAutomationJob,
  executeAutomationJob,
} from "../utils/automation";
import { styles } from "../utils/uiStyles";

function badgeStyle(backgroundColor, color) {
  return {
    backgroundColor,
    color,
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "14px",
  };
}

function AutomationJobsPage({ setCurrentPage }) {
  const [jobs, setJobs] = useState([]);
  const [runningJobId, setRunningJobId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setJobs(getAutomationQueue());
  }, []);

  function refreshJobs() {
    setJobs(getAutomationQueue());
  }

  function handleSetStatus(jobId, status) {
    const nextQueue = updateAutomationJob(jobId, (job) => ({
      ...job,
      status,
      lastError: status === "failed" ? job.lastError : "",
    }));
    setJobs(nextQueue);
  }

  function handleIncrementAttempt(jobId) {
  const nextQueue = updateAutomationJob(jobId, (job) => ({
    ...job,
    attemptCount: (job.attemptCount || 0) + 1,
  }));
  setJobs(nextQueue);
}

  function handleSetError(jobId) {
  const errorMessage = window.prompt("Enter the last error message:");
  if (errorMessage === null) return;

  const nextQueue = updateAutomationJob(jobId, {
    status: "failed",
    lastError: errorMessage || "",
  });

  setJobs(nextQueue);
}

  function handleUpdateNotes(jobId, currentNotes) {
  const nextNotes = window.prompt("Edit notes for this job:", currentNotes || "");
  if (nextNotes === null) return;

  const nextQueue = updateAutomationJob(jobId, {
    notes: nextNotes,
  });

  setJobs(nextQueue);
}

  function handleResetJob(jobId) {
  const nextQueue = updateAutomationJob(jobId, {
    status: "pending",
    lastError: "",
  });

  setJobs(nextQueue);
}

  function handleDeleteJob(jobId) {
  const nextQueue = removeAutomationJob(jobId);
  setJobs(nextQueue);
}

  function handleClearQueue() {
    const confirmed = window.confirm(
      "Are you sure you want to clear all automation jobs?"
    );
    if (!confirmed) return;

    clearAutomationQueue();
    setJobs([]);
  }

  async function handleRunJob(jobId) {
    if (runningJobId !== null) return;

    try {
      setRunningJobId(jobId);
      setJobs(loadAutomationQueue());

      const result = await executeAutomationJob(jobId);
      setJobs(result.queue);
    } catch {
      setJobs(loadAutomationQueue());
    } finally {
      setRunningJobId(null);
    }
  }

  async function handleRunJobWithFailure(jobId) {
    if (runningJobId !== null) return;

    try {
      setRunningJobId(jobId);
      setJobs(loadAutomationQueue());

      const result = await executeAutomationJob(jobId, {
        shouldFail: true,
        failureMessage: "Simulated website or selector failure.",
      });

      setJobs(result.queue);
    } catch {
      setJobs(loadAutomationQueue());
    } finally {
      setRunningJobId(null);
    }
  }

  const counts = useMemo(() => getAutomationJobCounts(jobs), [jobs]);

  const filteredJobs = useMemo(
    () => filterAutomationJobs(jobs, statusFilter, search),
    [jobs, statusFilter, search]
  );

  return (
    <div>
      <h1>Automation Jobs</h1>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <button onClick={() => setCurrentPage("photo")} style={styles.backButton}>
          Back to Photo Order
        </button>

        <button
          onClick={refreshJobs}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#2196F3",
          }}
        >
          Refresh Jobs
        </button>

        <button
          onClick={handleClearQueue}
          disabled={jobs.length === 0 || runningJobId !== null}
          style={{
            ...styles.primaryButton,
            backgroundColor:
              jobs.length === 0 || runningJobId !== null ? "#888" : "#d9534f",
            cursor:
              jobs.length === 0 || runningJobId !== null
                ? "not-allowed"
                : "pointer",
          }}
        >
          Clear Queue
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div style={badgeStyle("#1f1f1f", "white")}>Total {counts.total}</div>
        <div style={badgeStyle("#fff3e0", "#ff9800")}>Pending {counts.pending}</div>
        <div style={badgeStyle("#e3f2fd", "#2196F3")}>Running {counts.running}</div>
        <div style={badgeStyle("#e8f5e9", "#4CAF50")}>Done {counts.done}</div>
        <div style={badgeStyle("#ffebee", "#d9534f")}>Failed {counts.failed}</div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "20px",
          alignItems: "center",
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            minWidth: "180px",
          }}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="done">Done</option>
          <option value="failed">Failed</option>
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search job, session or item..."
          style={{
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            minWidth: "260px",
          }}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ marginBottom: "10px" }}>
          Visible Jobs ({filteredJobs.length})
        </h2>

        {filteredJobs.length === 0 ? (
          <div style={styles.emptyState}>No automation jobs found.</div>
        ) : (
          filteredJobs.map((job) => {
            const isThisJobRunning = runningJobId === job.jobId;

            return (
              <div
                key={job.jobId}
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
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #444",
                      backgroundColor: "#111",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {job.notes || "No notes yet."}
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <strong>Last Error</strong>
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #444",
                      backgroundColor: "#111",
                      color: job.lastError ? "#ffb3b3" : "#aaa",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {job.lastError || "No errors."}
                  </div>
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
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px 1.4fr 0.8fr",
                        gap: "8px",
                        padding: "8px 10px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "#aaa",
                        borderBottom: "1px solid #444",
                      }}
                    >
                      <div>Seq</div>
                      <div>Item</div>
                      <div>Qty</div>
                    </div>

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

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => handleRunJob(job.jobId)}
                    disabled={runningJobId !== null || job.status === "running"}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor:
                        runningJobId !== null || job.status === "running"
                          ? "#888"
                          : "#00b894",
                      cursor:
                        runningJobId !== null || job.status === "running"
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {isThisJobRunning ? "Running..." : "Run Job"}
                  </button>

                  <button
                    onClick={() => handleRunJobWithFailure(job.jobId)}
                    disabled={runningJobId !== null || job.status === "running"}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor:
                        runningJobId !== null || job.status === "running"
                          ? "#888"
                          : "#c0392b",
                      cursor:
                        runningJobId !== null || job.status === "running"
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    Simulate Failure
                  </button>

                  <button
                    onClick={() => handleSetStatus(job.jobId, "pending")}
                    disabled={runningJobId !== null}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: runningJobId !== null ? "#888" : "#ff9800",
                    }}
                  >
                    Mark Pending
                  </button>

                  <button
                    onClick={() => handleSetStatus(job.jobId, "running")}
                    disabled={runningJobId !== null}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: runningJobId !== null ? "#888" : "#2196F3",
                    }}
                  >
                    Mark Running
                  </button>

                  <button
                    onClick={() => handleSetStatus(job.jobId, "done")}
                    disabled={runningJobId !== null}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: runningJobId !== null ? "#888" : "#4CAF50",
                    }}
                  >
                    Mark Done
                  </button>

                  <button
                    onClick={() => handleSetError(job.jobId)}
                    disabled={runningJobId !== null}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: runningJobId !== null ? "#888" : "#d9534f",
                    }}
                  >
                    Set Error
                  </button>

                  <button
                    onClick={() => handleIncrementAttempt(job.jobId)}
                    disabled={runningJobId !== null}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: runningJobId !== null ? "#888" : "#6f42c1",
                    }}
                  >
                    Add Attempt
                  </button>

                  <button
                    onClick={() => handleUpdateNotes(job.jobId, job.notes)}
                    disabled={runningJobId !== null}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: runningJobId !== null ? "#888" : "#666",
                    }}
                  >
                    Edit Notes
                  </button>

                  <button
                    onClick={() => handleResetJob(job.jobId)}
                    disabled={runningJobId !== null}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: runningJobId !== null ? "#888" : "#795548",
                    }}
                  >
                    Reset Job
                  </button>

                  <button
                    onClick={() => handleDeleteJob(job.jobId)}
                    disabled={runningJobId !== null}
                    style={{
                      ...styles.primaryButton,
                      backgroundColor: runningJobId !== null ? "#888" : "#444",
                    }}
                  >
                    Delete Job
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AutomationJobsPage;