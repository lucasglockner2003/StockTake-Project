import AuthSessionPanel from "./AuthSessionPanel";
import { PAGE_IDS } from "../constants/pages";
import { formatRoleLabel, getRoleWorkspaceSummary } from "../utils/user-display";

const sidebarIconStyle = {
  width: "18px",
  height: "18px",
  display: "block",
};

function SidebarIcon({ pageId }) {
  const sharedProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: sidebarIconStyle,
  };

  switch (pageId) {
    case PAGE_IDS.OVERVIEW:
      return (
        <svg {...sharedProps}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
          <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case PAGE_IDS.STOCK:
      return (
        <svg {...sharedProps}>
          <rect x="5" y="4" width="14" height="16" rx="2.5" />
          <path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" />
          <path d="M9 9h6" />
          <path d="M9 13h6" />
          <path d="M9 17h4" />
        </svg>
      );
    case PAGE_IDS.VOICE:
      return (
        <svg {...sharedProps}>
          <path d="M12 4a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3Z" />
          <path d="M18 11a6 6 0 0 1-12 0" />
          <path d="M12 17v4" />
          <path d="M9 21h6" />
        </svg>
      );
    case PAGE_IDS.REVIEW:
      return (
        <svg {...sharedProps}>
          <path d="M9 6.5h9" />
          <path d="M9 12h9" />
          <path d="M9 17.5h9" />
          <path d="m4.5 6.5 1.5 1.5 2.5-3" />
          <path d="m4.5 12 1.5 1.5 2.5-3" />
          <path d="m4.5 17.5 1.5 1.5 2.5-3" />
        </svg>
      );
    case PAGE_IDS.PHOTO:
      return (
        <svg {...sharedProps}>
          <rect x="4" y="5" width="16" height="14" rx="2.5" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m20 15-4.5-4.5L7 19" />
        </svg>
      );
    case PAGE_IDS.INVOICE_INTAKE:
      return (
        <svg {...sharedProps}>
          <path d="M8 3.5h6l4 4v13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5v-15A2 2 0 0 1 8 3.5Z" />
          <path d="M14 3.5v4h4" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </svg>
      );
    case PAGE_IDS.AUTOMATION:
      return (
        <svg {...sharedProps}>
          <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
        </svg>
      );
    case PAGE_IDS.DAILY_ORDER_EXECUTION:
      return (
        <svg {...sharedProps}>
          <path d="M4 7h10.5l3.5 3.5v4.5a2 2 0 0 1-2 2h-1" />
          <path d="M4 7v8a2 2 0 0 0 2 2h1" />
          <circle cx="8" cy="18" r="2" />
          <circle cx="16" cy="18" r="2" />
        </svg>
      );
    case PAGE_IDS.INVOICE_QUEUE:
      return (
        <svg {...sharedProps}>
          <rect x="5" y="4" width="14" height="4" rx="1.5" />
          <rect x="5" y="10" width="14" height="4" rx="1.5" />
          <rect x="5" y="16" width="10" height="4" rx="1.5" />
        </svg>
      );
    case PAGE_IDS.SUPPLIER_REVIEW:
      return (
        <svg {...sharedProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
    default:
      return (
        <svg {...sharedProps}>
          <rect x="5" y="5" width="14" height="14" rx="3" />
        </svg>
      );
  }
}

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
        borderRadius: "20px",
        border: "1px solid rgba(51, 65, 85, 0.92)",
        background:
          "linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 18, 34, 0.98) 100%)",
        padding: "18px 14px",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        boxShadow: "0 22px 44px rgba(2, 6, 23, 0.42)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div style={{ display: "grid", gap: "14px", padding: "6px 8px 18px" }}>
        <div style={{ display: "grid", gap: "4px" }}>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#7dd3fc",
              fontWeight: 700,
            }}
          >
            SmartOps
          </div>

          <div
            style={{
              fontSize: "25px",
              lineHeight: 1.05,
              fontWeight: 650,
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
            border: "1px solid rgba(148, 163, 184, 0.24)",
            backgroundColor: "rgba(30, 41, 59, 0.75)",
            color: "#dbeafe",
            fontSize: "11px",
            fontWeight: 600,
            padding: "5px 9px",
            letterSpacing: "0.05em",
          }}
        >
          {formatRoleLabel(user?.role)}
        </div>

        <div
          style={{
            fontSize: "12px",
            lineHeight: 1.55,
            color: "#94a3b8",
          }}
        >
          {loading
            ? "Refreshing profile and workspace access."
            : getRoleWorkspaceSummary(user?.role)}
        </div>
      </div>

      <div
        style={{
          fontSize: "10px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#64748b",
          fontWeight: 700,
          padding: "0 8px 10px",
        }}
      >
        Modules
      </div>

      <div className="dashboard-sidebar-nav" style={{ display: "grid", gap: "10px" }}>
        {allowedPages.map((page) => {
          const isActive = page.id === currentPage;

          return (
            <button
              key={page.id}
              type="button"
              className={`dashboard-sidebar-nav-item${isActive ? " is-active" : ""}`}
              onClick={() => onNavigate(page.id)}
            >
              <span className="dashboard-sidebar-nav-item-icon">
                <SidebarIcon pageId={page.id} />
              </span>

              <span className="dashboard-sidebar-nav-item-label">
                {page.label}
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
