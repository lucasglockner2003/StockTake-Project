import {
  loadAutomationQueue,
  saveAutomationQueue,
} from "./automationHelpers";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function markJobRunning(queue, jobId) {
  return queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          status: "running",
          attemptCount: (job.attemptCount || 0) + 1,
          lastError: "",
          updatedAt: new Date().toISOString(),
        }
      : job
  );
}

function markJobDone(queue, jobId) {
  return queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          status: "done",
          updatedAt: new Date().toISOString(),
        }
      : job
  );
}

function markJobFailed(queue, jobId, errorMessage) {
  return queue.map((job) =>
    job.jobId === jobId
      ? {
          ...job,
          status: "failed",
          lastError: errorMessage || "Unknown automation error.",
          updatedAt: new Date().toISOString(),
        }
      : job
  );
}

export async function executeAutomationJob(jobId, options = {}) {
  const {
    shouldFail = false,
    delayMs = 1800,
    failureMessage = "Simulated automation failure.",
  } = options;

  let queue = loadAutomationQueue();
  queue = markJobRunning(queue, jobId);
  saveAutomationQueue(queue);

  await wait(delayMs);

  queue = loadAutomationQueue();

  if (shouldFail) {
    queue = markJobFailed(queue, jobId, failureMessage);
    saveAutomationQueue(queue);
    return {
      ok: false,
      queue,
    };
  }

  queue = markJobDone(queue, jobId);
  saveAutomationQueue(queue);

  return {
    ok: true,
    queue,
  };
}