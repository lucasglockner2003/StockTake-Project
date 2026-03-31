function PageActionBar({
  children,
  marginBottom = "18px",
  alignItems = "center",
  gap = "12px",
}) {
  return (
    <div
      style={{
        display: "flex",
        gap,
        flexWrap: "wrap",
        marginBottom,
        alignItems,
      }}
    >
      {children}
    </div>
  );
}

export default PageActionBar;
