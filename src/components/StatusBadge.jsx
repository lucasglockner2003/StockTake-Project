function resolveBadgePalette(backgroundColor, textColor) {
  const normalizedBackground = String(backgroundColor || "").trim().toLowerCase();
  const normalizedText = String(textColor || "").trim().toLowerCase();
  const lightBackgrounds = new Set([
    "#1f1f1f",
    "#2a2a2a",
    "#fff3e0",
    "#e3f2fd",
    "#e8f5e9",
    "#ffebee",
    "#e0f7fa",
  ]);

  if (normalizedText === "#4caf50" || normalizedText === "#22c55e") {
    return {
      backgroundColor: "rgba(34, 197, 94, 0.14)",
      textColor: "#86efac",
      borderColor: "rgba(34, 197, 94, 0.26)",
    };
  }

  if (
    normalizedText === "#2196f3" ||
    normalizedText === "#3b82f6" ||
    normalizedText === "#00acc1"
  ) {
    return {
      backgroundColor: "rgba(59, 130, 246, 0.14)",
      textColor: normalizedText === "#00acc1" ? "#67e8f9" : "#93c5fd",
      borderColor:
        normalizedText === "#00acc1"
          ? "rgba(34, 211, 238, 0.24)"
          : "rgba(59, 130, 246, 0.24)",
    };
  }

  if (normalizedText === "#d9534f" || normalizedText === "#ef4444") {
    return {
      backgroundColor: "rgba(239, 68, 68, 0.14)",
      textColor: "#fca5a5",
      borderColor: "rgba(239, 68, 68, 0.24)",
    };
  }

  if (normalizedText === "#ff9800" || normalizedText === "#f59e0b") {
    return {
      backgroundColor: "rgba(245, 158, 11, 0.16)",
      textColor: "#fcd34d",
      borderColor: "rgba(245, 158, 11, 0.24)",
    };
  }

  if (normalizedBackground && !lightBackgrounds.has(normalizedBackground)) {
    return {
      backgroundColor,
      textColor: textColor || "#e5e7eb",
      borderColor: "rgba(148, 163, 184, 0.18)",
    };
  }

  return {
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    textColor: textColor || "#e5e7eb",
    borderColor: "rgba(148, 163, 184, 0.22)",
  };
}

function StatusBadge({
  label,
  value,
  backgroundColor,
  textColor,
  padding = "4px 10px",
  borderRadius = "999px",
  fontSize = "12px",
}) {
  const palette = resolveBadgePalette(backgroundColor, textColor);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        backgroundColor: palette.backgroundColor,
        color: palette.textColor,
        padding,
        borderRadius,
        border: `1px solid ${palette.borderColor}`,
        fontWeight: 600,
        fontSize,
        letterSpacing: "0.01em",
        lineHeight: 1.2,
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default StatusBadge;
