import { useEffect, useMemo, useState } from "react";
import { JOB_STATUSES } from "../constants/app";
import { USER_ROLES } from "../constants/access-control";
import { useAuth } from "./use-auth";
import {
  ensureAutomationQueueLoaded,
  executeAutomationJob,
  getAutomationJobCounts,
  getAutomationQueue,
  refreshAutomationQueue,
  removeAutomationJob,
  subscribeAutomationQueue,
} from "../utils/automation";

const AUTOMATION_POLL_INTERVAL_MS = 2500;

function buildPendingAction() {
  return {
    jobId: "",
    type: "",
  };
}

export function useAutomationJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState(() => getAutomationQueue());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingAction, setPendingAction] = useState(buildPendingAction);

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
        const queue = await ensureAutomationQueueLoaded();

        if (!isMounted) {
          return;
        }

        setJobs(queue);
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

  useEffect(() => {
    const hasRunningJobs = jobs.some((job) => job.status === JOB_STATUSES.RUNNING);
    const shouldPoll = hasRunningJobs || pendingAction.type === "run";

    if (!shouldPoll) {
      return undefined;
    }

    let isActive = true;

    async function pollJobs() {
      try {
        await refreshAutomationQueue();

        if (!isActive) {
          return;
        }

        setJobs(getAutomationQueue());
      } catch {
        if (!isActive) {
          return;
        }

        setErrorMessage("Failed to refresh automation jobs.");
      }
    }

    const intervalId = window.setInterval(pollJobs, AUTOMATION_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [jobs, pendingAction.type]);

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

  async function handleRunJob(jobId) {
    if (!canManageJobs || pendingAction.jobId) {
      return null;
    }

    try {
      setPendingAction({
        jobId,
        type: "run",
      });
      setErrorMessage("");
      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job.jobId === jobId
            ? {
                ...job,
                status: JOB_STATUSES.RUNNING,
                updatedAt: new Date().toISOString(),
              }
            : job
        )
      );

      const result = await executeAutomationJob(jobId);
      setJobs(getAutomationQueue());

      if (!result?.ok) {
        setErrorMessage(result?.job?.lastError || "Failed to run automation job.");
      }

      return result;
    } catch (error) {
      setJobs(getAutomationQueue());
      setErrorMessage(error?.message || "Failed to run automation job.");
      return null;
    } finally {
      setPendingAction(buildPendingAction());
    }
  }

  async function handleDeleteJob(jobId) {
    if (!canManageJobs || pendingAction.jobId) {
      return null;
    }

    try {
      setPendingAction({
        jobId,
        type: "delete",
      });
      setErrorMessage("");
      await removeAutomationJob(jobId);
      setJobs(getAutomationQueue());
      return true;
    } catch (error) {
      setErrorMessage(error?.message || "Failed to delete automation job.");
      return false;
    } finally {
      setPendingAction(buildPendingAction());
    }
  }

  const counts = useMemo(() => getAutomationJobCounts(jobs), [jobs]);
  const lastSuccessfulQuantities = useMemo(() => {
    const nextQuantities = {};
    const successfulJobs = [...jobs]
      .filter((job) => job.status === JOB_STATUSES.DONE)
      .sort((left, right) => {
        return (
          new Date(right.updatedAt || right.createdAt || 0).getTime() -
          new Date(left.updatedAt || left.createdAt || 0).getTime()
        );
      });

    successfulJobs.forEach((job) => {
      (job.items || []).forEach((item) => {
        const itemKey =
          item?.itemId !== null && item?.itemId !== undefined
            ? `id:${item.itemId}`
            : `name:${String(item?.itemName || "").trim().toLowerCase()}`;

        if (!itemKey || nextQuantities[itemKey] !== undefined) {
          return;
        }

        nextQuantities[itemKey] = Number(item?.quantity || 0);
      });
    });

    return nextQuantities;
  }, [jobs]);

  return {
    loading,
    errorMessage,
    canManageJobs,
    counts,
    lastSuccessfulQuantities,
    jobs,
    refreshJobs,
    handleRunJob,
    handleDeleteJob,
    pendingAction,
  };
}
