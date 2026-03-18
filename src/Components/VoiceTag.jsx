function VoiceTag() {
  return (
    <span
      title="Filled by voice"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "15px",
        backgroundColor: "#1e88e5",
        color: "white",
        borderRadius: "999px",
        padding: "4px 8px",
        fontWeight: "bold",
        lineHeight: 1,
        whiteSpace: "nowrap",
        marginLeft: "6px",
      }}
    >
      Voice
    </span>
  );
}

export default VoiceTag;
