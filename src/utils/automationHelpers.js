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
  return {
    jobId: Date.now(),
    createdAt: new Date().toISOString(),
    status: "pending",
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