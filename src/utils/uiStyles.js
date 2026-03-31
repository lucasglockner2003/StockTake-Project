export const styles = {
  backButton: {
    padding: "10px 14px",
    backgroundColor: "#1f2937",
    color: "#e5e7eb",
    border: "1px solid #374151",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    marginBottom: "20px",
    boxShadow: "0 8px 18px rgba(2, 6, 23, 0.18)",
    transition: "all 0.2s ease",
  },

  primaryButton: {
    padding: "10px 14px",
    backgroundColor: "#00b894",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: 1.2,
    boxShadow:
      "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 20px rgba(0, 0, 0, 0.18)",
    transition: "all 0.2s ease",
  },

  deleteButton: {
    padding: "9px 12px",
    backgroundColor: "#ef4444",
    color: "white",
    border: "1px solid rgba(248, 113, 113, 0.25)",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 8px 18px rgba(127, 29, 29, 0.18)",
    transition: "all 0.2s ease",
  },

  input: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #334155",
    backgroundColor: "#0b1220",
    color: "#e5e7eb",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    fontSize: "14px",
    transition: "all 0.2s ease",
  },

  darkPanel: {
    border: "1px solid #1f2937",
    borderRadius: "14px",
    padding: "18px",
    background:
      "linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)",
    boxShadow: "0 10px 24px rgba(2, 6, 23, 0.22)",
    transition: "all 0.2s ease",
  },

  emptyState: {
    border: "1px dashed #334155",
    borderRadius: "14px",
    padding: "18px",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    color: "#94a3b8",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02)",
  },

  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "12px",
    maxHeight: "220px",
    overflowY: "auto",
    zIndex: 20,
    marginTop: "6px",
    boxShadow: "0 18px 32px rgba(2, 6, 23, 0.34)",
  },

  dropdownItem: {
    padding: "10px 12px",
    cursor: "pointer",
    borderBottom: "1px solid rgba(51, 65, 85, 0.7)",
    color: "#e5e7eb",
    transition: "all 0.2s ease",
  },

  dropdownEmpty: {
    padding: "10px 12px",
    color: "#94a3b8",
  },

  sectionHeaderRow: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.7fr 1fr 0.8fr 100px",
    gap: "8px",
    alignItems: "center",
    padding: "10px 12px",
    marginBottom: "8px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#94a3b8",
    borderBottom: "1px solid #1f2937",
  },

  entryRow: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.7fr 1fr 0.8fr 100px",
    gap: "8px",
    alignItems: "center",
    padding: "12px",
    marginBottom: "6px",
    border: "1px solid #1f2937",
    borderRadius: "12px",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    boxShadow: "0 8px 18px rgba(2, 6, 23, 0.18)",
  },
};
