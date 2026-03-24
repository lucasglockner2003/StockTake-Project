import { useEffect, useMemo, useState } from "react";
import { JOB_STATUSES } from "../constants/app";
import { USER_ROLES } from "../constants/access-control";
import { useAuth } from "./use-auth";
import {
  clearAutomationQueue,
  ensureAutomationQueueLoaded,
  executeAutomationJob,
  filterAutomationJobs,
  getAutomationJobCounts,
  getAutomationQueue,
  refreshAutomationQueue,
  removeAutomationJob,
  resetAutomationJob,
  setAutomationJobError,
  subscribeAutomationQueue,
  updateAutomationJobNotes,
  updateAutomationJobStatus,
} from "../utils/automation";

export function useAutomationJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState(() => getAutomationQueue());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [runningJobId, setRunningJobId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(JOB_STATUSES.ALL);
  const [search, setSearch] = useState("");

  const canManageJobs = user?.role === USER_ROLES.ADMIN;

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeAutomationQueue(() => {
      if (!isMounted) {
        return;
      }

      setJobs(getAutomationQueue());
    });

    async function loadJobs() {
      try {
        setLoading(true);
        setErrorMessage("");
        await ensureAutomationQueueLoaded();

        if (!isMounted) {
          return;
        }

        setJobs(getAutomationQueue());
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error?.message || "Failed to load automation jobs.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadJobs();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  async function refreshJobs() {
    try {
      setLoading(true);
      setErrorMessage("");
      await refreshAutomationQueue();
      setJobs(getAutomationQueue());
    } catch (error) {
      setErrorMessage(error?.message || "Failed to refresh automation jobs.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetStatus(jobId, status, options = {}) {
    try {
      setErrorMessage("");
      await updateAutomationJobStatus(jobId, status, options);
      setJobs(getAutomationQueue());
    } catch (error) {
      setErrorMessage(error?.message || "Failed to update job status.");
    }
  }

  function handleIncrementAttempt(jobId, currentStatus) {
    return handleSetStatus(jobId, currentStatus, {
      incrementAttempts: true,
    });
  }

  async function handleSetError(jobId) {
    const errorMessage = window.prompt("Enter the last error message:");
    if (errorMessage === null) {
      return;
    }

    try {
      setErrorMessage("");
      await setAutomationJobError(jobId, errorMessage || "Automation job failed.");
      setJobs(getAutomationQueue());
    } catch (error) {
      setErrorMessage(error?.message || "Failed to save automation error.");
    }
  }

  async function handleUpdateNotes(jobId, currentNotes) {
    const nextNotes = window.prompt("Edit notes for this job:", currentNotes || "");
    if (nextNotes === null) {
      return;
    }

    try {
      setErrorMessage("");
      await updateAutomationJobNotes(jobId, nextNotes);
      setJobs(getAutomationQueue());
    } catch (error) {
      setErrorMessage(error?.message || "Failed to update automation notes.");
    }
  }

  async function handleResetJob(jobId) {
    try {
      setErrorMessage("");
      await resetAutomationJob(jobId);
      setJobs(getAutomationQueue());
    } catch (error) {
      setErrorMessage(error?.message || "Failed to reset automation job.");
    }
  }

  async function handleDeleteJob(jobId) {
    try {
      setErrorMessage("");
      await removeAutomationJob(jobId);
      setJobs(getAutomationQueue());
    } catch (error) {
      setErrorMessage(error?.message || "Failed to delete automation job.");
    }
  }

  async function handleClearQueue() {
    const confirmed = window.confirm(
      "Are you sure you want to clear all automation jobs?"
    );
    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");
      await clearAutomationQueue();
      setJobs([]);
    } catch (error) {
      setErrorMessage(error?.message || "Failed to clear automation jobs.");
    }
  }

  async function runJob(jobId, options) {
    if (runningJobId !== null) {
      return;
    }

    try {
      setRunningJobId(jobId);
      setErrorMessage("");
      await executeAutomationJob(jobId, options);
      setJobs(getAutomationQueue());
    } catch (error) {
      setErrorMessage(error?.message || "Failed to run automation job.");
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
    [jobs, search, statusFilter]
  );

  return {
    jobs,
    loading,
    errorMessage,
    canManageJobs,
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
