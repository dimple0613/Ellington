import { useState } from "react";
import { AC } from "../../lib/format";
import { PROJECTS } from "../../lib/data";

const PKG = [
  { name: "Enabling works", weight: 6, planned: 100, actual: 100 },
  { name: "Substructure", weight: 14, planned: 100, actual: 100 },
  { name: "Superstructure", weight: 32, planned: 62, actual: 54 },
  { name: "MEP", weight: 18, planned: 24, actual: 18 },
  { name: "Facade", weight: 14, planned: 8, actual: 4 },
  { name: "Fit-out", weight: 10, planned: 0, actual: 0 },
  { name: "External works", weight: 4, planned: 0, actual: 0 },
  { name: "Testing & commissioning", weight: 2, planned: 0, actual: 0 },
];

const MILES = [
  { name: "Excavation complete", planned: "14 Feb 26", forecast: "11 Feb 26", actual: "11 Feb 26", variance: "\u22123 d", status: "Certified", triggers: "AED 34.2M \u00b7 96 buyers" },
  { name: "Substructure complete", planned: "18 May 26", forecast: "12 May 26", actual: "12 May 26", variance: "\u22126 d", status: "Certified", triggers: "AED 48.2M \u00b7 124 buyers" },
  { name: "Structure 40%", planned: "12 Apr 26", forecast: "18 Apr 26", actual: "\u2014", variance: "+6 d", status: "Pending", triggers: "AED 62.4M \u00b7 148 buyers" },
  { name: "Structure 70%", planned: "20 Nov 26", forecast: "28 Nov 26", actual: "\u2014", variance: "+8 d", status: "Forecast", triggers: "AED 58.1M \u00b7 148 buyers" },
  { name: "Facade complete", planned: "14 Jun 27", forecast: "02 Jul 27", actual: "\u2014", variance: "+18 d", status: "Forecast", triggers: "AED 44.6M \u00b7 152 buyers" },
  { name: "Handover", planned: "Q4 2027", forecast: "Q4 2027", actual: "\u2014", variance: "On track", status: "Forecast", triggers: "AED 88.4M \u00b7 176 buyers" },
];

const PHOTOS = ["04 Aug 2026", "21 Jul 2026", "30 Jun 2026", "12 Jun 2026", "28 May 2026"];

const TEAM = [
  ["Main contractor", "ALEC Engineering"],
  ["Consultant", "WSP Middle East"],
  ["Project manager", "Currie & Brown"],
  ["Certified valuation", "AED 132.4M"],
];

const RISKS = [
  { name: "Facade panel lead time", likelihood: "High", impact: "High", mitigation: "Dual-source supplier \u00b7 order placed", owner: "A. Faruqi", effect: "+18 d" },
  { name: "MEP subcontractor mobilisation", likelihood: "Medium", impact: "Medium", mitigation: "Weekly look-ahead review", owner: "S. Menon", effect: "+6 d" },
  { name: "Chilled water connection", likelihood: "Low", impact: "High", mitigation: "Empower application submitted", owner: "L. Ferreira", effect: "0 d" },
];

const varColor = (v: string) =>
  v.indexOf("+") === 0 ? "#E5484D" : v.indexOf("\u2212") === 0 ? "#1F9D6B" : "#6B7180";

const pill = (s: string) =>
  s === "Certified"
    ? { background: "#E9F8F1", color: "#1F9D6B" }
    : s === "Pending"
    ? { background: "#FDF4E5", color: "#B07B14" }
    : { background: "#F1F2F6", color: "#6B7180" };

const lpill = (s: string) =>
  s === "High"
    ? { background: "#FDECEC", color: "#E5484D" }
    : s === "Medium"
    ? { background: "#FDF4E5", color: "#B07B14" }
    : { background: "#F1F2F6", color: "#6B7180" };

