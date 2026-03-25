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
        borderRadius: "16px",
        border: "1px solid #24344d",
        background:
          "linear-gradient(135deg, rgba(12, 20, 36, 0.96) 0%, rgba(9, 30, 45, 0.96) 100%)",
        padding: "18px",
        display: "grid",
        gap: "16px",
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
              fontWeight: 700,
            }}
          >
            Secure Workspace
          </div>

          <div
            style={{
              fontSize: "30px",
              lineHeight: 1.05,
              fontWeight: 700,
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
            borderRadius: "14px",
            border: "1px solid rgba(67, 108, 130, 0.45)",
            backgroundColor: "rgba(7, 18, 32, 0.62)",
            padding: "14px",
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
                  fontWeight: 700,
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
              fontWeight: 700,
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
              border: "1px solid rgba(67, 108, 130, 0.45)",
              backgroundColor: "rgba(15, 23, 42, 0.72)",
              padding: "12px 14px",
              display: "grid",
              gap: "6px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#8ad9d0",
                fontWeight: 700,
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
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
