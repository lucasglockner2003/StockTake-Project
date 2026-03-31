function NoticePanel({
  children,
  backgroundColor,
  border = "1px solid #1f2937",
  color = "#e5e7eb",
  marginBottom = "16px",
  padding = "12px 14px",
  borderRadius = "12px",
  fontWeight = 600,
  style,
}) {
  return (
    <div
      style={{
        marginBottom,
        padding,
        borderRadius,
        backgroundColor,
        border,
        color,
        fontWeight,
        lineHeight: 1.55,
        boxShadow: "0 8px 18px rgba(2, 6, 23, 0.16)",
        transition: "all 0.2s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default NoticePanel;
