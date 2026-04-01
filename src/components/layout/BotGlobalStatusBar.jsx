import { memo } from "react";
import { useBotServiceStatus } from "../../hooks/use-bot-service-status";

function getVisualTone(status) {
  if (status.loading) {
    return {
      dotClassName: "is-loading",
      headline: "Checking bot connection",
      detail: "",
    };
  }

  if (!status.online) {
    return {
      dotClassName: "is-offline",
      headline: "Bot Offline",
      detail: "Connection lost",
    };
  }

  if (status.running) {
    return {
      dotClassName: "is-running",
      headline: "Bot Online",
      detail: status.supplier
        ? `Running fill for ${status.supplier}`
        : "Running fill",
    };
  }

  return {
    dotClassName: "is-idle",
    headline: "Bot Online",
    detail: "Waiting for execution",
  };
}

function buildStatusLabel(visualTone) {
  return visualTone.detail
    ? `${visualTone.headline} - ${visualTone.detail}`
    : visualTone.headline;
}

function BotIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ width: "13px", height: "13px", display: "block" }}
    >
      <rect x="6.5" y="7" width="11" height="9" rx="2.5" />
      <path d="M12 4.5V7" />
      <path d="M9.5 11.5h.01" />
      <path d="M14.5 11.5h.01" />
      <path d="M9.5 15h5" />
    </svg>
  );
}

function BotGlobalStatusBar({ variant = "sidebar" }) {
  const botServiceStatus = useBotServiceStatus();
  const visualTone = getVisualTone(botServiceStatus);
  const statusLabel = buildStatusLabel(visualTone);

  if (variant === "sidebar") {
    return (
      <div
        className={`bot-global-status-chip is-${visualTone.dotClassName.replace("is-", "")}`}
        title={statusLabel}
        aria-label={statusLabel}
      >
        <span className="bot-global-status-chip__icon" aria-hidden="true">
          <BotIcon />
          <span
            className={`bot-global-status-chip__dot pulse ${visualTone.dotClassName}`}
          />
        </span>
        <span className="bot-global-status-chip__label">Bot</span>
      </div>
    );
  }

  return null;
}

export default memo(BotGlobalStatusBar);
