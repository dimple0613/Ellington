import { useEffect, useMemo, useState } from "react";
import { AC, MONTHS_ABBR } from "../../lib/format";
import { fetchJSON } from "../../lib/api";

const PHOTOS: string[] = [];

const TEAM: [string, string][] = [
  ["Main contractor", "ALEC Engineering"],
  ["Consultant", "WSP Middle East"],
  ["Project manager", "Currie & Brown"],
];

const RISKS: { name: string; likelihood: string; impact: string; mitigation: string; owner: string; effect: string }[] = [];

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

type CMilestone = {
  id: number;
  project: string;
  milestone: string;
  planned: string;
  forecast: string;
  actual: string;
  status: string;
  weight: number;
  planned_pct: number;
  actual_pct: number;
  trigger_amt: number;
  trigger_buyers: number;
};

type MileView = {
  id?: number;
  name: string;
  planned: string;
  forecast: string;
  actual: string;
  variance: string;
  status: "Certified" | "Pending" | "Forecast";
  triggers: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtDate = (d: string) => {
  if (!d) return "\u2014";
  const [y, mo, dd] = d.split("-");
  const m = MONTHS[Number(mo) - 1];
  return m ? dd + " " + m + " " + String(y).slice(2) : d;
};

const dayDiff = (a: string, b: string) =>
  Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);

const aedCompact = (n: number) =>
  n >= 1000000
    ? "AED " + (n / 1000000).toFixed(1) + "M"
    : "AED " + Math.round(n).toLocaleString("en-US");

const toMileView = (m: CMilestone): MileView => {
  const base = m.actual || m.forecast;
  let variance = "On track";
  if (base && m.planned) {
    const d = dayDiff(base, m.planned);
    variance = d === 0 ? "0 d" : (d > 0 ? "+" : "\u2212") + Math.abs(d) + " d";
  }
  const status: MileView["status"] =
    m.status === "certified" ? "Certified" : m.status === "pending" ? "Pending" : "Forecast";
  return {
    id: m.id,
    name: m.milestone,
    planned: fmtDate(m.planned),
    forecast: fmtDate(m.forecast),
    actual: fmtDate(m.actual),
    variance,
    status,
    triggers: aedCompact(m.trigger_amt) + " \u00b7 " + m.trigger_buyers + " buyers",
  };
};

