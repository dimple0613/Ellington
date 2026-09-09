import { useState } from "react";
import { AC } from "../../lib/format";
import { fetchJSON } from "../../lib/api";

export default function BrokerPortalEnable({ agencyId, agencyName, onDone }: { agencyId: number | null; agencyName: string; onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; created: boolean; temp_pw: string } | null>(null);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!agencyId || !email.trim()) { setErr("Email is required"); return; }
    setBusy(true);
    setErr("");
    try {
      const j = await fetchJSON<any>("/api/portal/broker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable", agency_id: agencyId, email: email.trim() }),
      });
      setResult(j);
      onDone && onDone();
    } catch (e: any) {
      setErr(e?.message || "Enable failed");
    } finally { setBusy(false); }
  };

  const inputStyle = { height: 34, borderRadius: 10, border: "1px solid #E4E6EE", padding: "0 11px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", outline: "none", flex: 1, minWidth: 0 } as const;

  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3", marginTop: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em" }}>Agent portal access · {agencyName}</div>
      <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 2, marginBottom: 12 }}>
        Give the agency its own login to see live inventory, reserve units and track commissions at /portal/broker.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agency@email.com" style={inputStyle} />
        <button onClick={send} disabled={busy || !agencyId} style={{ height: 34, borderRadius: 10, border: 0, background: busy || !agencyId ? "#C7CBD6" : AC, color: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: busy || !agencyId ? "not-allowed" : "pointer", flex: "none" }}>
          {busy ? "Sending…" : "Enable portal"}
        </button>
      </div>
      {err && <div style={{ fontSize: 11.5, color: "#E5484D", fontWeight: 600, marginTop: 8 }}>{err}</div>}
      {result && (
        <div style={{ marginTop: 10, background: result.created ? "#E9F8F1" : "#FDF4E5", borderRadius: 11, padding: "11px 13px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: result.created ? "#1F9D6B" : "#B07B14" }}>
            {result.created ? "Portal enabled for " + result.email : "Portal credentials reset for " + result.email}
          </div>
          <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 600, marginTop: 4, lineHeight: 1.5 }}>
            Temporary password: <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{result.temp_pw}</span>
            <br />
            Sign in at <span style={{ fontWeight: 700 }}>/portal/broker</span>
          </div>
        </div>
      )}
    </div>
  );
}