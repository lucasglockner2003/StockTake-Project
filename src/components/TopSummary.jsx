import { PAGE_IDS } from "../constants/pages";
import { styles } from "../utils/uiStyles";
import PageActionBar from "./PageActionBar";

function ProgressBar({ progress }) {
  return (
    <div style={{ width: "100%", maxWidth: "520px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
          fontSize: "12px",
          color: "#cbd5e1",
        }}
      >
        <span>Stock Take Completion</span>
        <span style={{ fontWeight: 700 }}>{progress}%</span>
      </div>
      <div
        style={{
          width: "100%",
          height: "10px",
          backgroundColor: "#0b1220",
          borderRadius: "999px",
          overflow: "hidden",
          border: "1px solid #1f2937",
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
        padding: "5px 11px",
        fontSize: "12px",
        fontWeight: 600,
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
          borderRadius: "16px",
          border: "1px solid #1f2937",
          background:
            "linear-gradient(135deg, rgba(17,24,39,0.98) 0%, rgba(15,23,42,0.98) 100%)",
          padding: "20px",
          marginBottom: "14px",
          boxShadow: "0 12px 26px rgba(2, 6, 23, 0.2)",
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
                color: "#7dd3fc",
                marginBottom: "8px",
                fontWeight: 600,
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
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#fca5a5" }}>
                  {errorMessage}
                </p>
              ) : isLoading ? (
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#93c5fd" }}>
                  Loading live stock take...
                </p>
              ) : isSaving ? (
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#86efac" }}>
                  Saving changes to the backend...
                </p>
              ) : lastSaved ? (
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                  Last saved: {lastSaved.toLocaleTimeString()}
                </p>
              ) : (
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
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
          ...styles.darkPanel,
          padding: "16px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "10px",
            fontWeight: 600,
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
                ...styles.input,
                width: "260px",
                maxWidth: "100%",
              }}
            />

            
          </div>
          
        </div>
        
      </div>
      
    </div>
    
  );
}

export default TopSummary;
