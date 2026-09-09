import { useRouter } from "next/router";
import { useState } from "react";

export const PORTAL_ACCENT = "#4F46F5";

export function PortalChrome({ kind, children }: { kind: "buyer" | "broker"; children: React.ReactNode }) {
  const label = kind === "buyer" ? "Buyer Portal" : "Agent Portal";
  return (
    <div dir="ltr" style={{ minHeight: "100vh", background: "#F3F4F8", color: "#14161F", fontFamily: "'Plus Jakarta Sans',system-ui,-apple-system,sans-serif" }}>
      <div style={{ background: "linear-gradient(160deg,#14161F 0%,#252a3d 55%,#2b2570 100%)", padding: "0 26px", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", height: 62 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: "#fff", color: PORTAL_ACCENT, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>EH</div>
            <div>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1 }}>Ellington</div>
              <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <a href="/login" style={{ color: "rgba(255,255,255,.6)", fontSize: 12, fontWeight: 600, textDecoration: "none", letterSpacing: ".02em" }}>Developer console →</a>
        </div>
      </div>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 26px 60px" }}>{children}</div>
      <div style={{ textAlign: "center", padding: "22px 16px 32px", fontSize: 11.5, color: "#9AA0AE", fontWeight: 600 }}>
        Ellington Holdings · ORN 21281<br />Secured with encrypted sessions · data shown is read-only
      </div>
    </div>
  );
}

export function PortalLoginCard({ kind, onLogin }: { kind: "buyer" | "broker"; onLogin: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const endpoint = kind === "buyer" ? "/api/portal/buyer" : "/api/portal/broker";
  const title = kind === "buyer" ? "Track your unit & payments" : "Live inventory & commissions";
  const body = kind === "buyer"
    ? "Sign in to see your units, payment schedule, documents and construction progress."
    : "Sign in to browse live availability, manage reservations and track your commission ledger.";

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: email.trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) { setErr(json?.error || "Sign in failed"); setBusy(false); return; }
      onLogin();
    } catch {
      setErr("Unable to reach the server. Try again.");
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "70px auto 0", background: "#fff", borderRadius: 22, padding: "30px 28px", boxShadow: "0 1px 3px rgba(20,22,31,.05)", border: "1px solid #EDEEF3" }}>
      <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.03em" }}>{title}</div>
      <p style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, margin: "6px 0 22px", lineHeight: 1.55 }}>{body}</p>
      {err && (
        <div role="alert" style={{ display: "flex", gap: 9, alignItems: "flex-start", color: "#E5484D", background: "#FDECEC", fontSize: 12.5, borderRadius: 11, padding: "10px 12px", marginBottom: 16, fontWeight: 600 }}>
          <span>{err}</span>
        </div>
      )}
      <form onSubmit={submit} noValidate>
        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#6B7180", marginBottom: 7 }}>Email</label>
        <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
          style={{ width: "100%", boxSizing: "border-box", height: 44, padding: "0 13px", border: "1px solid #E4E6EE", borderRadius: 12, fontSize: 13.5, fontFamily: "inherit", background: "#fff", color: "#14161F", outline: "none" }} />
        <div style={{ marginTop: 16 }} />
        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#6B7180", marginBottom: 7 }}>Password</label>
        <input type="password" value={password} required onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
          style={{ width: "100%", boxSizing: "border-box", height: 44, padding: "0 13px", border: "1px solid #E4E6EE", borderRadius: 12, fontSize: 13.5, fontFamily: "inherit", background: "#fff", color: "#14161F", outline: "none" }} />
        <button type="submit" disabled={busy}
          style={{ width: "100%", height: 44, marginTop: 22, border: 0, borderRadius: 12, background: PORTAL_ACCENT, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: busy ? 0.75 : 1 }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 18, fontSize: 11, color: "#9AA0AE", fontWeight: 600 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        Encrypted session · HTTP-only cookie
      </div>
      <button onClick={() => router.push("/login")} style={{ marginTop: 14, width: "100%", height: 40, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>
        Portal team member? Use the developer console
      </button>
    </div>
  );
}

export function PortalStatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    available: { bg: "#E9F8F1", fg: "#1F9D6B" },
    sold: { bg: "#EFE6FD", fg: "#6B3FA8" },
    booked: { bg: "#FDF4E5", fg: "#B07B14" },
    reserved: { bg: "#FDF4E5", fg: "#B07B14" },
    held: { bg: "#E5F3FF", fg: "#2773C0" },
    blocked: { bg: "#F1F2F6", fg: "#6B7180" },
    pending: { bg: "#FDF4E5", fg: "#B07B14" },
    approved: { bg: "#E9F8F1", fg: "#1F9D6B" },
    declined: { bg: "#FDECEC", fg: "#E5484D" },
    cancelled: { bg: "#F1F2F6", fg: "#6B7180" },
  };
  const c = map[status] || { bg: "#F1F2F6", fg: "#6B7180" };
  return <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 9px", textAlign: "center", background: c.bg, color: c.fg, textTransform: "capitalize" }}>{status}</span>;
}