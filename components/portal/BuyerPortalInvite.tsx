import { useEffect, useState } from "react";
import { AC } from "../../lib/format";
import { fetchJSON } from "../../lib/api";

export default function BuyerPortalInvite({ buyerId, buyerName, buyerEmail, onDone }: { buyerId: number | null; buyerName: string; buyerEmail?: string | null; onDone?: () => void }) {
  const [email, setEmail] = useState(buyerEmail || "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; created: boolean; temp_pw: string } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => { if (buyerEmail) setEmail(buyerEmail); }, [buyerEmail]);

  const send = async () => {
    if (!buyerId || !email.trim()) { setErr("Email is required"); return; }
    setBusy(true);
    setErr("");
    try {
      const j = await fetchJSON<any>("/api/portal/buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", buyer_id: buyerId, email: email.trim() }),
      });
      setResult(j);
      onDone && onDone();
    } catch (e: any) {
      setErr(e?.message || "Invite failed");
    } finally { setBusy(false); }
  };

  const inputStyle = { height: 34, borderRadius: 10, border: "1px solid #E4E6EE", padding: "0 11px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", outline: "none", flex: 1, minWidth: 0 } as const;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>Buyer portal access</div>
      <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 2, marginBottom: 10 }}>
        Create or reset {buyerName ? buyerName + "'s" : "the buyer's"} portal login. Credentials are emailed automatically.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="buyer@email.com" style={inputStyle} />
        <button onClick={send} disabled={busy || !buyerId} style={{ height: 34, borderRadius: 10, border: 0, background: busy || !buyerId ? "#C7CBD6" : AC, color: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: busy || !buyerId ? "not-allowed" : "pointer", flex: "none" }}>
          {busy ? "Sending…" : "Send portal access"}
        </button>
      </div>
      {err && <div style={{ fontSize: 11.5, color: "#E5484D", fontWeight: 600, marginTop: 8 }}>{err}</div>}
      {result && (
        <div style={{ marginTop: 10, background: result.created ? "#E9F8F1" : "#FDF4E5", borderRadius: 11, padding: "11px 13px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: result.created ? "#1F9D6B" : "#B07B14" }}>
            {result.created ? "Portal account created for " + result.email : "Portal credentials reset for " + result.email}
          </div>
          <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 600, marginTop: 4, lineHeight: 1.5 }}>
            Temporary password: <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{result.temp_pw}</span>
            <br />
            Sign in at <span style={{ fontWeight: 700 }}>/portal/buyer</span>
          </div>
        </div>
      )}
    </div>
  );
}