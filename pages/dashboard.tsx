import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { fetchJSON } from "../lib/api";
import Shell from "../components/Shell";
import ProjectsScreen from "../components/screens/Projects";
import FinancialsScreen from "../components/screens/Financials";
import CashflowScreen from "../components/screens/Cashflow";
import ReportsScreen from "../components/screens/Reports";
import { compact, AC } from "../lib/format";
import { screenUrl } from "../lib/nav";
import { SCR_TITLES } from "../lib/screens";
import { exportPortfolioPdf } from "../lib/pdf";
import { Stub } from "../components/app/Stub";

type Target = { screen: string; group: "portfolio" | "project" | "sales" | "finance" | "handover" | "system" | "mobile" };
type DashProject = {
  code: string; name: string; loc: string; units: number; sold: number;
  gdv: number; soldV: number; coll: number; cons: number; status: string; flag: boolean;
};
type Kpi = { label: string; value: string; chip: string; dir: "up" | "down" | "bad"; sub: string; target: Target; spark: string };
type AttRow = { text: string; meta: string; value: string; tone: "red" | "amber"; target: Target };
type DashData = {
  meta: { projects: number; units: number; date: string };
  projects: DashProject[];
  kpis: Kpi[];
  donut: { pct: number; stops: number[]; legend: [string, string, string][] };
  ageing: [string, number, number, number][];
  forecast: { bars: Record<string, [string, number][]> };
  attention: AttRow[];
  velocity: { stats: { label: string; value: string }[]; bars: number[] };
  collectionRate: number;
};

const PERIODS = ["MTD", "QTD", "YTD", "Custom"];
const FC_TABS = ["7", "30", "90", "180"];

const rnd = (n: number, d = 1) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
const spark = (vals: number[], pts = 6): string => {
  if (!vals.length) return "0,9 6,9 12,9 18,9 24,9 30,9";
  const mx = Math.max(...vals) || 1;
  const len = vals.length;
  const out: string[] = [];
  for (let i = 0; i < pts; i++) {
    const idx = Math.min(len - 1, Math.round((i / (pts - 1)) * (len - 1)));
    const v = vals[idx] / mx;
    out.push(i * 6 + "," + rnd(2 + (1 - v) * 13, 1));
  }
  return out.join(" ");
};

function fallbackDash(): DashData {
  const projects: DashProject[] = [];

  const kpis: Kpi[] = [
    { label: "Gross development value", value: compact(0), chip: "0% sold", dir: "up", sub: "0 projects", target: { screen: "dashboard", group: "portfolio" }, spark: spark([]) },
    { label: "Total sold value", value: compact(0), chip: "0% collected", dir: "up", sub: "0% of GDV", target: { screen: "dashboard", group: "portfolio" }, spark: spark([]) },
    { label: "Collected to date", value: compact(0), chip: "0M banked", dir: "up", sub: "0% of sold", target: { screen: "payments", group: "finance" }, spark: spark([]) },
    { label: "Outstanding receivable", value: compact(0), chip: "—", dir: "down", sub: "0% of sold", target: { screen: "collections", group: "finance" }, spark: spark([]) },
    { label: "Overdue", value: compact(0), chip: "—", dir: "bad", sub: "0% of outstanding", target: { screen: "collections", group: "finance" }, spark: spark([0, 0, 0, 0, 0, 0]) },
    { label: "Units available", value: "0 of 0", chip: "AED 0.0M inventory", dir: "down", sub: "0% sold through", target: { screen: "inventory", group: "project" }, spark: spark([]) },
  ];

  return {
    meta: { projects: 0, units: 0, date: "—" },
    projects,
    kpis,
    donut: {
      pct: 0,
      stops: [62, 96, 100],
      legend: [
        ["Collected", compact(0), AC],
        ["Outstanding", compact(0), "#B9B4FA"],
        ["Overdue", compact(0), "#E5484D"],
      ] as [string, string, string][],
    },
    ageing: [
      ["Current", 0, 0, 0],
      ["1–30", 0, 0, 0],
      ["31–60", 0, 0, 0],
      ["61–90", 0, 0, 0],
      ["90+", 0, 0, 0],
    ] as [string, number, number, number][],
    forecast: {
      bars: {
        "7": [],
        "30": [],
        "90": [],
        "180": [],
      },
    },
    attention: [],
    velocity: {
      stats: [
        { label: "Absorption", value: "0 /mo" },
        { label: "Stock left", value: "0 mo" },
        { label: "Bookings (90d)", value: "0" },
      ],
      bars: [],
    },
    collectionRate: 0,
  };
}

