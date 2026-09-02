import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useApi } from "../lib/useApi";
import Shell from "../components/Shell";
import ProjectsScreen from "../components/screens/Projects";
import FinancialsScreen from "../components/screens/Financials";
import CashflowScreen from "../components/screens/Cashflow";
import ReportsScreen from "../components/screens/Reports";
import { compact, AC } from "../lib/format";
import { PROJECTS } from "../lib/data";
import { screenUrl } from "../lib/nav";
import { SCR_TITLES } from "../lib/screens";
import { exportPortfolioPdf } from "../lib/pdf";

type DashData = {
  projects: {
    code: string;
    name: string;
    loc: string;
    units: number;
    sold: number;
    gdv: number;
    soldV: number;
    coll: number;
    cons: number;
    status: string;
    flag: boolean;
  }[];
};

type Target = { screen: string; group: "portfolio" | "project" | "sales" | "finance" | "handover" | "system" | "mobile" };

const KPIS: { label: string; value: string; delta: string; dir: "up" | "down" | "bad"; sub: string; target: Target }[] = [
  { label: "Gross development value", value: "AED 1.94B", delta: "+2.1%", dir: "up", sub: "5 projects", target: { screen: "dashboard", group: "portfolio" } },
  { label: "Total sold value", value: "AED 1.32B", delta: "+5.4%", dir: "up", sub: "68.1% of GDV", target: { screen: "dashboard", group: "portfolio" } },
  { label: "Collected to date", value: "AED 819.6M", delta: "+4.2%", dir: "up", sub: "62.0% of sold", target: { screen: "payments", group: "finance" } },
  { label: "Outstanding receivable", value: "AED 502.4M", delta: "−1.8%", dir: "down", sub: "across 471 buyers", target: { screen: "collections", group: "finance" } },
  { label: "Overdue", value: "AED 31.4M", delta: "+AED 2.1M", dir: "bad", sub: "31 instalments", target: { screen: "collections", group: "finance" } },
  { label: "Units available", value: "316 of 850", delta: "−27", dir: "down", sub: "AED 618M inventory", target: { screen: "inventory", group: "project" } },
];

const SPARKS = ["0,14 6,12 12,13 18,10 24,11 30,8 36,9 42,5 48,4 52,3", "0,15 6,13 12,14 18,11 24,9 30,10 36,7 42,6 48,4 52,2", "0,16 6,14 12,12 18,13 24,10 30,9 36,7 42,8 48,5 52,3", "0,5 6,7 12,6 18,9 24,8 30,10 36,9 42,12 48,11 52,13", "0,13 6,11 12,12 18,9 24,10 30,7 36,8 42,5 48,6 52,3", "0,4 6,6 12,5 18,8 24,7 30,9 36,10 42,12 48,13 52,15"];

const MB_LEGEND: [string, string][] = [["Collected", AC], ["Outstanding", "#B9B4FA"], ["Unsold", "#E7E9F0"]];
const DONUT_LEGEND: [string, string, string][] = [["Collected", "AED 819.6M", AC], ["Outstanding", "AED 471.0M", "#B9B4FA"], ["Overdue", "AED 31.4M", "#E5484D"]];
const AGEING: [string, number, number, number][] = [["Current", 439.6, 428, 18], ["1–30", 18.4, 21, 34], ["31–60", 7.1, 12, 52], ["61–90", 3.7, 8, 70], ["90+", 33.6, 31, 100]];

const FC: Record<string, [string, number][]> = {
  "7": [["Mon", 8.4], ["Tue", 12.1], ["Wed", 6.2], ["Thu", 14.8], ["Fri", 3.1], ["Sat", 1.2], ["Sun", 0.6]],
  "30": [["W1", 21.4], ["W2", 34.8], ["W3", 18.2], ["W4", 26.6]],
  "90": [["Mar", 96.4], ["Apr", 74.1], ["May", 112.8]],
  "180": [["Mar", 96.4], ["Apr", 74.1], ["May", 112.8], ["Jun", 88.2], ["Jul", 141.6], ["Aug", 67.4]],
};

