import { useEffect, useMemo, useState } from "react";
import { JOB_STATUSES } from "../constants/app";
import {
  clearAutomationQueue,
  filterAutomationJobs,
  getAutomationJobCounts,
  getAutomationQueue,
  removeAutomationJob,
  updateAutomationJob,
  executeAutomationJob,
} from "../utils/automation";

export function useAutomationJobs() {
  const [jobs, setJobs] = useState([]);
  const [runningJobId, setRunningJobId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(JOB_STATUSES.ALL);
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
      lastError: status === JOB_STATUSES.FAILED ? job.lastError : "",
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
      status: JOB_STATUSES.FAILED,
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
      status: JOB_STATUSES.PENDING,
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

  async function runJob(jobId, options) {
    if (runningJobId !== null) return;

    try {
      setRunningJobId(jobId);
      setJobs(getAutomationQueue());

      const result = await executeAutomationJob(jobId, options);
      setJobs(result.queue);
    } catch {
      setJobs(getAutomationQueue());
    } finally {
      setRunningJobId(null);
    }
  }

  function handleRunJob(jobId) {
    return runJob(jobId);
  }

  function handleRunJobWithFailure(jobId) {
    return runJob(jobId, {
      shouldFail: true,
      failureMessage: "Simulated website or selector failure.",
    });
  }

  const counts = useMemo(() => getAutomationJobCounts(jobs), [jobs]);

  const filteredJobs = useMemo(
    () => filterAutomationJobs(jobs, statusFilter, search),
    [jobs, statusFilter, search]
  );

  return {
    jobs,
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
  };
}