export default function Dashboard() {
  const router = useRouter();
  const qs = router.query.s;
  const screen = typeof qs === "string" && SCR_TITLES[qs] ? qs : "dashboard";
  const scopeFromUrl = typeof router.query.scope === "string" ? router.query.scope : "ALL";
  const [period, setPeriod] = useState("YTD");
  const [fc, setFc] = useState("30");
  const [scope, setScope] = useState(scopeFromUrl);
  const [data, setData] = useState<DashData>(() => fallbackDash());

  useEffect(() => {
    setScope(scopeFromUrl);
  }, [scopeFromUrl]);

  useEffect(() => {
    let active = true;
    fetchJSON<DashData>("/api/dashboard")
      .then((j) => { if (active && j.projects) setData(j); })
      .catch(() => { /* keep fallbackDash */ });
    return () => { active = false; };
  }, []);

  const activeProjects = data.projects;
  const bars = data.forecast.bars[fc] || [];
  const sum = bars.reduce((a, b) => a + b[1], 0);
  const mx = Math.max.apply(null, bars.map((b) => b[1]).concat(0.001));
  const vm = Math.max(...data.velocity.bars, 1);

  const setScopeAndPush = (code: string) => {
    setScope(code);
    const q: Record<string, string> = { ...(router.query as Record<string, string>), s: screen };
    if (code === "ALL") delete q.scope;
    else q.scope = code;
    router.replace({ pathname: "/dashboard", query: q }, undefined, { shallow: true });
  };

  const go = (t: Target) => router.push(screenUrl(t.screen, t.group, scope));
  const openProject = (code: string) => router.push(screenUrl("inventory", "project", code));
  const doExport = () =>
    exportPortfolioPdf(
      activeProjects,
      data.kpis.map((k) => ({ label: k.label, value: k.value, note: k.sub }))
    );

  return (
    <Shell group="portfolio" active={screen} crumbs={["Portfolio", SCR_TITLES[screen] || "Dashboard"]} onScope={setScopeAndPush} scopeCode={scope}>
      {screen === "dashboard" ? (
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Portfolio position</div>
            <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>{data.meta.projects} projects · {data.meta.units} units · {data.meta.date}</div>
          </div>
          <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 12, padding: 4 }}>
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)} style={{ height: 30, border: 0, borderRadius: 9, padding: "0 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, background: period === p ? "#F0EFFE" : "transparent", color: period === p ? AC : "#9AA0AE" }}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={doExport} style={{ height: 38, borderRadius: 12, background: "#14161F", color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" /></svg>
            Export PDF
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14 }}>
          {data.kpis.map((k, i) => {
            const hero = i === 0;
            const bad = k.dir === "bad";
            return (
              <button key={k.label} onClick={() => go(k.target)} style={{
                textAlign: "left", border: 0, cursor: "pointer", borderRadius: 20, padding: "18px 18px 16px", fontFamily: "inherit", transition: "transform 140ms ease-out", boxShadow: "0 1px 3px rgba(20,22,31,.04)", background: hero ? AC : "#fff",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.35, color: hero ? "rgba(255,255,255,.78)" : "#6B7180" }}>{k.label}</div>
                  <div style={{ width: 26, height: 26, flex: "none", borderRadius: 9, display: "grid", placeItems: "center", background: hero ? "#fff" : "#F3F4F8", color: hero ? AC : "#6B7180" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
                  </div>
                </div>
                <div style={{ fontSize: k.value.length > 12 ? 19 : 21, fontWeight: 800, letterSpacing: "-.035em", marginTop: 14, color: hero ? "#fff" : bad ? "#E5484D" : "#14161F" }}>{k.value}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 7px", background: hero ? "rgba(255,255,255,.2)" : bad ? "#FDECEC" : k.dir === "up" ? "#E9F8F1" : "#F1F2F7", color: hero ? "#fff" : bad ? "#E5484D" : k.dir === "up" ? "#1F9D6B" : "#6B7180" }}>{k.chip}</span>
                  <svg width="52" height="18" viewBox="0 0 52 18" fill="none" preserveAspectRatio="none"><polyline points={k.spark} stroke={hero ? "rgba(255,255,255,.6)" : bad ? "#E5484D" : "#C9CCD8"} strokeWidth="1.6" fill="none" strokeLinejoin="round" /></svg>
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 500, marginTop: 10, color: hero ? "rgba(255,255,255,.7)" : "#9AA0AE" }}>{k.sub}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Value position by project</div>
              <div style={{ display: "flex", gap: 14 }}>
                {data.donut.legend.map((l) => (
                  <span key={l[0]} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 600, color: "#6B7180" }}><span style={{ width: 8, height: 8, borderRadius: 3, background: l[2] }} />{l[0]}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activeProjects.map((p) => {
                const collected = p.soldV * (p.coll / 100);
                const outstanding = p.soldV - collected;
                const unsold = p.gdv - p.soldV;
                const segs: [number, string, string][] = [[collected, AC, "Collected"], [outstanding, "#B9B4FA", "Outstanding"], [unsold, "#E7E9F0", "Unsold"]];
                return (
                  <button key={p.code} onClick={() => openProject(p.code)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 6px", border: 0, background: "transparent", borderBottom: "1px solid #F1F2F7", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, padding: "4px 6px", borderRadius: 7, background: "#EDECFE", color: AC }}>{p.code}</span>
                    <span style={{ width: 152, flex: "none" }}>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, letterSpacing: "-.01em" }}>{p.name}</span>
                      <span style={{ display: "block", fontSize: 10.5, color: "#9AA0AE", fontWeight: 500, marginTop: 1 }}>{p.loc}</span>
                    </span>
                    <span style={{ flex: 1, display: "flex", height: 26, borderRadius: 8, overflow: "hidden", background: "#F1F2F7" }}>
                      {segs.map((g) => (
                        <span key={g[2]} title={g[2] + " " + compact(g[0])} style={{ display: "block", height: "100%", width: ((g[0] / p.gdv) * 100).toFixed(2) + "%", background: g[1] as string }} />
                      ))}
                    </span>
                    <span style={{ width: 88, flex: "none", textAlign: "right", fontSize: 12, fontWeight: 700 }}>{compact(p.gdv)}</span>
                    <span style={{ width: 52, flex: "none", textAlign: "right", fontSize: 12, fontWeight: 800, color: AC, fontFamily: "'JetBrains Mono',monospace" }}>{Math.round((p.sold / (p.units || 1)) * 100)}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Collection health</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
              <div style={{ position: "relative", width: 118, height: 118, flex: "none" }}>
                {(() => {
                  const s0 = data.donut.stops[0] || 0;
                  const s1 = data.donut.stops[1] || 100;
                  return (
                    <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: `conic-gradient(${AC} 0 ${s0}%,#B9B4FA ${s0}% ${s1}%,#E5484D ${s1}% 100%)`, mask: "radial-gradient(circle,transparent 58%,#000 59%)", WebkitMask: "radial-gradient(circle,transparent 58%,#000 59%)" }} />
                  );
                })()}
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em" }}>{data.donut.pct}%</div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>collected</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
                {data.donut.legend.map((d) => (
                  <div key={d[0]} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 4, background: d[2] }} />
                    <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>{d[0]}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{d[1]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 18, borderTop: "1px solid #F1F2F7", paddingTop: 14, display: "flex", flexDirection: "column", gap: 3 }}>
              {data.ageing.map((a) => (
                <button key={a[0]} onClick={() => go({ screen: "collections", group: "finance" })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", border: 0, background: "transparent", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ width: 58, flex: "none", fontSize: 11, fontWeight: 700, color: "#6B7180" }}>{a[0]}</span>
                  <span style={{ flex: 1, height: 7, borderRadius: 5, background: "#F1F2F7", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: Math.min(100, a[3]) + "%", background: "rgba(229,72,77," + (0.18 + a[3] / 140).toFixed(3) + ")" }} />
                  </span>
                  <span style={{ width: 78, flex: "none", textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{compact(a[1])}</span>
                  <span style={{ width: 56, flex: "none", textAlign: "right", fontSize: 10.5, fontWeight: 600, color: "#9AA0AE" }}>{a[2]} buyers</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Cashflow forecast</div>
              <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Expected collections · dotted line is the same window last period</div>
            </div>
            <div style={{ display: "flex", gap: 4, background: "#F5F6FA", borderRadius: 12, padding: 4 }}>
              {FC_TABS.map((f) => (
                <button key={f} onClick={() => setFc(f)} style={{ height: 30, border: 0, borderRadius: 9, padding: "0 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, background: fc === f ? "#fff" : "transparent", color: fc === f ? "#14161F" : "#9AA0AE", boxShadow: fc === f ? "0 1px 3px rgba(20,22,31,.10)" : "none" }}>
                  {f + (f === "180" ? " days" : "d")}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 184, paddingBottom: 2 }}>
            {bars.map((b) => (
              <div key={b[0]} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7180" }}>{"AED " + b[1].toFixed(1) + "M"}</span>
                <span style={{ display: "block", width: "100%", maxWidth: 64, borderRadius: "10px 10px 4px 4px", background: AC, height: (b[1] / mx) * 100 + "%" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#9AA0AE" }}>{b[0]}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 20, borderTop: "1px solid #F1F2F7", paddingTop: 18 }}>
            {[
              { label: "Expected", value: "AED " + sum.toFixed(1) + "M", note: "Scheduled instalments in window", c: "#14161F" },
              { label: "Confidence-adjusted", value: "AED " + (sum * data.collectionRate).toFixed(1) + "M", note: data.collectionRate > 0 ? "At " + rnd(data.collectionRate * 100, 1) + "% historical collection rate" : "—", c: "#14161F" },
              { label: "At risk", value: data.collectionRate > 0 ? "AED " + (sum * (1 - data.collectionRate)).toFixed(1) + "M" : "—", note: "Broken promises and dunning ladder", c: "#E5484D" },
            ].map((x) => (
              <div key={x.label}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" }}>{x.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 6, color: x.c }}>{x.value}</div>
                <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 3 }}>{x.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 14px", fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Projects</div>
            <div style={{ display: "grid", gridTemplateColumns: "44px 1.5fr 74px 74px 78px 62px 62px 92px", gap: 10, padding: "0 24px 9px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #F1F2F7" }}>
              <span /><span>Project</span><span style={{ textAlign: "right" }}>Units</span><span style={{ textAlign: "right" }}>GDV</span><span style={{ textAlign: "right" }}>Sold</span><span style={{ textAlign: "right" }}>Coll</span><span style={{ textAlign: "right" }}>Cons</span><span>Status</span>
            </div>
            {activeProjects.map((p) => (
              <button key={p.code} onClick={() => openProject(p.code)} style={{ width: "100%", display: "grid", gridTemplateColumns: "44px 1.5fr 74px 74px 78px 62px 62px 92px", gap: 10, alignItems: "center", padding: "12px 24px", border: 0, background: "transparent", borderBottom: "1px solid #F6F7FA", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, padding: "4px 5px", borderRadius: 7, background: "#EDECFE", color: AC, textAlign: "center" }}>{p.code}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "#9AA0AE", fontWeight: 500 }}>{p.loc}</span>
                </span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{p.sold}/{p.units}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{compact(p.gdv)}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{compact(p.soldV)}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>{p.coll}%</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>{p.cons}%</span>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "4px 8px", textAlign: "center", whiteSpace: "nowrap", background: p.cons === 100 ? "#E4F6F6" : p.cons < 10 ? "#E9F8F1" : "#EDECFE", color: p.cons === 100 ? "#0B8A8A" : p.cons < 10 ? "#1F9D6B" : AC }}>{p.status}</span>
              </button>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Requires attention</div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#E5484D", background: "#FDECEC", borderRadius: 8, padding: "3px 8px" }}>{data.attention.length} open</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.attention.map((a) => (
                <button key={a.text} onClick={() => go(a.target)} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 4px", border: 0, background: "transparent", borderBottom: "1px solid #F6F7FA", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 5, marginTop: 5, flex: "none", background: a.tone === "red" ? "#E5484D" : "#E2A33C" }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: "#14161F" }}>{a.text}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: "#9AA0AE", fontWeight: 600, marginTop: 3 }}>{a.meta}</span>
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap", color: a.tone === "red" ? "#E5484D" : "#14161F" }}>{a.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Sales velocity</div>
              <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Units booked per week · last 12 weeks</div>
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              {data.velocity.stats.map((v) => (
                <div key={v.label} style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" }}>{v.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.025em", marginTop: 4 }}>{v.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 96, marginTop: 16 }}>
            {data.velocity.bars.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", gap: 6 }}>
                <span style={{ display: "block", width: "100%", maxWidth: 26, borderRadius: "7px 7px 3px 3px", background: i === data.velocity.bars.length - 1 ? AC : "#DCDAFB", height: (v / vm) * 100 + "%" }} />
                <span style={{ fontSize: 9.5, fontWeight: 600, color: "#C2C6D2" }}>W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      ) : screen === "projects" ? (
        <ProjectsScreen projects={activeProjects} onSelect={openProject} />
      ) : screen === "financials" ? (
        <FinancialsScreen projects={activeProjects} />
      ) : screen === "cashflow" ? (
        <CashflowScreen />
      ) : screen === "reports" ? (
        <ReportsScreen />
      ) : (
        <Stub title={SCR_TITLES[screen] || "Module"} onBack={() => router.push("/dashboard")} />
      )}
    </Shell>
  );
}

export const getServerSideProps = async () => ({ props: {} });