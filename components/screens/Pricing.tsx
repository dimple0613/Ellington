import { useMemo, useState } from "react";
import { AC, money } from "../../lib/format";
import { ramp } from "../../lib/data";
import { PROJECTS } from "../../lib/data";

const BANDS = ["L1-10", "L11-20", "L21-30", "L31-40", "L41-45"];

const MATRIX_TYP = ["1BR-A", "1BR-B", "2BR-B", "2BR-Corner", "3BR-A"];

const PREVIEWS = [
  { no: "H21-T1-3801", typ: "3BR-A", old: "AED 3,565,000", nw: "AED 3,672,000", d: "+3.0%", price: 3565000 },
  { no: "H21-T1-3802", typ: "1BR-A", old: "AED 1,595,000", nw: "AED 1,643,000", d: "+3.0%", price: 1595000 },
  { no: "H21-T1-3804", typ: "2BR-B", old: "AED 2,470,000", nw: "AED 2,544,000", d: "+3.0%", price: 2470000 },
  { no: "H21-T1-3901", typ: "2BR-Corner", old: "AED 2,675,000", nw: "AED 2,755,000", d: "+3.0%", price: 2675000 },
];

const PHASES = [
  { name: "Founders release", units: "24 units", when: "Released 14 Jan 2026", uplift: "\u2014", status: "Closed" },
  { name: "Phase 1", units: "96 units", when: "Released 02 Mar 2026", uplift: "+4.0%", status: "Live" },
  { name: "Phase 2", units: "82 units", when: "12 Sep 2026 \u00b7 10:00", uplift: "+7.5%", status: "Scheduled" },
  { name: "Broker allocation \u00b7 Betterhomes", units: "30 units", when: "Rolling", uplift: "+0.0%", status: "Live" },
];

const DISC = [
  ["Sales agent", "0\u20133%"],
  ["Sales manager", "0\u20135%"],
  ["Sales director", "0\u20138%"],
  ["Owner", "Unlimited"],
];

const LEAK = [3.1, 2.8, 3.4, 4.1, 3.6, 4.8, 5.2, 4.4, 3.9, 4.6, 5.1, 4.2];

const pill = (s: string) =>
  s === "Live"
    ? { background: "#E9F8F1", color: "#1F9D6B" }
    : s === "Scheduled"
    ? { background: "#FDF4E5", color: "#B07B14" }
    : { background: "#F1F2F6", color: "#6B7180" };

