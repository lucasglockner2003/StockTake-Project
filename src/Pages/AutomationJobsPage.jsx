import { JOB_STATUSES } from "../constants/app";
import { styles } from "../utils/uiStyles";
import AutomationJobCard from "../components/AutomationJobCard";
import PageActionBar from "../components/PageActionBar";
import StatusBadge from "../components/StatusBadge";
import { useAutomationJobs } from "../hooks/useAutomationJobs";

function AutomationJobsPage() {
  const {
    runningJobId,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    counts,
    filteredJobs,
    refreshJobs,
    handleSetStatus,
    handleIncrementAttempt,
    handleSetError,
    handleUpdateNotes,
    handleResetJob,
    handleDeleteJob,
    handleClearQueue,
    handleRunJob,
    handleRunJobWithFailure,
  } = useAutomationJobs();

  return (
    <div>
      <h1>Automation Jobs</h1>

      <PageActionBar>
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
          disabled={counts.total === 0 || runningJobId !== null}
          style={{
            ...styles.primaryButton,
            backgroundColor:
              counts.total === 0 || runningJobId !== null
                ? "#888"
                : "#d9534f",
            cursor:
              counts.total === 0 || runningJobId !== null
                ? "not-allowed"
                : "pointer",
          }}
        >
          Clear Queue
        </button>
      </PageActionBar>

      <PageActionBar>
        <StatusBadge label="Total" value={counts.total} backgroundColor="#1f1f1f" textColor="white" />
        <StatusBadge label="Pending" value={counts.pending} backgroundColor="#fff3e0" textColor="#ff9800" />
        <StatusBadge label="Running" value={counts.running} backgroundColor="#e3f2fd" textColor="#2196F3" />
        <StatusBadge label="Done" value={counts.done} backgroundColor="#e8f5e9" textColor="#4CAF50" />
        <StatusBadge label="Failed" value={counts.failed} backgroundColor="#ffebee" textColor="#d9534f" />
      </PageActionBar>

      <PageActionBar alignItems="center">
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
          <option value={JOB_STATUSES.ALL}>All statuses</option>
          <option value={JOB_STATUSES.PENDING}>Pending</option>
          <option value={JOB_STATUSES.RUNNING}>Running</option>
          <option value={JOB_STATUSES.DONE}>Done</option>
          <option value={JOB_STATUSES.FAILED}>Failed</option>
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
      </PageActionBar>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ marginBottom: "10px" }}>
          Visible Jobs ({filteredJobs.length})
        </h2>

        {filteredJobs.length === 0 ? (
          <div style={styles.emptyState}>No automation jobs found.</div>
        ) : (
          filteredJobs.map((job) => (
            <AutomationJobCard
              key={job.jobId}
              job={job}
              isRunning={runningJobId === job.jobId}
              hasRunningJob={runningJobId !== null}
              onRun={handleRunJob}
              onRunFailure={handleRunJobWithFailure}
              onSetStatus={handleSetStatus}
              onSetError={handleSetError}
              onIncrementAttempt={handleIncrementAttempt}
              onUpdateNotes={handleUpdateNotes}
              onReset={handleResetJob}
              onDelete={handleDeleteJob}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default AutomationJobsPage;