export default function ConstructionScreen({ scope = "ALL" }: { scope?: string }) {
  const proj = PROJECTS.find((p) => p.code === scope);
  const projName = proj ? proj.name : "Belgravia Heights III";
  const [certified, setCertified] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [photoDates, setPhotoDates] = useState(PHOTOS);

  const cert = (i: number) => {
    const copy = CONSTRUCTION_MILES.slice();
    const m = copy[i];
    if (m.status === "Pending") {
      m.status = "Certified";
      m.actual = m.forecast;
      m.variance = "0 d";
      CONSTRUCTION_MILES.splice(0, CONSTRUCTION_MILES.length, ...copy);
      setCertified(true);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Construction progress</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>{projName} \u00b7 ALEC Engineering \u00b7 certified by WSP Middle East</div>
        </div>
        <button onClick={() => { setUploaded(true); setPhotoDates([new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), ...photoDates]); }} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Upload photo set</button>
        <button onClick={() => cert(2)} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Certify milestone</button>
      </div>

      {certified && (
        <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Structure 40% certified \u00b7 AED 62.4M invoiced to 148 buyers \u00b7 Oqood payment notices sent
        </div>
      )}
      {uploaded && (
        <div style={{ background: "#F0EFFE", color: AC, borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Photo set uploaded \u00b7 24 photos queued for review \u00b7 visible to buyers once approved
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        <div style={{ background: "#14161F", borderRadius: 20, padding: 24, color: "#fff" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.55)", textTransform: "uppercase" }}>Overall completion</div>
          <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-.045em", lineHeight: 1, marginTop: 14 }}>46.0%</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.66)", marginTop: 8 }}>Planned 52.0% \u00b7 6.0 points behind</div>
          <div style={{ height: 10, borderRadius: 6, background: "rgba(255,255,255,.14)", marginTop: 20, overflow: "hidden", position: "relative" }}>
            <span style={{ display: "block", height: "100%", width: "46%", background: "#E2A33C" }}></span>
            <span style={{ position: "absolute", top: -3, bottom: -3, left: "52%", width: 2, background: "#fff" }}></span>
          </div>
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", flexDirection: "column", gap: 12 }}>
            {TEAM.map((t) => (
              <div key={t[0]} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.55)" }}>{t[0]}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: "right" }}>{t[1]}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 22, background: "rgba(226,163,60,.16)", borderRadius: 14, padding: "14px 15px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: "#E2A33C", textTransform: "uppercase" }}>Handover forecast</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 7 }}>Q4 2027 \u00b7 18 days slippage</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 4 }}>Work packages</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500 }}>Black tick marks the planned position at today's date</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 60px 1fr 68px 74px", gap: 12, padding: "14px 0 9px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3" }}>
            <span>Package</span><span style={{ textAlign: "right" }}>Weight</span><span>Actual vs planned</span><span style={{ textAlign: "right" }}>Actual</span><span style={{ textAlign: "right" }}>Variance</span>
          </div>
          {PKG.map((p) => {
            const variance = p.actual - p.planned === 0 ? "\u2014" : (p.actual - p.planned) + " pts";
            return (
              <div key={p.name} style={{ display: "grid", gridTemplateColumns: "1.3fr 60px 1fr 68px 74px", gap: 12, alignItems: "center", padding: "11px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, color: "#9AA0AE", fontWeight: 600 }}>{p.weight}%</span>
                <span style={{ position: "relative", height: 9, borderRadius: 6, background: "#F1F2F7", overflow: "visible", display: "block" }}>
                  <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 6, overflow: "hidden", width: "100%", display: "block" }}>
                    <span style={{ display: "block", height: "100%", width: p.actual + "%", background: p.actual < p.planned ? "#E2A33C" : "#34C08A" }}></span>
                  </span>
                  <span style={{ position: "absolute", top: -3, bottom: -3, width: 2, background: "#14161F", left: p.planned + "%", display: "block" }}></span>
                </span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{p.actual}%</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700, color: p.actual < p.planned ? "#E5484D" : "#6B7180" }}>{variance}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden", marginTop: 16 }}>
        <div style={{ padding: "20px 24px 4px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Milestones and the money they release</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Certifying a milestone generates invoices immediately. Confirm before certifying.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 92px 92px 92px 84px 96px 1.1fr", gap: 10, padding: "14px 24px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3" }}>
          <span>Milestone</span><span>Planned</span><span>Forecast</span><span>Actual</span><span style={{ textAlign: "right" }}>Variance</span><span>Status</span><span style={{ textAlign: "right" }}>Becomes due</span>
        </div>
        {CONSTRUCTION_MILES.map((m) => {
          const pl = pill(m.status);
          return (
            <div key={m.name} style={{ display: "grid", gridTemplateColumns: "1.3fr 92px 92px 92px 84px 96px 1.1fr", gap: 10, alignItems: "center", padding: "0 24px", height: 48, borderBottom: "1px solid #F6F7FA" }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{m.name}</span>
              <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{m.planned}</span>
              <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{m.forecast}</span>
              <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{m.actual}</span>
              <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700, color: varColor(m.variance) }}>{m.variance}</span>
              <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", textAlign: "center", background: pl.background, color: pl.color }}>{m.status}</span>
              <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{m.triggers}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Site photo feed</div>
              <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Pulled by the executive app and the buyer portal</div>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: AC }}>Visible to buyers</span>
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
            {photoDates.map((d) => (
              <div key={d} style={{ width: 180, flex: "none" }}>
                <div style={{ height: 120, borderRadius: 14, background: "linear-gradient(135deg,#E8E9F5,#D3D6EA)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>Site photo</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 8 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>Risk register</div>
          {RISKS.map((r) => (
            <div key={r.name} style={{ padding: "12px 0", borderBottom: "1px solid #F6F7FA" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700 }}>{r.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 7px", textAlign: "center", background: lpill(r.likelihood).background, color: lpill(r.likelihood).color }}>{r.likelihood}</span>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 7px", textAlign: "center", background: lpill(r.impact).background, color: lpill(r.impact).color }}>{r.impact}</span>
              </div>
              <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 6, lineHeight: 1.5 }}>{r.mitigation}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "#9AA0AE" }}>{r.owner}</span>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: "#E5484D" }}>{r.effect} on handover</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CONSTRUCTION_MILES = MILES.map((m) => ({ ...m }));