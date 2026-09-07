import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const ACCENT = "#4F46F5";

function isInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !/^\/[^:]*:/.test(path);
}

function Spinner() {
  return <span className="auth-spinner" aria-hidden />;
}

function AuthTextField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#6B7180", marginBottom: 7 }}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        style={{
          width: "100%",
          height: 44,
          padding: "0 13px",
          border: `1px solid ${error ? "#E5484D" : "#E4E6EE"}`,
          borderRadius: 12,
          fontSize: 13.5,
          fontFamily: "inherit",
          background: "#fff",
          color: "#14161F",
          outline: "none",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = ACCENT;
          e.currentTarget.style.boxShadow = `0 0 0 3px rgba(79,70,245,.10)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#E5484D" : "#E4E6EE";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {error && (
        <div id={`${id}-error`} role="alert" style={{ fontSize: 11.5, color: "#E5484D", fontWeight: 600, marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const nextRaw = typeof router.query.next === "string" ? router.query.next : "";
  const next = nextRaw && isInternalPath(nextRaw) ? nextRaw : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    let alive = true;
    const preventAuthed = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok && alive) {
          router.replace(next);
          return;
        }
      } catch {
        /* ignore */
      }
      if (alive) setCheckedAuth(true);
    };
    preventAuthed();
    return () => {
      alive = false;
    };
  }, [router, next]);

  function validate() {
    const e: { email?: string; password?: string } = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = "Enter a valid email address.";
    if (!password) e.password = "Password is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setServerError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setServerError("Invalid email or password. Please try again.");
        setBusy(false);
        return;
      }
      if (!res.ok) {
        setServerError(json.error || "Unable to sign in right now. Please try again.");
        setBusy(false);
        return;
      }
      router.push(json.next || next);
    } catch {
      setServerError("Unable to reach the server. Please check your connection and try again.");
      setBusy(false);
    }
  }

  const brandCols = ["#4F46F5", "#1F9D6B", "#E2A33C", "#0B8A8A"];

  return (
    <div
      dir="ltr"
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#F3F4F8",
        color: "#14161F",
        fontFamily: "'Plus Jakarta Sans',system-ui,-apple-system,sans-serif",
      }}
    >
      <div
        style={{
          display: "none",
          flex: 1.1,
          background: "linear-gradient(160deg,#14161F 0%,#252a3d 58%,#2b2570 100%)",
          color: "#fff",
          padding: "54px 60px",
          position: "relative",
          overflow: "hidden",
        }}
        className="auth-brand-panel"
      >
        <div style={{ position: "absolute", inset: 0, opacity: 0.16, backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,.5), transparent 24%), radial-gradient(circle at 80% 30%, rgba(255,255,255,.35), transparent 22%), radial-gradient(circle at 55% 85%, rgba(79,70,245,.8), transparent 30%)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: "#fff", color: ACCENT, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15, letterSpacing: "-.02em" }}>EH</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>Ellington</div>
          </div>
          <div style={{ marginTop: "auto", maxWidth: 430 }}>
            <div style={{ fontSize: 40, lineHeight: 1.08, fontWeight: 800, letterSpacing: "-.04em" }}>Own every unit,<br />chasing every dirham.</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,.72)", fontWeight: 500, marginTop: 18, lineHeight: 1.6 }}>
              The developer sales console for ORN 21281 — portfolio position, sales, finance, handover and compliance in one secure workspace.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
              {["Sales console", "Escrow reconciliation", "Handover pipeline"].map((t) => (
                <span key={t} style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: "7px 13px", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.16)", color: "#fff" }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 40, marginTop: 48, paddingTop: 26, borderTop: "1px solid rgba(255,255,255,.14)" }}>
            {[
              { v: "AED 1.94B", l: "Portfolio GDV" },
              { v: "850", l: "Units tracked" },
              { v: "89 / 89", l: "Screens verified" },
            ].map((s) => (
              <div key={s.l}>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", color: brandCols[0] }}>
                  <span style={{ color: "#fff" }}>{s.v}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: 600, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "28px 22px", minWidth: 0 }}>
        <div style={{ width: "100%", maxWidth: 392 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
            <div style={{ width: 38, height: 38, borderRadius: 13, background: "#14161F", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, letterSpacing: "-.02em" }}>EH</div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>Ellington</div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #EDEEF3", borderRadius: 22, padding: "30px 30px 26px", boxShadow: "0 1px 3px rgba(20,22,31,.05)" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 5px", color: "#14161F" }}>Welcome back</h1>
            <p style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, margin: "0 0 24px" }}>
              Sign in to your developer sales console.
            </p>

            {serverError && (
              <div role="alert" style={{ display: "flex", gap: 9, alignItems: "flex-start", color: "#E5484D", background: "#FDECEC", fontSize: 12.5, borderRadius: 11, padding: "10px 12px", marginBottom: 16, fontWeight: 600 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={submit} noValidate>
              <AuthTextField
                id="email"
                label="Email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder="kartik1111gohil@gmail.com"
                error={errors.email}
              />

              <div style={{ margin: "16px 0 4px" }} className="auth-field-gap">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                  <label htmlFor="password" style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#6B7180", margin: 0 }}>Password</label>
                  <Link href="/forgot-password" style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    name="password"
                    type={show ? "text" : "password"}
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                    }}
                    placeholder="••••••••"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    style={{
                      width: "100%",
                      height: 44,
                      padding: "0 42px 0 13px",
                      border: `1px solid ${errors.password ? "#E5484D" : "#E4E6EE"}`,
                      borderRadius: 12,
                      fontSize: 13.5,
                      fontFamily: "inherit",
                      background: "#fff",
                      color: "#14161F",
                      outline: "none",
                      transition: "border-color 150ms ease, box-shadow 150ms ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = ACCENT;
                      e.currentTarget.style.boxShadow = `0 0 0 3px rgba(79,70,245,.10)`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.password ? "#E5484D" : "#E4E6EE";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    title={show ? "Hide password" : "Show password"}
                    aria-label={show ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: 6,
                      top: 5,
                      width: 34,
                      height: 34,
                      border: 0,
                      background: "transparent",
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      color: "#9AA0AE",
                    }}
                  >
                    {show ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l18 18M10.5 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.2A9.4 9.4 0 0 1 12 5c5 0 8.5 4 9.5 6.5-.7 1.8-2.7 4.8-6 6.1M6.3 7.5C3.7 9 1.8 11.6 1.5 12c1 2.5 4.5 6.5 9.5 6.5a9.3 9.3 0 0 0 4.2-1" /></svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <div id="password-error" role="alert" style={{ fontSize: 11.5, color: "#E5484D", fontWeight: 600, marginTop: 6 }}>
                    {errors.password}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                style={{
                  width: "100%",
                  height: 44,
                  marginTop: 24,
                  border: 0,
                  borderRadius: 12,
                  background: ACCENT,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: busy ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  opacity: busy ? 0.75 : 1,
                  transition: "transform 120ms ease, opacity 150ms ease",
                }}
              >
                {busy ? (
                  <>
                    <Spinner />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 14px" }}>
              <span style={{ flex: 1, height: 1, background: "#EDEEF3" }} />
              <span style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600, letterSpacing: ".04em" }}>SECURE ACCESS</span>
              <span style={{ flex: 1, height: 1, background: "#EDEEF3" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 11, color: "#9AA0AE", fontWeight: 600 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Encrypted session · HTTP-only cookie · Server-side auth
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "#9AA0AE", fontWeight: 500 }}>
            Need help signing in? <Link href="/forgot-password" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>Reset your password</Link>
          </div>
        </div>
      </div>
    </div>
  );
}