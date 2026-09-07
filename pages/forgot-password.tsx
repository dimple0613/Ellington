import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const ACCENT = "#4F46F5";

function Spinner() {
  return <span className="auth-spinner" aria-hidden />;
}

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

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
      setSent(true);
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
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#F3F4F8",
        color: "#14161F",
        fontFamily: "'Plus Jakarta Sans',system-ui,-apple-system,sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 408 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26, justifyContent: "center" }}>
          <div style={{ width: 38, height: 38, borderRadius: 13, background: "#14161F", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, letterSpacing: "-.02em" }}>EH</div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>Ellington</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #EDEEF3", borderRadius: 22, padding: "30px 30px 26px", boxShadow: "0 1px 3px rgba(20,22,31,.05)" }}>
          {sent ? (
            <>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: "#E9F8F1", display: "grid", placeItems: "center", marginBottom: 18 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <h1 style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 6px" }}>Check your inbox</h1>
              <p style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, lineHeight: 1.6, margin: "0 0 22px" }}>
                A password reset link has been sent to <strong style={{ color: "#14161F" }}>{email.trim()}</strong>. The link is valid for 30 minutes.
              </p>
              <button
                onClick={() => setSent(false)}
                style={{ height: 40, border: "1px solid #E4E6EE", background: "#fff", borderRadius: 12, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
              >
                Use a different email
              </button>
              <div style={{ marginTop: 18, textAlign: "center", fontSize: 12.5, fontWeight: 500, color: "#9AA0AE" }}>
                <Link href="/login" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>Back to sign in</Link>
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 5px" }}>Forgot your password?</h1>
              <p style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, margin: "0 0 22px", lineHeight: 1.55 }}>
                Enter the email registered to your Ellington account and we&apos;ll send you a secure reset link.
              </p>

              {error && (
                <div role="alert" style={{ color: "#E5484D", background: "#FDECEC", fontSize: 12.5, borderRadius: 11, padding: "10px 12px", marginBottom: 16, fontWeight: 600 }}>
                  {error}
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
                  placeholder="admin@developer.com"
                  style={{
                    width: "100%",
                    height: 44,
                    padding: "0 13px",
                    border: "1px solid #E4E6EE",
                    borderRadius: 12,
                    fontSize: 13.5,
                    fontFamily: "inherit",
                    background: "#fff",
                    color: "#14161F",
                    outline: "none",
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}