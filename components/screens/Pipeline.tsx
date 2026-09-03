import { useState } from "react";
import { useRouter } from "next/router";
import { AC } from "../../lib/format";

type PipeCard = { no: string; buyer: string; meta: string };
type PipeCol = { label: string; count: number; color: string; cards: PipeCard[] };

const PIPE: PipeCol[] = [
  { label: "Payment cleared", count: 18, color: "#34C08A", cards: [{ no: "WPK-T1-0402", buyer: "N. Khoury", meta: "Cleared 04 Aug" }, { no: "WPK-T1-0405", buyer: "M. Haddad", meta: "Cleared 06 Aug" }] },
  { label: "Snagging scheduled", count: 14, color: AC, cards: [{ no: "WPK-T1-0311", buyer: "S. Rathore", meta: "Inspection 28 Aug" }] },
  { label: "Snagging done", count: 22, color: AC, cards: [{ no: "WPK-T1-0208", buyer: "G. Okonkwo", meta: "11 snags raised" }] },
  { label: "De-snagging", count: 16, color: "#8B7CF6", cards: [{ no: "WPK-T1-0104", buyer: "W. Chen", meta: "4 snags open \u00b7 ALEC" }] },
  { label: "Utilities", count: 12, color: "#8B7CF6", cards: [{ no: "WPK-T1-0512", buyer: "P. Nair", meta: "DEWA pending" }] },
  { label: "Documents ready", count: 19, color: "#E2A33C", cards: [{ no: "WPK-T1-0607", buyer: "O. Al Suwaidi", meta: "Title deed applied" }] },
  { label: "Title deed issued", count: 15, color: "#E2A33C", cards: [{ no: "WPK-T1-0703", buyer: "E. Petrova", meta: "Deed 4417-2026" }] },
  { label: "Keys handed", count: 20, color: "#0EA5A5", cards: [{ no: "WPK-T1-0801", buyer: "F. Al Hashimi", meta: "Keys 22 Aug" }] },
  { label: "OA onboarded", count: 4, color: "#8A94A6", cards: [{ no: "WPK-T1-0902", buyer: "M. Lindqvist", meta: "Mollak registered" }] },
];

const BLOCKED = [
  { unit: "WPK-T1-0210", buyer: "V. Shetty", reason: "Outstanding payment", detail: "AED 412,000", color: "#E5484D" },
  { unit: "WPK-T1-0114", buyer: "T. Alderton", reason: "Snags open", detail: "6 items \u00b7 ALEC", color: "#E2A33C" },
  { unit: "WPK-T1-0308", buyer: "A. Farouk", reason: "Documents missing", detail: "Passport renewal", color: "#E2A33C" },
  { unit: "WPK-T1-0421", buyer: "C. Liu", reason: "Utilities pending", detail: "Empower activation", color: "#8B7CF6" },
];

const STAGE_DAYS = [
  { label: "Payment cleared", days: 6 },
  { label: "Snagging", days: 11 },
  { label: "De-snagging", days: 18 },
  { label: "Utilities", days: 9 },
  { label: "Documents", days: 14 },
  { label: "Deed", days: 21 },
  { label: "Keys", days: 4 },
];

const FORECAST = [8, 12, 15, 11, 18, 14, 9, 6];
const maxF = Math.max(...FORECAST);

