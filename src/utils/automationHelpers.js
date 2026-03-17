const AUTOMATION_QUEUE_KEY = "smartops-automation-queue";

export function loadAutomationQueue() {
  try {
    const saved = localStorage.getItem(AUTOMATION_QUEUE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveAutomationQueue(queue) {
  try {
    localStorage.setItem(AUTOMATION_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage errors
  }
}

export function createAutomationJob(jobData) {
  const now = new Date().toISOString();

  return {
    jobId: Date.now(),
    createdAt: now,
    updatedAt: now,
    status: "pending",
    notes: "",
    attemptCount: 0,
    lastError: "",
    ...jobData,
  };
}

export function pushAutomationJob(jobData) {
  const queue = loadAutomationQueue();
  const newJob = createAutomationJob(jobData);
  const nextQueue = [newJob, ...queue];
  saveAutomationQueue(nextQueue);
  return newJob;
}

export function updateAutomationJobStatus(jobId, status) {
  const queue = loadAutomationQueue();

  const nextQueue = queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          status,
          updatedAt: new Date().toISOString(),
          lastError: status === "failed" ? job.lastError : "",
        }
      : job
  );

  saveAutomationQueue(nextQueue);
  return nextQueue;
}

export function incrementAutomationJobAttempt(jobId) {
  const queue = loadAutomationQueue();

  const nextQueue = queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          attemptCount: (job.attemptCount || 0) + 1,
          updatedAt: new Date().toISOString(),
        }
      : job
  );

  saveAutomationQueue(nextQueue);
  return nextQueue;
}

export function setAutomationJobError(jobId, errorMessage) {
  const queue = loadAutomationQueue();

  const nextQueue = queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          status: "failed",
          lastError: errorMessage || "",
          updatedAt: new Date().toISOString(),
        }
      : job
  );

  saveAutomationQueue(nextQueue);
  return nextQueue;
}

export function updateAutomationJobNotes(jobId, notes) {
  const queue = loadAutomationQueue();

  const nextQueue = queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          notes,
          updatedAt: new Date().toISOString(),
        }
      : job
  );

  saveAutomationQueue(nextQueue);
  return nextQueue;
}

export function resetAutomationJob(jobId) {
  const queue = loadAutomationQueue();

  const nextQueue = queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          status: "pending",
          lastError: "",
          updatedAt: new Date().toISOString(),
        }
      : job
  );

  saveAutomationQueue(nextQueue);
  return nextQueue;
}

export function deleteAutomationJob(jobId) {
  const queue = loadAutomationQueue();
  const nextQueue = queue.filter((job) => job.jobId !== jobId);
  saveAutomationQueue(nextQueue);
  return nextQueue;
}

export function clearAutomationQueue() {
  try {
    localStorage.removeItem(AUTOMATION_QUEUE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getAutomationJobCounts(jobs) {
  return (jobs || []).reduce(
    (acc, job) => {
      acc.total += 1;

      if (job.status === "pending") acc.pending += 1;
      if (job.status === "running") acc.running += 1;
      if (job.status === "done") acc.done += 1;
      if (job.status === "failed") acc.failed += 1;

      return acc;
    },
    {
      total: 0,
      pending: 0,
      running: 0,
      done: 0,
      failed: 0,
    }
  );
}

export function filterAutomationJobs(jobs, statusFilter = "all", search = "") {
  const normalizedSearch = String(search || "").trim().toLowerCase();

  return (jobs || []).filter((job) => {
    const matchesStatus =
      statusFilter === "all" ? true : job.status === statusFilter;

    const matchesSearch =
      normalizedSearch === ""
        ? true
        : String(job.jobId).toLowerCase().includes(normalizedSearch) ||
          String(job.sessionId || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          (job.items || []).some((item) =>
            String(item.itemName || "")
              .toLowerCase()
              .includes(normalizedSearch)
          );

    return matchesStatus && matchesSearch;
  });
}