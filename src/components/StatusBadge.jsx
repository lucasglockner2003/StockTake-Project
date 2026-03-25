function StatusBadge({
  label,
  value,
  backgroundColor,
  textColor,
  padding = "10px 14px",
  borderRadius = "999px",
  fontSize = "14px",
}) {
  return (
    <div
      style={{
        backgroundColor,
        color: textColor,
        padding,
        borderRadius,
        fontWeight: "bold",
        fontSize,
      }}
    >
      {label} {value}
    </div>
  );
}

export default StatusBadge;
