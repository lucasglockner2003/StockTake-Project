function AccessDeniedPage({ onLogout }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 10% 0%, #17394f 0%, #0b1220 30%, #070d18 100%)",
        color: "#e2e8f0",
        padding: "24px",
        fontFamily: "'Segoe UI', 'Trebuchet MS', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          borderRadius: "18px",
          border: "1px solid rgba(76, 104, 132, 0.55)",
          background:
            "linear-gradient(180deg, rgba(11,18,32,0.96) 0%, rgba(15,23,42,0.98) 100%)",
          boxShadow: "0 22px 40px rgba(0, 0, 0, 0.34)",
          padding: "28px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8ad9d0",
            fontWeight: 700,
            marginBottom: "12px",
          }}
        >
          SmartOps Security
        </div>

        <div
          style={{
            fontSize: "34px",
            lineHeight: 1.05,
            fontWeight: 700,
            color: "#f8fafc",
            marginBottom: "12px",
          }}
        >
          Access unavailable for this account
        </div>

        <div
          style={{
            fontSize: "15px",
            lineHeight: 1.7,
            color: "#9fb2cb",
            marginBottom: "22px",
          }}
        >
          Your authenticated role does not currently have access to any frontend
          workspace page. Contact an administrator if you believe this is incorrect.
        </div>

        <button
          type="button"
          onClick={onLogout}
          style={{
            border: "1px solid rgba(248, 113, 113, 0.3)",
            borderRadius: "12px",
            backgroundColor: "rgba(127, 29, 29, 0.25)",
            color: "#fecaca",
            padding: "12px 18px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default AccessDeniedPage;
