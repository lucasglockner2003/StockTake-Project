import { PAGE_IDS } from "../constants/pages";
import { styles } from "../utils/uiStyles";
import PageActionBar from "./PageActionBar";

function ProgressBar({ progress }) {
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          
          gap:"320px",
          marginBottom: "8px",
          fontSize: "12px",
          color: "#bfdbfe",
        }}
      >
        <span>Stock Take Completion</span>
        <span style={{ fontWeight: 1000 }}>{progress}%</span>
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: "470px",
          height: "10px",
          backgroundColor: "#111c30",
          borderRadius: "999px",
          overflow: "hidden",
          border: "1px solid #2f4265",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg, #22c55e 0%, #14b8a6 100%)",
          }}
        />
      </div>
    </div>
  );
}

function InlineMetricPill({
  label,
  value,
  borderColor,
  backgroundColor,
  textColor,
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        borderRadius: "999px",
        border: `1px solid ${borderColor}`,
        backgroundColor,
        color: textColor,
        padding: "4px 10px",
        fontSize: "12px",
        fontWeight: 700,
      }}
    >
      <span style={{ opacity: 0.9 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

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
  isLoading,
  isSaving,
  errorMessage,
}) {
  const dashboardDate = new Date().toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const isBlocked = missingItems > 0;

  return (
    <div style={{ marginBottom: "18px" }}>
      <div
        style={{
          borderRadius: "12px",
          border: "1px solid #23314f",
          background:
            "linear-gradient(90deg, rgba(13,26,46,0.96) 0%, rgba(15,37,52,0.96) 100%)",
          padding: "16px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#a7f3d0",
                marginBottom: "8px",
              }}
            >
              Operations Dashboard
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <h1 style={{ margin: 0, color: "#f8fafc", fontSize: "30px", lineHeight: 1.1 }}>
                Stock Take
              </h1>

              <InlineMetricPill
                label="Filled"
                value={`${filledItems}/${totalItems}`}
                borderColor="#334155"
                backgroundColor="#0f172a"
                textColor="#f8fafc"
              />
              <InlineMetricPill
                label="Critical"
                value={criticalCount}
                borderColor="#7f1d1d"
                backgroundColor="#2b1212"
                textColor="#fca5a5"
              />
              <InlineMetricPill
                label="Low"
                value={lowCount}
                borderColor="#92400e"
                backgroundColor="#2f1b0b"
                textColor="#fdba74"
              />
              <InlineMetricPill
                label="Check"
                value={checkCount}
                borderColor="#1e3a8a"
                backgroundColor="#0f203f"
                textColor="#93c5fd"
              />

              
              <ProgressBar progress={progress} />
              {errorMessage ? (
                <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#fca5a5" }}>
                  {errorMessage}
                </p>
              ) : isLoading ? (
                <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#93c5fd" }}>
                  Loading live stock take...
                </p>
              ) : isSaving ? (
                <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#a7f3d0" }}>
                  Saving changes to the backend...
                </p>
              ) : lastSaved ? (
                <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8" }}>
                  Last saved: {lastSaved.toLocaleTimeString()}
                </p>
              ) : (
                <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8" }}>
                  Connected to today&apos;s live stock take.
                </p>
              )}
            
            </div>
            
            
          </div>
              <p style={{ margin: "0.1px 0 0", color: "#94a3b8", fontSize: "15px" }}>
              {dashboardDate}
            </p>
        </div>

        
      </div>

      

      <div
        style={{
          borderRadius: "10px",
          border: "1px solid #273447",
          backgroundColor: "#0f172a",
          padding: "12px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "10px",
          }}
        >
          Actions & Search
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <PageActionBar marginBottom="0" gap="8px">
            <button
              disabled={isLoading}
              onClick={handleReset}
              style={{
                ...styles.primaryButton,
                padding: "10px 16px",
                backgroundColor: isLoading ? "#475569" : "#dc2626",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              Reset Stock Take
            </button>

            <button
              disabled={isLoading || isBlocked}
              onClick={() => setCurrentPage(PAGE_IDS.REVIEW)}
              style={{
                ...styles.primaryButton,
                padding: "10px 16px",
                backgroundColor: isLoading || isBlocked ? "#475569" : "#16a34a",
                cursor: isLoading || isBlocked ? "not-allowed" : "pointer",
              }}
            >
              {isBlocked ? `Finish Stock Take (${missingItems} missing)` : "Finish Stock Take"}
            </button>
          </PageActionBar>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="Search item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "10px 12px",
                width: "260px",
                maxWidth: "100%",
                borderRadius: "8px",
                border: "1px solid #334155",
                backgroundColor: "#020617",
                color: "#f8fafc",
                outline: "none",
              }}
            />

            
          </div>
          
        </div>
        
      </div>
      
    </div>
    
  );
}

export default TopSummary;
