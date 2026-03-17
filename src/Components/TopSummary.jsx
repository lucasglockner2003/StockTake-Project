import { SummaryBadge, ProgressBar } from "./SummaryComponents";
import { styles } from "../utils/uiStyles";

function TopSummary({
  filledItems,
  totalItems,
  criticalCount,
  lowCount,
  checkCount,
  progress,
  lastSaved,
  missingItems,
  search,
  setSearch,
  handleReset,
  setCurrentPage,
}) {
  return (
    <div>
      <h1>SmartOps Stock Take</h1>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <SummaryBadge
          label="Filled"
          value={`${filledItems}/${totalItems}`}
          backgroundColor="#1f1f1f"
          textColor="white"
        />

        <SummaryBadge
          label="Critical"
          value={criticalCount}
          backgroundColor="#fff7ca"
          textColor="#ff4d4d"
        />

        <SummaryBadge
          label="Low"
          value={lowCount}
          backgroundColor="#fff7ca"
          textColor="#ff9900"
        />

        <SummaryBadge
          label="Check"
          value={checkCount}
          backgroundColor="#fff7ca"
          textColor="#ff7b00"
        />
      </div>

      <ProgressBar progress={progress} />

      {lastSaved && (
        <p style={{ fontSize: "12px", color: "#aaa" }}>
          Last saved: {lastSaved.toLocaleTimeString()}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={() => setCurrentPage("voice")}
          style={{
            padding: "12px 20px",
            backgroundColor: "#002fff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Stock Voice
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: "12px 20px",
            backgroundColor: "#d9534f",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Reset Stock Take
        </button>

        <button
          disabled={missingItems > 0}
          onClick={() => setCurrentPage("review")}
          style={{
            padding: "12px 20px",
            backgroundColor: missingItems > 0 ? "#ccc" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: missingItems > 0 ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {missingItems > 0
            ? `Finish Stock Take (${missingItems} missing)`
            : "Finish Stock Take"}
        </button>

        <button
          onClick={() => setCurrentPage("photo")}
          style={{
            padding: "12px 20px",
            backgroundColor: "#6f42c1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Photo Order
        </button>

        <button
          onClick={() => setCurrentPage("automation")}
          style={{
            ...styles.primaryButton,
            backgroundColor: "#ff9800",
          }}
        >
          View Automation Jobs
        </button>
      </div>

      <input
        type="text"
        placeholder="Search item..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "8px 10px",
          width: "250px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          marginBottom: "20px",
        }}
      />
    </div>
  );
}

export default TopSummary;