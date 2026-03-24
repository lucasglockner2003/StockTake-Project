import MetricCard from "../components/MetricCard";
import NoticePanel from "../components/NoticePanel";
import PageActionBar from "../components/PageActionBar";
import StatusBadge from "../components/StatusBadge";

const BADGE_TONE_STYLES = {
  default: {
    backgroundColor: "rgba(30, 41, 59, 0.82)",
    textColor: "#cbd5e1",
  },
  info: {
    backgroundColor: "rgba(8, 47, 73, 0.6)",
    textColor: "#bae6fd",
  },
  success: {
    backgroundColor: "rgba(6, 78, 59, 0.44)",
    textColor: "#bbf7d0",
  },
  warning: {
    backgroundColor: "rgba(120, 53, 15, 0.44)",
    textColor: "#fde68a",
  },
  danger: {
    backgroundColor: "rgba(127, 29, 29, 0.44)",
    textColor: "#fecaca",
  },
};

function getBadgeToneStyles(tone) {
  return BADGE_TONE_STYLES[tone] || BADGE_TONE_STYLES.default;
}

function renderFocusList(items) {
  if (!items.length) {
    return (
      <div
        style={{
          borderRadius: "12px",
          border: "1px dashed rgba(67, 108, 130, 0.45)",
          padding: "14px",
          color: "#8fa6bf",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        No items to review right now.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      {items.map((item) => {
        const toneStyles = getBadgeToneStyles(item.tone);

        return (
          <div
            key={item.label}
            style={{
              borderRadius: "12px",
              border: "1px solid rgba(67, 108, 130, 0.35)",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              padding: "14px",
              display: "grid",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#f8fafc",
                }}
              >
                {item.label}
              </div>

              <div
                style={{
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  ...toneStyles,
                }}
              >
                {item.value}
              </div>
            </div>

            <div
              style={{
                fontSize: "13px",
                lineHeight: 1.55,
                color: "#94a3b8",
              }}
            >
              {item.detail}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkspaceOverviewPage({ dashboard, onNavigate }) {
  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section
        style={{
          borderRadius: "16px",
          border: "1px solid #24344d",
          background:
            "linear-gradient(135deg, rgba(12, 20, 36, 0.96) 0%, rgba(9, 30, 45, 0.94) 100%)",
          padding: "18px",
          display: "grid",
          gap: "16px",
        }}
      >
        <div style={{ display: "grid", gap: "10px" }}>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8ad9d0",
              fontWeight: 700,
            }}
          >
            Role workspace
          </div>

          <div
            style={{
              fontSize: "30px",
              lineHeight: 1.08,
              fontWeight: 700,
              color: "#f8fafc",
            }}
          >
            {dashboard.title}
          </div>

          <div
            style={{
              maxWidth: "820px",
              fontSize: "14px",
              lineHeight: 1.65,
              color: "#94a3b8",
            }}
          >
            {dashboard.description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {dashboard.heroBadges.map((badge) => {
            const toneStyles = getBadgeToneStyles(badge.tone);

            return (
              <StatusBadge
                key={badge.label}
                label={badge.label}
                value={badge.value}
                backgroundColor={toneStyles.backgroundColor}
                textColor={toneStyles.textColor}
                padding="9px 12px"
                fontSize="12px"
              />
            );
          })}
        </div>
      </section>

      <NoticePanel
        backgroundColor="rgba(8, 47, 73, 0.4)"
        border="1px solid rgba(125, 211, 252, 0.28)"
        color="#dbeafe"
        marginBottom="0"
        padding="14px 16px"
        borderRadius="14px"
      >
        {dashboard.notice}
      </NoticePanel>

      <section style={{ display: "grid", gap: "10px" }}>
        <div
          style={{
            fontSize: "12px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#8ad9d0",
            fontWeight: 700,
          }}
        >
          Recommended actions
        </div>

        <PageActionBar marginBottom="0" gap="12px">
          {dashboard.quickActions.map((action) => (
            <button
              key={action.pageId}
              type="button"
              onClick={() => onNavigate(action.pageId)}
              style={{
                flex: "1 1 220px",
                minWidth: "220px",
                textAlign: "left",
                border: "1px solid rgba(67, 108, 130, 0.42)",
                borderRadius: "14px",
                backgroundColor: "rgba(15, 23, 42, 0.84)",
                color: "#e2e8f0",
                padding: "14px 16px",
                cursor: "pointer",
                display: "grid",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#f8fafc",
                }}
              >
                {action.label}
              </span>

              <span
                style={{
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: "#94a3b8",
                }}
              >
                {action.description}
              </span>
            </button>
          ))}
        </PageActionBar>
      </section>

      <section
        style={{
          display: "grid",
          gap: "12px",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        }}
      >
        {dashboard.metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            tone={metric.tone}
          />
        ))}
      </section>

      <section
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <div
          style={{
            borderRadius: "16px",
            border: "1px solid #24344d",
            backgroundColor: "#0f172a",
            padding: "16px",
            display: "grid",
            gap: "14px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8ad9d0",
              fontWeight: 700,
            }}
          >
            {dashboard.focusTitle}
          </div>

          {renderFocusList(dashboard.focusItems)}
        </div>

        <div
          style={{
            borderRadius: "16px",
            border: "1px solid #24344d",
            backgroundColor: "#0f172a",
            padding: "16px",
            display: "grid",
            gap: "14px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8ad9d0",
              fontWeight: 700,
            }}
          >
            {dashboard.pulseTitle}
          </div>

          {renderFocusList(dashboard.pulseItems)}
        </div>
      </section>
    </div>
  );
}

export default WorkspaceOverviewPage;
