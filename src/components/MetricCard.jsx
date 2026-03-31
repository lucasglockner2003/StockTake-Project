const TONE_STYLES = {
  default: {
    border: "1px solid rgba(31, 41, 55, 0.95)",
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    accentColor: "#94a3b8",
  },
  info: {
    border: "1px solid rgba(59, 130, 246, 0.26)",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    accentColor: "#93c5fd",
  },
  success: {
    border: "1px solid rgba(34, 197, 94, 0.22)",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    accentColor: "#86efac",
  },
  warning: {
    border: "1px solid rgba(245, 158, 11, 0.22)",
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    accentColor: "#fcd34d",
  },
  danger: {
    border: "1px solid rgba(239, 68, 68, 0.22)",
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    accentColor: "#fca5a5",
  },
};

function MetricCard({ label, value, detail, tone = "default" }) {
  const toneStyles = TONE_STYLES[tone] || TONE_STYLES.default;

  return (
    <div
      style={{
        borderRadius: "14px",
        padding: "18px",
        minHeight: "124px",
        display: "grid",
        gap: "10px",
        alignContent: "start",
        boxShadow: "0 10px 24px rgba(2, 6, 23, 0.2)",
        transition: "all 0.2s ease",
        ...toneStyles,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: toneStyles.accentColor,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "30px",
          lineHeight: 1,
          fontWeight: 600,
          color: "#f8fafc",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.5,
          color: "#94a3b8",
        }}
      >
        {detail}
      </div>
    </div>
  );
}

export default MetricCard;
