function SectionTableHeader({
  columns,
  gridTemplateColumns,
  gap = "8px",
  padding = "8px 10px",
  marginBottom = "8px",
  fontSize = "12px",
  color = "#aaa",
  borderBottom = "1px solid #444",
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
        fontWeight: "bold",
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
