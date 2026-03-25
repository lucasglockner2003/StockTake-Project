const TONE_STYLES = {
  default: {
    border: "1px solid rgba(67, 108, 130, 0.45)",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    accentColor: "#8ad9d0",
  },
  info: {
    border: "1px solid rgba(125, 211, 252, 0.32)",
    backgroundColor: "rgba(8, 47, 73, 0.42)",
    accentColor: "#bae6fd",
  },
  success: {
    border: "1px solid rgba(110, 231, 183, 0.3)",
    backgroundColor: "rgba(6, 78, 59, 0.26)",
    accentColor: "#bbf7d0",
  },
  warning: {
    border: "1px solid rgba(251, 191, 36, 0.28)",
    backgroundColor: "rgba(120, 53, 15, 0.24)",
    accentColor: "#fde68a",
  },
  danger: {
    border: "1px solid rgba(248, 113, 113, 0.28)",
    backgroundColor: "rgba(127, 29, 29, 0.24)",
    accentColor: "#fecaca",
  },
};

function MetricCard({ label, value, detail, tone = "default" }) {
  const toneStyles = TONE_STYLES[tone] || TONE_STYLES.default;

  return (
    <div
      style={{
        borderRadius: "14px",
        padding: "16px",
        minHeight: "124px",
        display: "grid",
        gap: "10px",
        alignContent: "start",
        ...toneStyles,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: toneStyles.accentColor,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "30px",
          lineHeight: 1,
          fontWeight: 700,
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