export default function PipelineScreen() {
  const router = useRouter();
  const [sel, setSel] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState("WPK-T1-0211");
  const [date, setDate] = useState("06 Sep 26");
  const [cards, setCards] = useState<Record<number, PipeCard[]>>(() => {
    const m: Record<number, PipeCard[]> = {};
    PIPE.forEach((c, i) => { m[i] = c.cards; });
    return m;
  });
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    PIPE.forEach((c, i) => { m[i] = c.count; });
    return m;
  });

  const goSnag = () => router.push({ pathname: "/handover", query: { s: "snagging" } }, undefined, { shallow: true });

  const schedule = () => {
    const newCard: PipeCard = { no: unit, buyer: "Buyer", meta: "Handover " + date };
    setCards((c) => ({ ...c, 0: [newCard, ...(c[0] || [])] }));
    setCounts((c) => ({ ...c, 0: (c[0] || 0) + 1 }));
    setOpen(false);
    setNotice("Handover scheduled for " + unit + " on " + date + " \u00b7 added to Payment cleared");
    setTimeout(() => setNotice(""), 3800);
  };

  return (
    <div>
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Handover pipeline</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Wilton Park Residences \u00b7 140 units \u00b7 a unit cannot pass Payment cleared with any balance outstanding</div>
        </div>
        <button onClick={goSnag} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Open snag list</button>
        <button onClick={() => setOpen(true)} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Schedule handover</button>
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" }}>
        {PIPE.map((col, ci) => (
          <div key={col.label} style={{ width: 206, flex: "none", background: "#EFF0F5", borderRadius: 18, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 6px 12px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, flex: "none", background: col.color }} />
              <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, lineHeight: 1.3 }}>{col.label}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#6B7180" }}>{counts[ci]}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(cards[ci] || []).map((k, ki) => (
                <div key={k.no + ki} onClick={() => setSel(sel === ci * 100 + ki ? null : ci * 100 + ki)} style={{ background: "#fff", borderRadius: 14, padding: "12px 13px", boxShadow: "0 1px 2px rgba(20,22,31,.05)", cursor: "pointer", border: sel === ci * 100 + ki ? "2px solid " + col.color : "1px solid transparent" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 600 }}>{k.no}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 6 }}>{k.buyer}</div>
                  <div style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600, marginTop: 4 }}>{k.meta}</div>
                  {sel === ci * 100 + ki && <div style={{ fontSize: 10, fontWeight: 700, color: col.color, marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F2F6" }}>Selected \u00b7 ready to advance</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 16, marginTop: 18, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Blocked units</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#FDECEC", color: "#E5484D", borderRadius: 8, padding: "3px 9px" }}>4 blocked</span>
          </div>
          {BLOCKED.map((b) => (
            <div key={b.unit} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #F6F7FA" }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, flex: "none", marginTop: 5, background: b.color }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700 }}>{b.unit}</span>
                <span style={{ display: "block", fontSize: 11, color: "#6B7180", fontWeight: 600, marginTop: 2 }}>{b.reason}</span>
              </span>
              <span style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600 }}>{b.buyer} \u00b7 {b.detail}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Average days in stage</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>De-snagging and title deed are the bottlenecks</div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {STAGE_DAYS.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 110, fontSize: 11, fontWeight: 600, color: "#4A5060", flex: "none" }}>{s.label}</span>
                <span style={{ flex: 1, height: 8, borderRadius: 4, background: "#F1F2F6", overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", borderRadius: 4, width: (s.days / 21 * 100) + "%", background: s.days > 15 ? "#E2A33C" : AC }} />
                </span>
                <span style={{ width: 30, fontSize: 11, fontWeight: 700, color: s.days > 15 ? "#B07B14" : "#4A5060", textAlign: "right" }}>{s.days}d</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Handovers forecast</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Next 8 weeks \u00b7 93 units scheduled</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 9, height: 150, marginTop: 18 }}>
            {FORECAST.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#4A5060", marginBottom: 4 }}>{v}</span>
                <span style={{ width: "100%", borderRadius: "6px 6px 0 0", height: (v / maxF * 110) + "px", background: AC }} />
                <span style={{ fontSize: 9, color: "#9AA0AE", fontWeight: 600, marginTop: 6 }}>W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <div onMouseDown={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.42)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "26px 28px", width: "100%", maxWidth: 540, boxShadow: "0 24px 60px rgba(20,22,31,.25)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>Schedule handover</div>
            <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>Pick a completed unit and a handover date. The unit is added to Payment cleared, then flows through snagging, documents and keys.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Unit</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["WPK-T1-0211", "WPK-T1-0509", "WPK-T1-0708", "WPK-T1-0303", "WPK-T1-0610"].map((u) => (
                    <span key={u} onClick={() => setUnit(u)} style={{ fontFamily: "monospace", fontSize: 11.5, fontWeight: 700, padding: "7px 12px", borderRadius: 10, cursor: "pointer", background: unit === u ? AC : "#F1F2F6", color: unit === u ? "#fff" : "#4A5060" }}>{u}</span>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Handover date</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["06 Sep 26", "08 Sep 26", "10 Sep 26", "13 Sep 26", "15 Sep 26"].map((d) => (
                    <span key={d} onClick={() => setDate(d)} style={{ fontSize: 11.5, fontWeight: 700, padding: "7px 12px", borderRadius: 10, cursor: "pointer", background: date === d ? AC : "#F1F2F6", color: date === d ? "#fff" : "#4A5060" }}>{d}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setOpen(false)} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Cancel</button>
              <button onClick={schedule} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Schedule handover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