const ATTENTION: { text: string; meta: string; value: string; tone: "red" | "amber"; target: Target }[] = [
  { text: "4 units overdue beyond 90 days", meta: "Belgravia Heights III", value: "AED 8.2M", tone: "red", target: { screen: "collections", group: "finance" } },
  { text: "Escrow variance unmatched", meta: "Ocean House · 12 items", value: "AED 340k", tone: "red", target: { screen: "escrow", group: "finance" } },
  { text: "12 SPAs unsigned beyond 21 days", meta: "Across 3 projects", value: "12", tone: "amber", target: { screen: "documents", group: "sales" } },
  { text: "3 Oqood registrations pending >14 days", meta: "Compliance", value: "3", tone: "red", target: { screen: "documents", group: "sales" } },
  { text: "Discount approval: H21-T1-0806 at 7.5%", meta: "Requested by R. Menon", value: "AED 168k", tone: "amber", target: { screen: "booking", group: "sales" } },
  { text: "6 buyer passports expiring within 60 days", meta: "Document radar", value: "6", tone: "amber", target: { screen: "buyer", group: "sales" } },
];

const VELOCITY = [{ label: "Absorption", value: "27 /mo" }, { label: "Stock left", value: "11.7 mo" }, { label: "Lead → booking", value: "34 days" }];
const VW = [14, 22, 18, 27, 31, 24, 19, 29, 35, 26, 33, 28];
const PERIODS = ["MTD", "QTD", "YTD", "Custom"];
const FC_TABS = ["7", "30", "90", "180"];

