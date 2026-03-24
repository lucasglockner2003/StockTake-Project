import LoginFormCard from "../components/LoginFormCard";
import { useLoginForm } from "../hooks/use-login-form";

function LoginPage({ onLoginSuccess }) {
  const {
    credentials,
    errorMessage,
    isSubmitting,
    handleFieldChange,
    handleSubmit,
  } = useLoginForm(onLoginSuccess);

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
          maxWidth: "1080px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "28px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "18px",
            padding: "8px 4px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8ad9d0",
              fontWeight: 700,
            }}
          >
            SmartOps Platform
          </div>

          <div
            style={{
              maxWidth: "560px",
              fontSize: "clamp(34px, 6vw, 58px)",
              lineHeight: 0.98,
              fontWeight: 700,
              color: "#f8fafc",
            }}
          >
            Secure access for stock, supplier, and automation operations
          </div>

          <div
            style={{
              maxWidth: "520px",
              fontSize: "16px",
              lineHeight: 1.75,
              color: "#9fb2cb",
            }}
          >
            This workspace connects directly to the operational backend. Sign in with
            your assigned account to continue to the internal dashboard.
          </div>
        </div>

        <LoginFormCard
          credentials={credentials}
          errorMessage={errorMessage}
          isSubmitting={isSubmitting}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

export default LoginPage;
