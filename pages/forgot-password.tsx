import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AuthBrandPanel from "../components/AuthBrandPanel";
import { flashAuthToast } from "../components/AuthToast";

const ACCENT = "#4F46F5";

function Spinner() {
  return <span className="auth-spinner" aria-hidden />;
}

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok && alive) {
          router.replace("/dashboard");
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  function validate() {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return false;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }
    return true;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      flashAuthToast("Password reset link sent successfully. Please check your email.");
      router.replace("/login");
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

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
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 5px", color: "#14161F" }}>Forgot your password?</h1>
              <p style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, margin: "0 0 24px", lineHeight: 1.55 }}>
                Enter the email registered to your Ellington account and we&apos;ll send you a secure reset link.
              </p>

              {error && (
                <div role="alert" style={{ display: "flex", gap: 9, alignItems: "flex-start", color: "#E5484D", background: "#FDECEC", fontSize: 12.5, borderRadius: 11, padding: "10px 12px", marginBottom: 16, fontWeight: 600 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit} noValidate>
                <label htmlFor="email" style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#6B7180", marginBottom: 7 }}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ellington.com"
                  aria-invalid={!!error}
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
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,245,.10)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = error ? "#E5484D" : "#E4E6EE";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    width: "100%",
                    height: 44,
                    marginTop: 20,
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
                      Sending reset link…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <div style={{ marginTop: 18, textAlign: "center", fontSize: 12.5, fontWeight: 500, color: "#9AA0AE" }}>
                <Link href="/login" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>Back to sign in</Link>
              </div>
        </div>
      </div>
    </div>
  );
}