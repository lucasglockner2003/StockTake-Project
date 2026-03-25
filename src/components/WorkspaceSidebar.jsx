import AuthSessionPanel from "./AuthSessionPanel";
import { formatRoleLabel, getRoleWorkspaceSummary } from "../utils/user-display";

function WorkspaceSidebar({
  allowedPages,
  currentPage,
  loading,
  notice,
  onLogout,
  onNavigate,
  user,
}) {
  return (
    <aside
      className="dashboard-sidebar"
      style={{
        position: "sticky",
        top: "16px",
        alignSelf: "start",
        width: "100%",
        minHeight: "calc(100vh - 32px)",
        borderRadius: "16px",
        border: "1px solid #1f4d4a",
        background:
          "linear-gradient(180deg, rgba(9, 64, 63, 0.98) 0%, rgba(8, 39, 51, 0.98) 58%, rgba(6, 18, 32, 0.98) 100%)",
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        boxShadow: "0 18px 34px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div style={{ display: "grid", gap: "12px", padding: "4px 8px 14px" }}>
        <div style={{ display: "grid", gap: "4px" }}>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#9ce2d7",
              fontWeight: 700,
            }}
          >
            SmartOps
          </div>

          <div
            style={{
              fontSize: "26px",
              lineHeight: 1,
              fontWeight: 700,
              color: "#f8fafc",
            }}
          >
            Workspace
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            width: "fit-content",
            borderRadius: "999px",
            border: "1px solid rgba(125, 211, 252, 0.24)",
            backgroundColor: "rgba(14, 116, 144, 0.18)",
            color: "#bae6fd",
            fontSize: "11px",
            fontWeight: 700,
            padding: "4px 8px",
            letterSpacing: "0.05em",
          }}
        >
          {formatRoleLabel(user?.role)}
        </div>

        <div
          style={{
            fontSize: "12px",
            lineHeight: 1.55,
            color: "#8fa6bf",
          }}
        >
          {loading
            ? "Refreshing profile and workspace access."
            : getRoleWorkspaceSummary(user?.role)}
        </div>
      </div>

      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#9ce2d7",
          fontWeight: 700,
          padding: "0 8px 8px",
        }}
      >
        Modules
      </div>

      <div className="dashboard-sidebar-nav" style={{ display: "grid", gap: "6px" }}>
        {allowedPages.map((page) => {
          const isActive = page.id === currentPage;

          return (
            <button
              key={page.id}
              type="button"
              className={`dashboard-sidebar-nav-item${isActive ? " is-active" : ""}`}
              onClick={() => onNavigate(page.id)}
              style={{
                textAlign: "left",
                border: isActive
                  ? "1px solid rgba(138, 217, 208, 0.38)"
                  : "1px solid rgba(67, 108, 130, 0.24)",
                borderRadius: "12px",
                background: isActive
                  ? "linear-gradient(135deg, rgba(15, 118, 110, 0.38) 0%, rgba(15, 23, 42, 0.9) 100%)"
                  : "rgba(7, 18, 32, 0.3)",
                color: "#e2e8f0",
                padding: "11px 12px",
                display: "grid",
                gap: "4px",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: isActive ? 700 : 600,
                  color: "#f8fafc",
                }}
              >
                {page.label}
              </span>

              <span
                style={{
                  fontSize: "12px",
                  lineHeight: 1.45,
                  color: isActive ? "#cbd5e1" : "#8fa6bf",
                }}
              >
                {page.description}
              </span>
            </button>
          );
        })}
      </div>

      <AuthSessionPanel user={user} notice={notice} onLogout={onLogout} />
    </aside>
  );
}

export default WorkspaceSidebar;
