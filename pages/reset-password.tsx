import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AuthBrandPanel from "../components/AuthBrandPanel";
import { flashAuthToast } from "../components/AuthToast";

const ACCENT = "#4F46F5";

function Spinner() {
  return <span className="auth-spinner" aria-hidden />;
}

function strengthOf(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  const map = [
    { label: "Too short", color: "#E5484D" },
    { label: "Weak", color: "#E5484D" },
    { label: "Fair", color: "#E2A33C" },
    { label: "Good", color: "#0B8A8A" },
    { label: "Strong", color: "#1F9D6B" },
    { label: "Excellent", color: "#1F9D6B" },
  ];
  const idx = pw ? Math.max(0, Math.min(map.length - 1, score)) : 0;
  return { score, label: map[idx].label, color: map[idx].color };
}

export default function ResetPassword() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const tokenReady = token.length > 0;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const strength = useMemo(() => strengthOf(password), [password]);

  useEffect(() => {
    if (router.isReady && !token) {
      setError("This reset link is invalid. Please request a new one.");
    }
  }, [router.isReady, token]);

  function validate() {
    const e: { password?: string; confirm?: string } = {};
    if (password.length < 8) e.password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(password)) e.password = "Add at least one uppercase letter.";
    else if (!/[a-z]/.test(password)) e.password = "Add at least one lowercase letter.";
    else if (!/[0-9]/.test(password)) e.password = "Add at least one number.";
    else if (!/[^A-Za-z0-9]/.test(password)) e.password = "Add at least one special character.";
    if (confirm !== password) e.confirm = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (!validate()) return;
    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Unable to reset your password right now.");
        setBusy(false);
        return;
      }
      flashAuthToast("Password changed successfully. Please sign in with your new password.");
      router.replace("/login");
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    height: 44,
    padding: "0 42px 0 13px",
    border: `1px solid ${hasError ? "#E5484D" : "#E4E6EE"}`,
    borderRadius: 12,
    fontSize: 13.5,
    fontFamily: "inherit",
    background: "#fff",
    color: "#14161F",
    outline: "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  });

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
      <AuthBrandPanel />

      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "28px 22px", minWidth: 0 }}>
        <div style={{ width: "100%", maxWidth: 392 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 5px", color: "#14161F" }}>Set a new password</h1>
          <p style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, margin: "0 0 24px", lineHeight: 1.55 }}>
            Choose a strong password for your Ellington account. The reset link is valid for one use and expires after 30 minutes.
          </p>

          {(error || !tokenReady) && (
            <div role="alert" style={{ display: "flex", gap: 9, alignItems: "flex-start", color: "#E5484D", background: "#FDECEC", fontSize: 12.5, borderRadius: 11, padding: "10px 12px", marginBottom: 16, fontWeight: 600 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
              <span>{error || "This reset link is invalid or has expired. Please request a new one."}</span>
            </div>
          )}

          <form onSubmit={submit} noValidate>
            <div>
              <label htmlFor="password" style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#6B7180", marginBottom: 7 }}>New password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  style={fieldStyle(!!errors.password)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = ACCENT;
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,245,.10)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.password ? "#E5484D" : "#E4E6EE";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l18 18M10.5 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.2A9.4 9.4 0 0 1 12 5c5 0 8.5 4 9.5 6.5-.7 1.8-2.7 4.8-6 6.1M6.3 7.5C3.7 9 1.8 11.6 1.5 12c1 2.5 4.5 6.5 9.5 6.5a9.3 9.3 0 0 0 4.2-1" /></svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
                  )}
                </button>
              </div>
              {password && (
                <div style={{ marginTop: 9 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < Math.max(1, strength.score) ? strength.color : "#EDEEF3", transition: "background 150ms ease" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: strength.color, marginTop: 6 }}>{strength.label}</div>
                </div>
              )}
              {errors.password && (
                <div id="password-error" role="alert" style={{ fontSize: 11.5, color: "#E5484D", fontWeight: 600, marginTop: 6 }}>
                  {errors.password}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <label htmlFor="confirm" style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#6B7180", marginBottom: 7 }}>Confirm password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
                  }}
                  placeholder="••••••••"
                  aria-invalid={!!errors.confirm}
                  aria-describedby={errors.confirm ? "confirm-error" : undefined}
                  style={{ width: "100%", height: 44, padding: "0 42px 0 13px", border: `1px solid ${errors.confirm ? "#E5484D" : "#E4E6EE"}`, borderRadius: 12, fontSize: 13.5, fontFamily: "inherit", background: "#fff", color: "#14161F", outline: "none", transition: "border-color 150ms ease, box-shadow 150ms ease" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = ACCENT;
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,245,.10)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.confirm ? "#E5484D" : "#E4E6EE";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
                  {showConfirmPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l18 18M10.5 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.2A9.4 9.4 0 0 1 12 5c5 0 8.5 4 9.5 6.5-.7 1.8-2.7 4.8-6 6.1M6.3 7.5C3.7 9 1.8 11.6 1.5 12c1 2.5 4.5 6.5 9.5 6.5a9.3 9.3 0 0 0 4.2-1" /></svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
                  )}
                </button>
              </div>
              {errors.confirm && (
                <div id="confirm-error" role="alert" style={{ fontSize: 11.5, color: "#E5484D", fontWeight: 600, marginTop: 6 }}>
                  {errors.confirm}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={busy || !tokenReady}
              style={{
                width: "100%",
                height: 44,
                marginTop: 22,
                border: 0,
                borderRadius: 12,
                background: tokenReady ? ACCENT : "#C7CBD6",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: busy || !tokenReady ? "not-allowed" : "pointer",
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
                  Updating password…
                </>
              ) : (
                "Update password"
              )}
            </button>
          </form>

          <div style={{ marginTop: 18, textAlign: "center", fontSize: 12.5, fontWeight: 500, color: "#9AA0AE" }}>
            <Link href="/forgot-password" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>Request a new link</Link>
          </div>
        </div>
      </div>
    </div>
  );
}