export default function PricingScreen({ scope = "ALL" }: { scope?: string }) {
  const proj = PROJECTS.find((p) => p.code === scope);
  const projName = proj ? proj.name : "Belgravia Heights III";
  const [sel, setSel] = useState("Unsold \u00b7 floors 38\u201345");
  const [selOpen, setSelOpen] = useState(false);
  const [chg, setChg] = useState("Increase by 3.0%");
  const [chgOpen, setChgOpen] = useState(false);
  const [eff, setEff] = useState("01 Sep 2026");
  const [reason, setReason] = useState("Required");
  const [submitted, setSubmitted] = useState(false);
  const [histOpen, setHistOpen] = useState(false);

  const gdvImpact = useMemo(() => PREVIEWS.reduce((a, r) => a + r.price * 0.03, 0), []);
  const previewRows = PREVIEWS;

  const matrix = MATRIX_TYP.map((t, ti) => ({
    typ: t,
    cells: BANDS.map((b, bi) => {
      const psf = 1450 + ti * 42 + bi * 118;
      const inten = (psf - 1450) / 640;
      return {
        key: t + b,
        psf: psf.toLocaleString("en-US"),
        meta: (12 - bi) + " units \u00b7 " + Math.max(2, 10 - bi - ti) + " sold",
        bg: ramp(inten),
      };
    }),
  }));

  const versions = [
    ["v11", "Effective 02 Mar 2026", "A. Haddad", "+2.0% increase, tower 2"],
    ["v10", "Effective 11 Jan 2026", "A. Haddad", "Remap L41-45 uplift"],
    ["v9", "Effective 14 Nov 2025", "R. Kapoor", "Phase 2 launch pricing"],
    ["v8", "Effective 02 Sep 2025", "System", "Initial release"],
  ];

  const exportCsv = () => {
    const head = "Typology,Band,Rate (AED/sq.ft)";
    const rows = matrix.flatMap((m) =>
      m.cells.map((c) => `${m.typ},${c.key.replace(m.typ, "")},${c.psf}`)
    );
    const csv = [head, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ellington-price-list.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const box = (label: string, value: string, val: string) => (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
      <div style={{ height: 40, borderRadius: 12, border: "1px solid " + (val === "reason" ? "#E2A33C" : "#E4E6EE"), background: val === "reason" ? "#FDF4E5" : "#fff", display: "flex", alignItems: "center", padding: "0 13px", fontSize: 12.5, fontWeight: 600, color: val === "reason" ? "#B07B14" : "#14161F", cursor: val === "reason" ? "default" : "pointer" }}>{value}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Pricing &amp; availability</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>{projName} \u00b7 price list v11 \u00b7 effective 02 Mar 2026</div>
        </div>
        <button onClick={() => setHistOpen(!histOpen)} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Version history</button>
        <button onClick={exportCsv} style={{ height: 38, borderRadius: 12, background: "#14161F", color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Export price list</button>
      </div>

      {histOpen && (
        <div style={{ background: "#fff", borderRadius: 20, padding: "14px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Version history</div>
          {versions.map((v) => (
            <div key={v[0]} style={{ display: "grid", gridTemplateColumns: "48px 1.2fr 110px 1fr", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F6F7FA" }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: AC }}>{v[0]}</span>
              <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{v[1]}</span>
              <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 600 }}>{v[2]}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{v[3]}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Price ladder \u00b7 AED per sq.ft</div>
            <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Typology \u00d7 floor band. Darker means richer. Sold count exposes where pricing is working.</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9AA0AE" }}>1,450</span>
          <span style={{ width: 110, height: 8, borderRadius: 5, background: "linear-gradient(90deg,#F0EFFE,#827CCE)" }}></span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9AA0AE" }}>2,090</span>
        </div>
        <div style={{ display: "flex", gap: 8, paddingLeft: 104, marginBottom: 8 }}>
          {BANDS.map((b) => (
            <span key={b} style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{b}</span>
          ))}
        </div>
        {matrix.map((m) => (
          <div key={m.typ} style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 96, flex: "none", display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700 }}>{m.typ}</span>
            {m.cells.map((c) => (
              <div key={c.key} style={{ flex: 1, borderRadius: 13, padding: "13px 14px", background: c.bg, color: "#14161F" }}>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.02em" }}>{c.psf}</div>
                <div style={{ fontSize: 9.5, fontWeight: 600, marginTop: 5, color: "#14161F" }}>{c.meta}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Bulk price revision</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Selection</div>
              <div onClick={() => { setSelOpen(!selOpen); setChgOpen(false); }} style={{ height: 40, borderRadius: 12, border: "1px solid #E4E6EE", display: "flex", alignItems: "center", padding: "0 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", position: "relative" }}>{sel}
                {selOpen && (
                  <div style={{ position: "absolute", top: 44, left: 0, right: 0, zIndex: 10, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 12, boxShadow: "0 8px 24px rgba(20,22,31,.1)", padding: 6 }}>
                    {["Unsold \u00b7 floors 38\u201345", "Unsold \u00b7 all floors", "2BR typology", "All units \u00b7 tower 1", "3BR-A \u00b7 floors 31\u201340"].map((o) => (
                      <div key={o} onClick={(e) => { e.stopPropagation(); setSel(o); setSelOpen(false); }} style={{ padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: sel === o ? "#F0EFFE" : "transparent", color: sel === o ? AC : "#4A5060" }}>{o}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Change</div>
              <div onClick={() => { setChgOpen(!chgOpen); setSelOpen(false); }} style={{ height: 40, borderRadius: 12, border: "1px solid #E4E6EE", display: "flex", alignItems: "center", padding: "0 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", position: "relative" }}>{chg}
                {chgOpen && (
                  <div style={{ position: "absolute", top: 44, left: 0, right: 0, zIndex: 10, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 12, boxShadow: "0 8px 24px rgba(20,22,31,.1)", padding: 6 }}>
                    {["Increase by 3.0%", "Increase by 5.0%", "Decrease by 2.0%", "Flat hold"].map((o) => (
                      <div key={o} onClick={(e) => { e.stopPropagation(); setChg(o); setChgOpen(false); }} style={{ padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: chg === o ? "#F0EFFE" : "transparent", color: chg === o ? AC : "#4A5060" }}>{o}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Effective date</div>
              <div onClick={() => { setSelOpen(false); setChgOpen(false); }} style={{ height: 40, borderRadius: 12, border: "1px solid #E4E6EE", display: "flex", alignItems: "center", padding: "0 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{eff}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Reason</div>
              <div onClick={() => { setReason("Required"); setSelOpen(false); setChgOpen(false); }} style={{ height: 40, borderRadius: 12, border: "1px solid #E2A33C", background: "#FDF4E5", display: "flex", alignItems: "center", padding: "0 13px", fontSize: 12.5, fontWeight: 600, color: "#B07B14", cursor: "pointer" }}>{reason}</div>
            </div>
          </div>
          <div style={{ marginTop: 18, borderTop: "1px solid #F1F2F7", paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 10 }}>Preview \u00b7 4 of 42 affected</div>
            {previewRows.map((r) => (
              <div key={r.no} style={{ display: "grid", gridTemplateColumns: "110px 90px 1fr 1fr 62px", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600 }}>{r.no}</span>
                <span style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600 }}>{r.typ}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, color: "#9AA0AE", fontWeight: 600, textDecoration: "line-through" }}>{r.old}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{r.nw}</span>
                <span style={{ textAlign: "right", fontSize: 11, fontWeight: 800, color: "#1F9D6B" }}>{r.d}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6B7180" }}>GDV impact + {money(Math.round(gdvImpact))}</span>
              {submitted ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#1F9D6B", background: "#E9F8F1", borderRadius: 8, padding: "8px 14px" }}>Submitted \u00b7 pending K. Al Fahim</span>
              ) : (
                <button onClick={() => setSubmitted(true)} style={{ height: 36, borderRadius: 11, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Submit for approval</button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden" }}>
            <div style={{ padding: "20px 22px 4px", fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Release phases</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 1.1fr 68px 88px", gap: 10, padding: "13px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3" }}>
              <span>Phase</span><span>Units</span><span>Release</span><span style={{ textAlign: "right" }}>Uplift</span><span>Status</span>
            </div>
            {PHASES.map((p) => {
              const pl = pill(p.status);
              return (
                <div key={p.name} style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 1.1fr 68px 88px", gap: 10, alignItems: "center", padding: "0 22px", height: 44, borderBottom: "1px solid #F6F7FA" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{p.units}</span>
                  <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{p.when}</span>
                  <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{p.uplift}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", textAlign: "center", background: pl.background, color: pl.color }}>{p.status}</span>
                </div>
              );
            })}
            <div style={{ padding: "14px 22px", display: "flex", alignItems: "center", gap: 9, background: "#FDF4E5" }}>
              <span style={{ width: 7, height: 7, borderRadius: 5, background: "#E2A33C" }}></span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#8A6410" }}>Phase 2 releases in 17 days \u00b7 82 units locked</span>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Discount governance</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", marginTop: 14 }}>
              {DISC.map((d) => (
                <div key={d[0]} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: "1px solid #F6F7FA" }}>
                  <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500 }}>{d[0]}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700 }}>{d[1]}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 18 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase" }}>Discount leakage \u00b7 % of list GDV</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#E5484D" }}>4.2% this month</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 76, marginTop: 12 }}>
              {LEAK.map((v, i) => (
                <div key={"m" + (i + 1)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", gap: 5 }}>
                  <span style={{ display: "block", width: "100%", maxWidth: 24, borderRadius: "6px 6px 2px 2px", background: v > 4.5 ? "#E5484D" : "#DCDAFB", height: (v / 5.2) * 100 + "%" }}></span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#C2C6D2" }}>M{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
