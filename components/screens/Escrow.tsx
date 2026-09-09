import { useEffect, useState } from "react";
import { AC } from "../../lib/format";
import { fetchJSON } from "../../lib/api";
import { KpiSkeleton, PanelSkeleton } from "../Loading";

type QueueRow = { id: number; date: string; desc: string; amount: string; side: string };
type Obligation = { label: string; value: string; flag: boolean };
type Drawdown = { id: string; milestone: string; amount: string; cert: string; rera: string; status: string };

const SIDE_PILL: Record<string, { bg: string; color: string }> = {
  "Bank only": { bg: "#FDF4E5", color: "#B07B14" },
  "System only": { bg: "#EDECFE", color: AC },
};

const EMPTY_STATE = { fontSize: 12.5, color: "#9AA0AE", fontWeight: 600, padding: "18px 0" } as const;

export default function EscrowScreen() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [notice, setNotice] = useState("");
  const [drawdowns, setDrawdowns] = useState<Drawdown[]>([]);
  const [ddrOpen, setDdrOpen] = useState(false);
  const [apiError, setApiError] = useState("");
  const [reconciling, setReconciling] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchJSON<{ escrow: { queue: any[]; drawdowns: any[] } }>("/api/finance")
      .then((j) => {
        if (active) setLoaded(true);
        if (!active || !j?.escrow) return;
        if (j.escrow.queue.length) {
          setQueue(j.escrow.queue.map((q) => ({
            id: Number(q.id),
            date: new Date(q.received_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
            desc: q.reference,
            amount: Number(q.amount).toLocaleString("en-US"),
            side: q.bank && !q.system_side ? "Bank only" : q.system_side && !q.bank ? "System only" : "Bank only",
          })));
        } else {
          if (active) setQueue([]);
        }
        if (j.escrow.drawdowns.length) {
          setDrawdowns(j.escrow.drawdowns.map((d) => ({
            id: d.ref,
            milestone: d.milestone,
            amount: Number(d.amount).toLocaleString("en-US"),
            cert: d.cert,
            rera: d.rera,
            status: d.status,
          })));
        }
      })
      .catch((e) => { if (active) { setLoaded(true); setApiError(e?.message || "Failed to load escrow"); setQueue([]); } });
    return () => { active = false; };
  }, []);
  const [ddrMilestone, setDdrMilestone] = useState("Structure 40%");
  const [ddrAmount, setDdrAmount] = useState("");
  const [ddrRera, setDdrRera] = useState("Submitted");
  const [ddrErr, setDdrErr] = useState("");

  const escId: [string, string, boolean][] = [];

  const tiles: { label: string; value: string; note: string; alert: boolean }[] = [];

  const gauges: { label: string; pct: number; mark: number; note: string; flag: boolean }[] = [];

  const obligations: Obligation[] = [];

  const matchRow = async (idx: number) => {
    const row = queue[idx];
    if (!row || reconciling !== null) return;
    setReconciling(row.id);
    setNotice("");
    try {
      await fetchJSON<{ id: number; matched: boolean }>("/api/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reconcile", id: row.id }),
      });
      setQueue((q) => q.filter((_, i) => i !== idx));
      setNotice("Row matched and reconciled \u00b7 escrow variance reduced");
    } catch (e: any) {
      setNotice("");
      setApiError("Failed to match row: " + (e?.message || "request failed"));
    } finally {
      setReconciling(null);
    }
    setTimeout(() => setNotice(""), 3000);
  };

  const submitDdr = async () => {
    const amt = ddrAmount.replace(/[^0-9]/g, "");
    if (!amt || Number(amt) <= 0) { setDdrErr("Enter a valid drawdown amount"); return; }
    try {
      const d = await fetchJSON<any>("/api/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "drawdown", milestone: ddrMilestone, amount: amt, rera: ddrRera }),
      });
      const newRow: Drawdown = {
        id: d.ref,
        milestone: d.milestone,
        amount: Number(d.amount).toLocaleString("en-US"),
        cert: d.cert,
        rera: d.rera,
        status: d.status,
      };
      setDrawdowns((x) => [newRow, ...x]);
      setDdrOpen(false);
      setDdrErr("");
      setDdrAmount("");
      setNotice("Drawdown request " + newRow.id + " created \u00b7 " + d.milestone + " \u00b7 AED " + newRow.amount + " submitted to trustee");
    } catch (e: any) {
      setDdrErr(e?.message || "Failed to create drawdown");
    }
    setTimeout(() => setNotice(""), 4000);
  };

  const milestones = ["Structure 40%", "Structure 60%", "Substructure complete", "Enabling works", "Mobilisation", "Finishing works"];

  const field = (label: string, v: string, set: (s: string) => void, placeholder: string, mono = false) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <input value={v} onChange={(e) => set(e.target.value)} placeholder={placeholder} style={{ width: "100%", boxSizing: "border-box", height: 40, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 12px", fontFamily: mono ? "monospace" : "inherit", fontSize: 12.5, fontWeight: 600, outline: "none" }} />
    </div>
  );

  const pill = (v: string, type: "side" | "rera" | "status") => {
    let bg: string, col: string;
    if (type === "side") { const p = SIDE_PILL[v] || { bg: "#F1F2F6", color: "#6B7180" }; bg = p.bg; col = p.color; }
    else if (type === "rera") { bg = v === "Approved" ? "#E9F8F1" : "#FDF4E5"; col = v === "Approved" ? "#1F9D6B" : "#B07B14"; }
    else { bg = v === "Released" ? "#F1F2F6" : "#EDECFE"; col = v === "Released" ? "#6B7180" : AC; }
    return { display: "inline-block", fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px", background: bg, color: col, whiteSpace: "nowrap" as const };
  };

  if (!loaded) {
    return (
      <div>
        <KpiSkeleton count={4} />
        <div style={{ marginTop: 16 }}>
          <PanelSkeleton headerW={220} rows={6} cols={5} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — escrow rows are empty until data loads
        </div>
      )}
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Escrow reconciliation</div>
            <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Law No. 8 of 2007 \u00b7 reconcile bank statements against the ledger</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start" }}>
            <button onClick={() => setDdrOpen(true)} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>New drawdown request</button>
          </div>
        </div>
        {escId.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: 16 }}>
            {escId.map(([k, v, mono]) => (
              <div key={k}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontFamily: mono ? "'JetBrains Mono',monospace" : undefined, fontSize: 12.5, fontWeight: mono ? 600 : 700, color: "#14161F", marginTop: 5 }}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={EMPTY_STATE}>No escrow account details yet</div>
        )}
      </div>

      {tiles.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
          {tiles.map((t) => (
            <div key={t.label} style={{ background: t.alert ? "#FDECEC" : "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: t.alert ? "#C23B40" : "#9AA0AE", textTransform: "uppercase" }}>{t.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 11, color: t.alert ? "#E5484D" : "#14161F" }}>{t.value}</div>
              <div style={{ fontSize: 11, color: t.alert ? "#C23B40" : "#6B7180", fontWeight: 500, marginTop: 4 }}>{t.note}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...EMPTY_STATE, marginBottom: 16 }}>No escrow balances yet</div>
      )}

      {gauges.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
          {gauges.map((g) => (
            <div key={g.label} style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{g.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginTop: 10, color: g.flag ? "#E5484D" : "#14161F" }}>{g.pct}%</div>
              <div style={{ position: "relative", height: 10, borderRadius: 5, background: "#F1F2F6", marginTop: 10, overflow: "visible" }}>
                <span style={{ position: "absolute", left: 0, top: 0, height: 10, borderRadius: 5, width: (g.pct / 60 * 100) + "%", background: g.flag ? "#E5484D" : "#34C08A" }} />
                <span style={{ position: "absolute", left: (g.mark / 60 * 100) + "%", top: -2, width: 2, height: 14, background: "#14161F", borderRadius: 1 }} />
              </div>
              <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 10, lineHeight: 1.5 }}>{g.note}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...EMPTY_STATE, marginBottom: 16 }}>No escrow compliance gauges yet</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start", marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ padding: "16px 22px 10px", borderBottom: "1px solid #EDEEF3" }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em" }}>Reconciliation queue \u00b7 {queue.length} unmatched</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "86px 1.2fr 96px 92px 1fr", gap: 8, padding: "12px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #F6F7FA" }}>
            <span>Date</span><span>Description</span><span style={{ textAlign: "right" }}>Amount</span><span>Side</span><span style={{ textAlign: "right" }}>Action</span>
          </div>
          {queue.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "86px 1.2fr 96px 92px 1fr", gap: 8, alignItems: "center", padding: "0 22px", height: 44, borderBottom: "1px solid #F6F7FA" }}>
              <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{r.date}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.desc}</span>
              <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>AED {r.amount}</span>
              <span style={pill(r.side, "side")}>{r.side}</span>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <button onClick={() => matchRow(i)} disabled={reconciling !== null} style={{ height: 28, borderRadius: 8, border: 0, background: "#F0EFFE", padding: "0 10px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: AC, cursor: reconciling !== null ? "wait" : "pointer", opacity: reconciling !== null && reconciling !== r.id ? 0.5 : 1 }}>Match to&hellip;</button>
                <button style={{ height: 28, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", padding: "0 10px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Flag</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Standing obligations</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Regulatory, audit and funding commitments</div>
          <div style={{ marginTop: 14 }}>
            {obligations.length ? obligations.map((o) => (
              <div key={o.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, flex: "none", background: o.flag ? "#E2A33C" : "#34C08A" }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#14161F" }}>{o.label}</span>
                <span style={{ fontSize: 11.5, fontWeight: o.flag ? 700 : 600, color: o.flag ? "#B07B14" : "#6B7180" }}>{o.value}</span>
              </div>
            )) : (
              <div style={EMPTY_STATE}>No obligations tracked yet</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
        <div style={{ padding: "16px 22px 10px", borderBottom: "1px solid #EDEEF3" }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em" }}>Drawdown requests</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "92px 1.2fr 116px 1.5fr 86px 1.1fr", gap: 8, padding: "12px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3" }}>
          <span>Request</span><span>Milestone</span><span style={{ textAlign: "right" }}>Amount</span><span>Engineer certificate</span><span>RERA</span><span>Status</span>
        </div>
        {drawdowns.map((d) => (
          <div key={d.id} style={{ display: "grid", gridTemplateColumns: "92px 1.2fr 116px 1.5fr 86px 1.1fr", gap: 8, alignItems: "center", padding: "0 22px", height: 46, borderBottom: "1px solid #F6F7FA" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600 }}>{d.id}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600 }}>{d.milestone}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>AED {d.amount}</span>
            <span style={{ fontSize: 10.5, color: "#6B7180", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.cert}</span>
            <span style={pill(d.rera, "rera")}>{d.rera}</span>
            <span style={pill(d.status, "status")}>{d.status}</span>
          </div>
        ))}
      </div>

      {ddrOpen && (
        <div onMouseDown={() => { setDdrOpen(false); setDdrErr(""); }} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.42)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "26px 28px", width: "100%", maxWidth: 520, boxShadow: "0 24px 60px rgba(20,22,31,.25)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>New drawdown request</div>
            <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>Submit a drawdown against verified construction. Requires an engineer certificate below the certified ceiling to proceed.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Milestone</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {milestones.map((m) => (
                    <span key={m} onClick={() => setDdrMilestone(m)} style={{ fontSize: 11.5, fontWeight: 700, padding: "7px 12px", borderRadius: 10, cursor: "pointer", background: ddrMilestone === m ? AC : "#F1F2F6", color: ddrMilestone === m ? "#fff" : "#4A5060" }}>{m}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {field("Amount (AED)", ddrAmount, setDdrAmount, "e.g. 12,400,000", true)}
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>RERA status</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Submitted", "Draft", "Approved"].map((s) => (
                    <span key={s} onClick={() => setDdrRera(s)} style={{ fontSize: 11.5, fontWeight: 700, padding: "7px 12px", borderRadius: 10, cursor: "pointer", background: ddrRera === s ? AC : "#F1F2F6", color: ddrRera === s ? "#fff" : "#4A5060" }}>{s}</span>
                  ))}
                </div>
              </div>
              {ddrErr && <div style={{ fontSize: 11.5, fontWeight: 600, color: "#E5484D" }}>{ddrErr}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => { setDdrOpen(false); setDdrErr(""); }} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Cancel</button>
              <button onClick={submitDdr} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Create drawdown</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
