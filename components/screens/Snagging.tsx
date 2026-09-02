import { useState } from "react";
import { AC } from "../../lib/format";

type SnagRow = { unit: string; loc: string; trade: string; desc: string; sev: string; contractor: string; status: string; reinspect: string };

const SEV_PILL: Record<string, { bg: string; color: string }> = { Critical: { bg: "#FDECEC", color: "#E5484D" }, Major: { bg: "#FDF4E5", color: "#B07B14" }, Minor: { bg: "#F1F2F6", color: "#6B7180" } };
const STATUS_PILL: Record<string, { bg: string; color: string }> = { Open: { bg: "#FDECEC", color: "#E5484D" }, Closed: { bg: "#E9F8F1", color: "#1F9D6B" }, "In progress": { bg: "#EDECFE", color: AC }, "Re-inspect": { bg: "#FDF4E5", color: "#B07B14" } };

const TRADES: [string, number][] = [["MEP", 11], ["Finishes", 9], ["Joinery", 7], ["Glazing", 5], ["Waterproofing", 4], ["Smart home", 2]];
const maxTrade = 11;

const ROWS: SnagRow[] = [
  { unit: "WPK-T1-0114", loc: "Master bedroom", trade: "Joinery", desc: "Wardrobe door misaligned, does not close flush", sev: "Major", contractor: "ALEC \u00b7 Joinery", status: "Open", reinspect: "28 Aug" },
  { unit: "WPK-T1-0114", loc: "Guest bathroom", trade: "MEP", desc: "Low water pressure at basin mixer", sev: "Critical", contractor: "ALEC \u00b7 MEP", status: "In progress", reinspect: "27 Aug" },
  { unit: "WPK-T1-0208", loc: "Living room", trade: "Finishes", desc: "Paint blemish on north wall, 300mm", sev: "Minor", contractor: "ALEC \u00b7 Finishes", status: "Closed", reinspect: "\u2014" },
  { unit: "WPK-T1-0208", loc: "Balcony", trade: "Waterproofing", desc: "Ponding at drain outlet after test", sev: "Critical", contractor: "ALEC \u00b7 Civil", status: "Open", reinspect: "29 Aug" },
  { unit: "WPK-T1-0311", loc: "Kitchen", trade: "Appliances", desc: "Oven fan intermittent", sev: "Major", contractor: "Siemens \u00b7 warranty", status: "In progress", reinspect: "30 Aug" },
  { unit: "WPK-T1-0104", loc: "Entrance", trade: "Smart home", desc: "Door sensor not pairing with panel", sev: "Major", contractor: "Loxone", status: "Open", reinspect: "02 Sep" },
  { unit: "WPK-T1-0104", loc: "Powder room", trade: "Finishes", desc: "Grout discolouration", sev: "Minor", contractor: "ALEC \u00b7 Finishes", status: "Closed", reinspect: "\u2014" },
  { unit: "WPK-T1-0512", loc: "Terrace", trade: "Glazing", desc: "Scratch to glass panel, 120mm", sev: "Minor", contractor: "Alumco", status: "Re-inspect", reinspect: "28 Aug" },
];

const sevPill = (v: string) => { const s = SEV_PILL[v] || SEV_PILL.Minor; return { display: "inline-block", fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px", background: s.bg, color: s.color }; };
const statusPill = (v: string) => { const s = STATUS_PILL[v] || STATUS_PILL.Open; return { display: "inline-block", fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px", background: s.bg, color: s.color }; };

export default function SnaggingScreen() {
  const [closed, setClosed] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState("");

  const closeSnag = (idx: number) => {
    setClosed((prev) => { const next = new Set(prev); next.add(idx); return next; });
    setNotice("Snag closed \u00b7 " + ROWS[idx].unit + " \u00b7 " + ROWS[idx].desc.substring(0, 30) + "...");
    setTimeout(() => setNotice(""), 3000);
  };

  const openCount = ROWS.filter((_, i) => !closed.has(i)).filter((r) => r.status !== "Closed").length;
  const critCount = ROWS.filter((_, i) => !closed.has(i)).filter((r) => r.sev === "Critical").length;
  const reinspCount = ROWS.filter((_, i) => !closed.has(i)).filter((r) => r.reinspect !== "\u2014" && r.reinspect !== "Closed").length;
  const closedCount = ROWS.filter((_, i) => closed.has(i)).length + ROWS.filter((r) => r.status === "Closed").length;

  return (
    <div>
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Snagging</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Wilton Park Residences \u00b7 reputation is made or lost here</div>
        </div>
        <button style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Assign contractor</button>
        <button style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Raise snag</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr) 1.4fr", gap: 14, marginBottom: 16 }}>
        {[
          { label: "Open snags", value: String(openCount), note: "across 14 units", bad: false },
          { label: "Critical", value: String(critCount), note: "blocking handover", bad: true },
          { label: "Re-inspection due", value: String(reinspCount), note: "this week", bad: false },
          { label: "Closed this month", value: String(112 + closedCount), note: "avg 6 days to close", bad: false },
        ].map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginTop: 10, color: k.bad ? "#E5484D" : "#14161F" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 4 }}>{k.note}</div>
          </div>
        ))}
        <div style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "-.01em", marginBottom: 12 }}>Open by trade</div>
          {TRADES.map(([label, count]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
              <span style={{ width: 80, fontSize: 10.5, fontWeight: 600, color: "#4A5060", flex: "none" }}>{label}</span>
              <span style={{ flex: 1, height: 7, borderRadius: 4, background: "#F1F2F6", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", borderRadius: 4, width: (count / maxTrade * 100) + "%", background: AC }} />
              </span>
              <span style={{ width: 20, fontSize: 10.5, fontWeight: 700, color: "#4A5060", textAlign: "right" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 110px 88px 1.4fr 76px 1fr 88px 76px 100px", gap: 8, padding: "13px 20px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
          <span>Unit</span><span>Location</span><span>Trade</span><span>Description</span><span>Severity</span><span>Contractor</span><span>Status</span><span>Re-inspect</span><span style={{ textAlign: "right" }}></span>
        </div>
        {ROWS.map((r, i) => {
          const isClosed = closed.has(i) || r.status === "Closed";
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "110px 110px 88px 1.4fr 76px 1fr 88px 76px 100px", gap: 8, alignItems: "center", padding: "0 20px", height: 50, borderBottom: "1px solid #F6F7FA", opacity: isClosed ? 0.5 : 1 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600 }}>{r.unit}</span>
              <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.loc}</span>
              <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{r.trade}</span>
              <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.desc}</span>
              <span style={sevPill(r.sev)}>{r.sev}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "#4A5060", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.contractor}</span>
              <span style={statusPill(isClosed ? "Closed" : r.status)}>{isClosed ? "Closed" : r.status}</span>
              <span style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600 }}>{r.reinspect}</span>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button style={{ height: 28, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", padding: "0 9px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Photo</button>
                {!isClosed && <button onClick={() => closeSnag(i)} style={{ height: 28, borderRadius: 8, border: 0, background: "#F0EFFE", padding: "0 9px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: AC, cursor: "pointer" }}>Close</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
