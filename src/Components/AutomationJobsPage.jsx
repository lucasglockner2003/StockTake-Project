import { useEffect, useState } from "react";
import {
  clearAutomationQueue,
  deleteAutomationJob,
  loadAutomationQueue,
  updateAutomationJobStatus,
} from "../utils/automationHelpers";
import { styles } from "../utils/uiStyles";

function AutomationJobsPage({ setCurrentPage }) {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    setJobs(loadAutomationQueue());
  }, []);

  function refreshJobs() {
    setJobs(loadAutomationQueue());
  }

  function handleSetStatus(jobId, status) {
    const nextQueue = updateAutomationJobStatus(jobId, status);
    setJobs(nextQueue);
  }

  function handleDeleteJob(jobId) {
    const nextQueue = deleteAutomationJob(jobId);
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
          disabled={jobs.length === 0}
          style={{
            ...styles.primaryButton,
            backgroundColor: jobs.length === 0 ? "#888" : "#d9534f",
            cursor: jobs.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Clear Queue
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ marginBottom: "10px" }}>Queued Jobs ({jobs.length})</h2>

        {jobs.length === 0 ? (
          <div style={styles.emptyState}>No automation jobs yet.</div>
        ) : (
          jobs.map((job) => (
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
                  <strong>Created At</strong>
                  <div>{new Date(job.createdAt).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <strong>Session ID</strong>
                <div>{job.sessionId}</div>
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
                  onClick={() => handleSetStatus(job.jobId, "pending")}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: "#ff9800",
                  }}
                >
                  Mark Pending
                </button>

                <button
                  onClick={() => handleSetStatus(job.jobId, "running")}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: "#2196F3",
                  }}
                >
                  Mark Running
                </button>

                <button
                  onClick={() => handleSetStatus(job.jobId, "done")}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: "#4CAF50",
                  }}
                >
                  Mark Done
                </button>

                <button
                  onClick={() => handleSetStatus(job.jobId, "failed")}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: "#d9534f",
                  }}
                >
                  Mark Failed
                </button>

                <button
                  onClick={() => handleDeleteJob(job.jobId)}
                  style={{
                    ...styles.primaryButton,
                    backgroundColor: "#666",
                  }}
                >
                  Delete Job
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AutomationJobsPage;