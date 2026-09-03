import { useState } from "react";
import { AC } from "../../lib/format";

type QueueRow = { date: string; desc: string; amount: string; side: string };
type Obligation = { label: string; value: string; flag: boolean };
type Drawdown = { id: string; milestone: string; amount: string; cert: string; rera: string; status: string };

const SIDE_PILL: Record<string, { bg: string; color: string }> = {
  "Bank only": { bg: "#FDF4E5", color: "#B07B14" },
  "System only": { bg: "#EDECFE", color: AC },
};

export default function EscrowScreen() {
  const [queue, setQueue] = useState<QueueRow[]>([
    { date: "22 Aug 26", desc: "Inbound transfer \u00b7 ref MENON RM 3302", amount: "367,875", side: "Bank only" },
    { date: "21 Aug 26", desc: "RCP-H21-004706 \u00b7 M. Lindqvist", amount: "640,000", side: "System only" },
    { date: "19 Aug 26", desc: "Inbound transfer \u00b7 no reference quoted", amount: "112,400", side: "Bank only" },
    { date: "18 Aug 26", desc: "RCP-H21-004689 \u00b7 E. Petrova", amount: "1,204,000", side: "System only" },
    { date: "15 Aug 26", desc: "Inbound transfer \u00b7 ref BLG-1602", amount: "84,600", side: "Bank only" },
    { date: "12 Aug 26", desc: "Cheque return \u00b7 CHQ-883964", amount: "268,000", side: "Bank only" },
  ]);
  const [notice, setNotice] = useState("");
  const [drawdowns, setDrawdowns] = useState<Drawdown[]>([
    { id: "DDR-0004", milestone: "Structure 40%", amount: "62,400,000", cert: "WSP \u00b7 A. Faruqi \u00b7 04 Aug 26", rera: "Submitted", status: "Awaiting trustee" },
    { id: "DDR-0003", milestone: "Substructure complete", amount: "48,200,000", cert: "WSP \u00b7 A. Faruqi \u00b7 12 May 26", rera: "Approved", status: "Released" },
    { id: "DDR-0002", milestone: "Enabling works", amount: "21,600,000", cert: "WSP \u00b7 A. Faruqi \u00b7 03 Feb 26", rera: "Approved", status: "Released" },
    { id: "DDR-0001", milestone: "Mobilisation", amount: "14,800,000", cert: "WSP \u00b7 A. Faruqi \u00b7 18 Nov 25", rera: "Approved", status: "Released" },
  ]);
  const [ddrOpen, setDdrOpen] = useState(false);
  const [ddrMilestone, setDdrMilestone] = useState("Structure 40%");
  const [ddrAmount, setDdrAmount] = useState("");
  const [ddrRera, setDdrRera] = useState("Submitted");
  const [ddrErr, setDdrErr] = useState("");

  const escId: [string, string, boolean][] = [
    ["Escrow bank", "Emirates NBD \u00b7 Trustee", false],
    ["Account name", "Belgravia Heights III Escrow", false],
    ["IBAN", "AE49 0260 0010 5147 8632 401", true],
    ["RERA account no.", "RERA-ESC-88410", true],
  ];

  const tiles: { label: string; value: string; note: string; alert: boolean }[] = [
    { label: "Collected in system", value: "AED 742,340,000", note: "ledger total", alert: false },
    { label: "Deposited to escrow", value: "AED 742,000,000", note: "per bank statement", alert: false },
    { label: "Variance", value: "AED 340,000", note: "12 unmatched items", alert: true },
    { label: "Current escrow balance", value: "AED 188,420,000", note: "after 4 drawdowns", alert: false },
  ];

  const gauges: { label: string; pct: number; mark: number; note: string; flag: boolean }[] = [
    { label: "Upfront contribution", pct: 24.6, mark: 20, note: "AED 68.4M funded against a 20% minimum of AED 55.6M estimated construction cost.", flag: false },
    { label: "Retention held", pct: 5.0, mark: 5, note: "AED 13.9M held. Releasable 1 year post-handover \u00b7 Q4 2028.", flag: false },
    { label: "Drawn down vs verified progress", pct: 52.0, mark: 46, note: "Drawdowns are 6.0 points ahead of verified construction. Flagged as a compliance risk.", flag: true },
  ];

  const obligations: Obligation[] = [
    { label: "DLD project registration", value: "Active", flag: false },
    { label: "RERA registration", value: "Valid", flag: false },
    { label: "Advertising permit", value: "Expires 14 Oct 26", flag: true },
    { label: "Annual escrow audit", value: "Due 31 Jan 27", flag: false },
    { label: "Construction progress report", value: "Filed 04 Aug 26", flag: false },
    { label: "20% upfront funded", value: "24.6%", flag: false },
    { label: "5% retention held", value: "5.0%", flag: false },
  ];

  const matchRow = (idx: number) => { setQueue((q) => q.filter((_, i) => i !== idx)); setNotice("Row matched and reconciled \u00b7 escrow variance reduced"); setTimeout(() => setNotice(""), 3000); };

  const submitDdr = () => {
    const amt = ddrAmount.replace(/[^0-9]/g, "");
    if (!amt || Number(amt) <= 0) { setDdrErr("Enter a valid drawdown amount"); return; }
    const next = (Number(drawdowns[0]?.id.replace("DDR-", "") || "0004") + 1).toString().padStart(4, "0");
    const newRow: Drawdown = {
      id: "DDR-" + next,
      milestone: ddrMilestone,
      amount: Number(amt).toLocaleString("en-US"),
      cert: "WSP \u00b7 A. Faruqi \u00b7 " + new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
      rera: ddrRera,
      status: "Awaiting trustee",
    };
    setDrawdowns((d) => [newRow, ...d]);
    setDdrOpen(false);
    setDdrErr("");
    setDdrAmount("");
    setNotice("Drawdown request " + newRow.id + " created \u00b7 " + ddrMilestone + " \u00b7 AED " + newRow.amount + " submitted to trustee");
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

  return (
    <div>
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Escrow reconciliation</div>
            <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Belgravia Heights III \u00b7 Law No. 8 of 2007 \u00b7 last statement imported 24 Aug 2026, 18:04</div>
          </div>
          <button onClick={() => setDdrOpen(true)} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>New drawdown request</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: 16 }}>
          {escId.map(([k, v, mono]) => (
            <div key={k}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{k}</div>
              <div style={{ fontFamily: mono ? "'JetBrains Mono',monospace" : undefined, fontSize: 12.5, fontWeight: mono ? 600 : 700, color: "#14161F", marginTop: 5 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ background: t.alert ? "#FDECEC" : "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: t.alert ? "#C23B40" : "#9AA0AE", textTransform: "uppercase" }}>{t.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 11, color: t.alert ? "#E5484D" : "#14161F" }}>{t.value}</div>
            <div style={{ fontSize: 11, color: t.alert ? "#C23B40" : "#6B7180", fontWeight: 500, marginTop: 4 }}>{t.note}</div>
          </div>
        ))}
      </div>

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
                <button onClick={() => matchRow(i)} style={{ height: 28, borderRadius: 8, border: 0, background: "#F0EFFE", padding: "0 10px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: AC, cursor: "pointer" }}>Match to&hellip;</button>
                <button style={{ height: 28, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", padding: "0 10px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Flag</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Standing obligations</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Regulatory, audit and funding commitments</div>
          <div style={{ marginTop: 14 }}>
            {obligations.map((o) => (
              <div key={o.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, flex: "none", background: o.flag ? "#E2A33C" : "#34C08A" }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#14161F" }}>{o.label}</span>
                <span style={{ fontSize: 11.5, fontWeight: o.flag ? 700 : 600, color: o.flag ? "#B07B14" : "#6B7180" }}>{o.value}</span>
              </div>
            ))}
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
