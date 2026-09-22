import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <form
        action={signIn}
        style={{
          width: "100%",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "12px",
          padding: "28px 26px",
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ marginBottom: "4px" }}>
          <div
            className="mono"
            style={{
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--brass)",
              fontWeight: 600,
            }}
          >
            ENA
          </div>
          <h1 style={{ fontSize: "22px", marginTop: "4px" }}>Submissions Register</h1>
        </div>

        <input type="hidden" name="next" value={next || "/"} />

        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            className="mono"
            style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--ink-soft)" }}
          >
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="search-input"
            style={{ width: "100%" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            className="mono"
            style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--ink-soft)" }}
          >
            Password
          </span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="search-input"
            style={{ width: "100%" }}
          />
        </label>

        {error && (
          <div style={{ color: "var(--danger)", fontSize: "13px" }}>{decodeURIComponent(error)}</div>
        )}

        <button type="submit" className="roles-add-btn" style={{ padding: "10px 12px" }}>
          Sign in
        </button>
      </form>
    </div>
  );
}
