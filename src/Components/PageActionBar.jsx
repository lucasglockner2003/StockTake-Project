function PageActionBar({
  children,
  marginBottom = "20px",
  alignItems,
  gap = "10px",
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
