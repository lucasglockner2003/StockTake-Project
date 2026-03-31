import {
  formatRoleLabel,
  getRoleTheme,
  getRoleWorkspaceSummary,
  getUserDisplayName,
  getUserInitials,
} from "../utils/user-display";

function AuthSessionPanel({ user, notice, onLogout }) {
  const roleTheme = getRoleTheme(user?.role);

  return (
    <div
      style={{
        marginTop: "auto",
        paddingTop: "14px",
        display: "grid",
        gap: "10px",
      }}
    >
      {notice ? (
        <div
          style={{
            borderRadius: "10px",
            border: "1px solid rgba(110, 231, 183, 0.28)",
            backgroundColor: "rgba(6, 78, 59, 0.28)",
            color: "#bbf7d0",
            padding: "10px 12px",
            fontSize: "12px",
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          {notice}
        </div>
      ) : null}

      <div
        style={{
          borderRadius: "12px",
          border: "1px solid rgba(31, 41, 55, 0.94)",
          backgroundColor: "rgba(15, 23, 42, 0.7)",
          padding: "14px",
          display: "grid",
          gap: "10px",
          boxShadow: "0 12px 24px rgba(2, 6, 23, 0.18)",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              border: `1px solid ${roleTheme.badgeBorder}`,
              backgroundColor: roleTheme.badgeBackground,
              color: roleTheme.badgeText,
              display: "grid",
              placeItems: "center",
              fontSize: "15px",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getUserInitials(user)}
          </div>

          <div style={{ minWidth: 0, display: "grid", gap: "3px" }}>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#8ad9d0",
                fontWeight: 600,
              }}
            >
              Signed In
            </div>

            <div
              style={{
                fontSize: "15px",
                lineHeight: 1.35,
                fontWeight: 600,
                color: "#f8fafc",
                wordBreak: "break-word",
              }}
            >
              {getUserDisplayName(user)}
            </div>

            <div
              style={{
                fontSize: "12px",
                lineHeight: 1.45,
                color: "#94a3b8",
                wordBreak: "break-word",
              }}
            >
              {user?.email || "Authenticated user"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "8px",
          }}
        >
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
              padding: "4px 8px",
              letterSpacing: "0.04em",
            }}
          >
            {formatRoleLabel(user?.role || "Staff")}
          </div>

          <div
            style={{
              fontSize: "12px",
              lineHeight: 1.5,
              color: "#8fa6bf",
            }}
          >
            {getRoleWorkspaceSummary(user?.role)}
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          style={{
            width: "100%",
            border: "1px solid rgba(248, 113, 113, 0.3)",
            borderRadius: "10px",
            backgroundColor: "rgba(127, 29, 29, 0.25)",
            color: "#fecaca",
            padding: "10px 12px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default AuthSessionPanel;