function Stub({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "64px 40px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", textAlign: "center", maxWidth: 560, margin: "60px auto" }}>
      <div style={{ width: 60, height: 60, borderRadius: 20, background: "#F3F4F8", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9AA0AE" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M3 10h18M9 10v10"></path></svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 8, lineHeight: 1.6 }}>Replicated in a later step of the reference order. It will be wired to real data when we reach it.</div>
      <button onClick={onBack} style={{ marginTop: 20, height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 18px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Back to dashboard</button>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const qs = router.query.s;
  const screen = typeof qs === "string" && SCR_TITLES[qs] ? qs : "dashboard";
  const scopeFromUrl = typeof router.query.scope === "string" ? router.query.scope : "ALL";
  const [period, setPeriod] = useState("YTD");
  const [fc, setFc] = useState("30");
  const [scope, setScope] = useState(scopeFromUrl);
  const { data } = useApi<DashData>("/api/dashboard");
  const [projects, setProjects] = useState<DashData["projects"]>([]);

  useEffect(() => {
    setScope(scopeFromUrl);
  }, [scopeFromUrl]);

  useEffect(() => {
    if (data && data.projects) setProjects(data.projects);
  }, [data]);

  const bars = FC[fc];
  const sum = bars.reduce((a, b) => a + b[1], 0);
  const mx = Math.max.apply(null, bars.map((b) => b[1]));

  const setScopeAndPush = (code: string) => {
    setScope(code);
    const q: Record<string, string> = { ...(router.query as Record<string, string>), s: screen };
    if (code === "ALL") delete q.scope;
    else q.scope = code;
    router.replace({ pathname: "/dashboard", query: q }, undefined, { shallow: true });
  };

  const go = (t: Target) => router.push(screenUrl(t.screen, t.group, scope));
  const openProject = (code: string) => router.push(screenUrl("inventory", "project", code));
  const activeProjects = projects.length ? projects : PROJECTS;
  const doExport = () =>
    exportPortfolioPdf(
      activeProjects,
      KPIS.map((k) => ({ label: k.label, value: k.value, note: k.sub }))
    );

  return (
    <Shell group="portfolio" active={screen} crumbs={["Portfolio", SCR_TITLES[screen] || "Dashboard"]} onScope={setScopeAndPush} scopeCode={scope}>
      {screen === "dashboard" ? (
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Portfolio position</div>
            <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>5 projects · 850 units · 25 Aug 2026</div>
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
          {KPIS.map((k, i) => {
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
                  <span style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 7px", background: hero ? "rgba(255,255,255,.2)" : bad ? "#FDECEC" : k.dir === "up" ? "#E9F8F1" : "#F1F2F7", color: hero ? "#fff" : bad ? "#E5484D" : k.dir === "up" ? "#1F9D6B" : "#6B7180" }}>{k.delta}</span>
                  <svg width="52" height="18" viewBox="0 0 52 18" fill="none" preserveAspectRatio="none"><polyline points={SPARKS[i]} stroke={hero ? "rgba(255,255,255,.6)" : bad ? "#E5484D" : "#C9CCD8"} strokeWidth="1.6" fill="none" strokeLinejoin="round" /></svg>
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
                {MB_LEGEND.map((l) => (
                  <span key={l[0]} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 600, color: "#6B7180" }}><span style={{ width: 8, height: 8, borderRadius: 3, background: l[1] }} />{l[0]}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(projects.length ? projects : PROJECTS).map((p) => {
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
                    <span style={{ width: 52, flex: "none", textAlign: "right", fontSize: 12, fontWeight: 800, color: AC, fontFamily: "'JetBrains Mono',monospace" }}>{Math.round((p.sold / p.units) * 100)}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Collection health</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
              <div style={{ position: "relative", width: 118, height: 118, flex: "none" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: "conic-gradient(" + AC + " 0 62%,#B9B4FA 62% 96%,#E5484D 96% 100%)", mask: "radial-gradient(circle,transparent 58%,#000 59%)", WebkitMask: "radial-gradient(circle,transparent 58%,#000 59%)" }} />
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em" }}>62%</div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>collected</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
                {DONUT_LEGEND.map((d) => (
                  <div key={d[0]} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 4, background: d[2] }} />
                    <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>{d[0]}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{d[1]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 18, borderTop: "1px solid #F1F2F7", paddingTop: 14, display: "flex", flexDirection: "column", gap: 3 }}>
              {AGEING.map((a) => (
                <button key={a[0]} onClick={() => go({ screen: "collections", group: "finance" })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", border: 0, background: "transparent", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ width: 58, flex: "none", fontSize: 11, fontWeight: 700, color: "#6B7180" }}>{a[0]}</span>
                  <span style={{ flex: 1, height: 7, borderRadius: 5, background: "#F1F2F7", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: Math.min(100, a[1] / 4.4) + "%", background: "rgba(229,72,77," + (0.18 + a[3] / 140).toFixed(3) + ")" }} />
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
              { label: "Confidence-adjusted", value: "AED " + (sum * 0.914).toFixed(1) + "M", note: "At 91.4% historical collection rate", c: "#14161F" },
              { label: "At risk", value: "AED " + (sum * 0.086).toFixed(1) + "M", note: "Broken promises and dunning ladder", c: "#E5484D" },
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
            {(projects.length ? projects : PROJECTS).map((p) => (
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
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#E5484D", background: "#FDECEC", borderRadius: 8, padding: "3px 8px" }}>9 open</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {ATTENTION.map((a) => (
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
              {VELOCITY.map((v) => (
                <div key={v.label} style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" }}>{v.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.025em", marginTop: 4 }}>{v.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 96, marginTop: 16 }}>
            {VW.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", gap: 6 }}>
                <span style={{ display: "block", width: "100%", maxWidth: 26, borderRadius: "7px 7px 3px 3px", background: i === VW.length - 1 ? AC : "#DCDAFB", height: (v / 35) * 100 + "%" }} />
                <span style={{ fontSize: 9.5, fontWeight: 600, color: "#C2C6D2" }}>W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      ) : screen === "projects" ? (
        <ProjectsScreen projects={projects} onSelect={openProject} />
      ) : screen === "financials" ? (
        <FinancialsScreen />
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