export default function ConstructionScreen({ scope = "ALL" }: { scope?: string }) {
  const [certified, setCertified] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [photoDates, setPhotoDates] = useState(PHOTOS);
  const [rows, setRows] = useState<CMilestone[]>([]);
  const [meta, setMeta] = useState<{ projects: { code: string; name: string }[] } | null>(null);

  const projName = meta?.projects?.find((p) => p.code === scope)?.name
    || (scope && scope !== "ALL" ? scope : "All projects");

  useEffect(() => {
    let active = true;
    fetchJSON<{ milestones: CMilestone[] }>(
      "/api/construction" + (scope && scope !== "ALL" ? "?project=" + encodeURIComponent(scope) : "")
    )
      .then((j) => {
        if (active && Array.isArray(j.milestones)) setRows(j.milestones);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [scope]);

  useEffect(() => {
    let active = true;
    fetchJSON<{ projects?: { code: string; name: string }[] }>("/api/inventory")
      .then((j) => {
        if (active && Array.isArray(j.projects)) setMeta({ projects: j.projects });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const live = rows.length > 0;

  const miles: MileView[] = useMemo(
    () => (live ? rows.map(toMileView) : []),
    [rows, live]
  );

  const pkgs = useMemo(
    () =>
      live
        ? rows.map((m) => ({ name: m.milestone, weight: m.weight, planned: m.planned_pct, actual: m.actual_pct }))
        : ([] as { name: string; weight: number; planned: number; actual: number }[]),
    [rows, live]
  );

  const totalW = rows.reduce((a, m) => a + m.weight, 0) || 1;
  const ovActual = rows.reduce((a, m) => a + m.weight * m.actual_pct, 0) / totalW;
  const ovPlanned = rows.reduce((a, m) => a + m.weight * m.planned_pct, 0) / totalW;
  const pctActual = live ? ovActual : 0;
  const pctPlanned = live ? ovPlanned : 0;

  const certIdx = () => {
    if (!live) return -1;
    const i = miles.findIndex((m) => m.status === "Pending");
    return i >= 0 ? i : -1;
  };

  const cert = (i: number) => {
    const m = miles[i];
    if (!m || m.status !== "Pending") return;
    const id = rows[i].id;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "certified", actual: r.forecast, actual_pct: r.planned_pct } : r)));
    setCertified(true);
    fetchJSON("/api/construction", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Construction progress</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>{projName} \u00b7 ALEC Engineering \u00b7 certified by WSP Middle East</div>
        </div>
        <button onClick={() => { const now = new Date(); setUploaded(true); setPhotoDates([String(now.getDate()).padStart(2, "0") + " " + MONTHS_ABBR[now.getMonth()] + " " + String(now.getFullYear()), ...photoDates]); }} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Upload photo set</button>
        <button onClick={() => { const i = certIdx(); if (i >= 0) cert(i); }} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Certify milestone</button>
      </div>

      {certified && (
        <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Milestone certified \u00b7 payment notices generated for the released milestone
        </div>
      )}
      {uploaded && (
        <div style={{ background: "#F0EFFE", color: AC, borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Photo set uploaded \u00b7 queued for review \u00b7 visible to buyers once approved
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        <div style={{ background: "#14161F", borderRadius: 20, padding: 24, color: "#fff" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.55)", textTransform: "uppercase" }}>Overall completion</div>
          <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-.045em", lineHeight: 1, marginTop: 14 }}>{pctActual.toFixed(1)}%</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.66)", marginTop: 8 }}>Planned {pctPlanned.toFixed(1)}% \u00b7 {(pctPlanned - pctActual).toFixed(1)} points behind</div>
          <div style={{ height: 10, borderRadius: 6, background: "rgba(255,255,255,.14)", marginTop: 20, overflow: "hidden", position: "relative" }}>
            <span style={{ display: "block", height: "100%", width: pctActual.toFixed(1) + "%", background: "#E2A33C" }}></span>
            <span style={{ position: "absolute", top: -3, bottom: -3, left: pctPlanned.toFixed(1) + "%", width: 2, background: "#fff" }}></span>
          </div>
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", flexDirection: "column", gap: 12 }}>
            {TEAM.map((t) => (
              <div key={t[0]} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.55)" }}>{t[0]}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: "right" }}>{t[1]}</span>
              </div>
            ))}
          </div>
          {live ? (
            <div style={{ marginTop: 22, background: "rgba(226,163,60,.16)", borderRadius: 14, padding: "14px 15px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: "#E2A33C", textTransform: "uppercase" }}>Handover forecast</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 7 }}>From live project schedule</div>
            </div>
          ) : (
            <div style={{ marginTop: 22, background: "rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 15px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: "rgba(255,255,255,.55)", textTransform: "uppercase" }}>Handover forecast</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 7, color: "rgba(255,255,255,.66)" }}>Awaiting live data</div>
            </div>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 4 }}>Work packages</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500 }}>Black tick marks the planned position at today's date</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 60px 1fr 68px 74px", gap: 12, padding: "14px 0 9px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3" }}>
            <span>Package</span><span style={{ textAlign: "right" }}>Weight</span><span>Actual vs planned</span><span style={{ textAlign: "right" }}>Actual</span><span style={{ textAlign: "right" }}>Variance</span>
          </div>
          {pkgs.map((p) => {
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
        {miles.map((m) => {
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
            {photoDates.length ? (
              photoDates.map((d) => (
                <div key={d} style={{ width: 180, flex: "none" }}>
                  <div style={{ height: 120, borderRadius: 14, background: "linear-gradient(135deg,#E8E9F5,#D3D6EA)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>Site photo</div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 8 }}>{d}</div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9AA0AE", padding: "24px 0" }}>No photo sets uploaded yet</div>
            )}
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>Risk register</div>
          {RISKS.length ? (
            RISKS.map((r) => (
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
          ))
          ) : (
            <div style={{ fontSize: 12, fontWeight: 600, color: "#9AA0AE", padding: "4px 0" }}>No live risks recorded</div>
          )}
        </div>
      </div>
    </div>
  );
}