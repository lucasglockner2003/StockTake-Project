function SectionTableHeader({
  columns,
  gridTemplateColumns,
  gap = "8px",
  padding = "10px 12px",
  marginBottom = "8px",
  fontSize = "11px",
  color = "#94a3b8",
  borderBottom = "1px solid #1f2937",
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns,
        gap,
        alignItems: "center",
        padding,
        marginBottom,
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color,
        borderBottom,
      }}
    >
      {columns.map((column) => (
        <div key={column}>{column}</div>
      ))}
    </div>
  );
}

export default SectionTableHeader;
