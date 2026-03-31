import {
  formatRoleLabel,
  getRoleTheme,
  getRoleWorkspaceSummary,
  getUserDisplayName,
  getUserInitials,
} from "../utils/user-display";

function buildPulseItems(snapshot) {
  return [
    {
      label: "Stock coverage",
      value: `${snapshot.stock.progress}%`,
    },
    {
      label: "Automation active",
      value: snapshot.automation.activeCount,
    },
    {
      label: "Orders to act",
      value: snapshot.dailyOrders.actionableCount,
    },
    {
      label: "Invoices queued",
      value: snapshot.invoices.counts.queued,
    },
  ];
}

function WorkspaceHeader({ currentPage, snapshot, user }) {
  const roleTheme = getRoleTheme(user?.role);
  const pulseItems = buildPulseItems(snapshot);

  return (
    <header
      style={{
        borderRadius: "18px",
        border: "1px solid #1f2937",
        background:
          "linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(17, 24, 39, 0.98) 100%)",
        padding: "20px",
        display: "grid",
        gap: "18px",
        boxShadow: "0 14px 30px rgba(2, 6, 23, 0.22)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: "10px" }}>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: roleTheme.accentColor,
              fontWeight: 600,
            }}
          >
            Secure Workspace
          </div>

          <div
            style={{
              fontSize: "30px",
              lineHeight: 1.05,
              fontWeight: 600,
              color: "#f8fafc",
            }}
          >
            {currentPage?.label || "Workspace"}
          </div>

          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#94a3b8",
              maxWidth: "760px",
            }}
          >
            {currentPage?.description || getRoleWorkspaceSummary(user?.role)}
          </div>
        </div>

        <div
          style={{
            borderRadius: "16px",
            border: "1px solid rgba(51, 65, 85, 0.92)",
            backgroundColor: "rgba(15, 23, 42, 0.82)",
            padding: "16px",
            display: "grid",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                border: `1px solid ${roleTheme.badgeBorder}`,
                backgroundColor: roleTheme.badgeBackground,
                color: roleTheme.badgeText,
                display: "grid",
                placeItems: "center",
                fontSize: "16px",
                fontWeight: 700,
              }}
            >
              {getUserInitials(user)}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#f8fafc",
                lineHeight: 1.3,
              }}
              >
                {getUserDisplayName(user)}
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#94a3b8",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {user?.email || "Authenticated user"}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              width: "fit-content",
              borderRadius: "999px",
              border: `1px solid ${roleTheme.badgeBorder}`,
              backgroundColor: roleTheme.badgeBackground,
              color: roleTheme.badgeText,
              fontSize: "11px",
              fontWeight: 600,
              padding: "5px 10px",
              letterSpacing: "0.05em",
            }}
          >
            {formatRoleLabel(user?.role)}
          </div>

          <div
            style={{
              fontSize: "13px",
              lineHeight: 1.5,
              color: "#8fa6bf",
            }}
          >
            {getRoleWorkspaceSummary(user?.role)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "10px",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        }}
      >
        {pulseItems.map((item) => (
          <div
            key={item.label}
            style={{
              borderRadius: "12px",
              border: "1px solid rgba(31, 41, 55, 0.95)",
              backgroundColor: "rgba(17, 24, 39, 0.86)",
              padding: "14px 16px",
              display: "grid",
              gap: "6px",
              boxShadow: "0 8px 18px rgba(2, 6, 23, 0.16)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#8ad9d0",
                fontWeight: 600,
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: "#f8fafc",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </header>
  );
}

export default WorkspaceHeader;
