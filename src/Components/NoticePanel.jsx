function NoticePanel({
  children,
  backgroundColor,
  border = "1px solid #444",
  color = "white",
  marginBottom = "20px",
  padding = "12px",
  borderRadius = "8px",
  fontWeight = "bold",
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
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default NoticePanel;
