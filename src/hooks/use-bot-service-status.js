import { useSyncExternalStore } from "react";
import { getDailyOrdersBotServiceStatus } from "../services/daily-orders-service";

const BOT_STATUS_POLL_INTERVAL_MS = 3000;

const INITIAL_BOT_SERVICE_STATUS = Object.freeze({
  online: false,
  running: false,
  type: "",
  phase: "",
  supplier: "",
  status: "loading",
  message: "Checking bot connection",
  lastCheckedAt: "",
  loading: true,
});

let currentStatus = INITIAL_BOT_SERVICE_STATUS;
let pollingIntervalId = null;
let inFlightRequest = null;
const listeners = new Set();

function emitChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

function normalizeBotServiceStatus(payload) {
  const online = Boolean(payload?.online);
  const running = Boolean(payload?.running);

  return {
    online,
    running,
    type: typeof payload?.type === "string" ? payload.type : "",
    phase:
      typeof payload?.phase === "string"
        ? payload.phase
        : online
        ? "idle"
        : "offline",
    supplier: typeof payload?.supplier === "string" ? payload.supplier : "",
    status:
      typeof payload?.status === "string"
        ? payload.status
        : running
        ? "running"
        : online
        ? "ok"
        : "offline",
    message:
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message
        : online
        ? "Bot service online."
        : "Bot service is offline.",
    lastCheckedAt:
      typeof payload?.lastCheckedAt === "string" ? payload.lastCheckedAt : "",
    loading: false,
  };
}

function buildOfflineStatus(error) {
  return {
    online: false,
    running: false,
    type: "",
    phase: "offline",
    supplier: "",
    status: "offline",
    message: error?.message || "Connection lost",
    lastCheckedAt: new Date().toISOString(),
    loading: false,
  };
}

function hasStatusChanged(nextStatus) {
  return (
    currentStatus.online !== nextStatus.online ||
    currentStatus.running !== nextStatus.running ||
    currentStatus.type !== nextStatus.type ||
    currentStatus.phase !== nextStatus.phase ||
    currentStatus.supplier !== nextStatus.supplier ||
    currentStatus.status !== nextStatus.status ||
    currentStatus.message !== nextStatus.message ||
    currentStatus.loading !== nextStatus.loading
  );
}

function setCurrentStatus(nextStatus) {
  if (!hasStatusChanged(nextStatus)) {
    return;
  }

  currentStatus = nextStatus;
  emitChange();
}

async function pollBotServiceStatus() {
  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = getDailyOrdersBotServiceStatus()
    .then((payload) => {
      setCurrentStatus(normalizeBotServiceStatus(payload));
    })
    .catch((error) => {
      setCurrentStatus(buildOfflineStatus(error));
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

function startPolling() {
  if (typeof window === "undefined" || pollingIntervalId !== null) {
    return;
  }

  void pollBotServiceStatus();
  pollingIntervalId = window.setInterval(() => {
    void pollBotServiceStatus();
  }, BOT_STATUS_POLL_INTERVAL_MS);
}

function stopPollingIfIdle() {
  if (typeof window === "undefined") {
    return;
  }

  if (listeners.size > 0 || pollingIntervalId === null) {
    return;
  }

  window.clearInterval(pollingIntervalId);
  pollingIntervalId = null;
}

function subscribe(listener) {
  listeners.add(listener);
  startPolling();

  return () => {
    listeners.delete(listener);
    stopPollingIfIdle();
  };
}

function getSnapshot() {
  return currentStatus;
}

export function useBotServiceStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
