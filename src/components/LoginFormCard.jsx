import NoticePanel from "./NoticePanel";

function getButtonLabel(isSubmitting) {
  return isSubmitting ? "Signing In..." : "Sign In";
}

function LoginFormCard({
  credentials,
  errorMessage,
  isSubmitting,
  onFieldChange,
  onSubmit,
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "430px",
        borderRadius: "18px",
        border: "1px solid rgba(76, 104, 132, 0.55)",
        background:
          "linear-gradient(180deg, rgba(11,18,32,0.96) 0%, rgba(15,23,42,0.98) 100%)",
        boxShadow: "0 22px 40px rgba(0, 0, 0, 0.34)",
        padding: "28px",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "8px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8ad9d0",
            fontWeight: 700,
          }}
        >
          SmartOps Access
        </div>

        <div
          style={{
            fontSize: "32px",
            lineHeight: 1.05,
            fontWeight: 700,
            color: "#f8fafc",
          }}
        >
          Sign in to the operations workspace
        </div>

        <div
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#93a9c5",
          }}
        >
          Use your company credentials to access stock, supplier orders, automation,
          and role-protected workflows.
        </div>
      </div>

      {errorMessage ? (
        <NoticePanel
          backgroundColor="rgba(127, 29, 29, 0.35)"
          border="1px solid rgba(248, 113, 113, 0.55)"
          color="#fecaca"
          marginBottom="18px"
          fontWeight="600"
        >
          {errorMessage}
        </NoticePanel>
      ) : null}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: "16px" }}>
        <label style={{ display: "grid", gap: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "#cbd5e1",
            }}
          >
            Work email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={credentials.email}
            onChange={onFieldChange}
            placeholder="name@company.com"
            disabled={isSubmitting}
            style={{
              width: "100%",
              borderRadius: "12px",
              border: "1px solid #29435f",
              backgroundColor: "#07111f",
              color: "#f8fafc",
              padding: "14px 16px",
              outline: "none",
              boxSizing: "border-box",
              fontSize: "15px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "#cbd5e1",
            }}
          >
            Password
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={credentials.password}
            onChange={onFieldChange}
            placeholder="Enter your password"
            disabled={isSubmitting}
            style={{
              width: "100%",
              borderRadius: "12px",
              border: "1px solid #29435f",
              backgroundColor: "#07111f",
              color: "#f8fafc",
              padding: "14px 16px",
              outline: "none",
              boxSizing: "border-box",
              fontSize: "15px",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            border: "none",
            borderRadius: "12px",
            background:
              isSubmitting
                ? "linear-gradient(135deg, #27506d 0%, #244767 100%)"
                : "linear-gradient(135deg, #0f766e 0%, #0f5f79 100%)",
            color: "#f8fafc",
            fontSize: "15px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            padding: "14px 18px",
            cursor: isSubmitting ? "progress" : "pointer",
            opacity: isSubmitting ? 0.84 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          {getButtonLabel(isSubmitting)}
        </button>
      </form>

      <div
        style={{
          marginTop: "18px",
          fontSize: "12px",
          lineHeight: 1.6,
          color: "#6f88a7",
        }}
      >
        Access is restricted to authenticated staff accounts managed by your
        organization.
      </div>
    </div>
  );
}

export default LoginFormCard;
