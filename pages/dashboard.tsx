import { useRouter } from "next/router";
import { useApi } from "../lib/useApi";
import { api } from "../lib/client";

type DashData = {
  units: number;
  portfolio: number;
  dashboard_kpi: { portfolio_confirmed: number; received_actual: number };
  units_by_status: { status: string; n: number }[];
  needs_review: { project: string; unit: string; buyer: string; lead_days: string }[];
};

const fmt = (n: number) =>
  "AED " + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function Dashboard() {
  const router = useRouter();
  const { data, loading, error } = useApi<DashData>("/api/dashboard");

  if (loading || !data) return <div className="loading">Loading dashboard…</div>;
  if (error) return <div className="loading">Error: {error}</div>;

  return (
    <div className="dash">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1>Portfolio</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" style={{ width: "auto", padding: "9px 16px", background: "var(--text)" }} onClick={() => router.push("/inventory")}>
            Inventory
          </button>
          <button className="btn-primary" style={{ width: "auto", padding: "9px 16px" }} onClick={() => api("/api/auth/logout", { method: "POST" }).then(() => router.push("/login"))}>
            Sign out
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="k">Portfolio value</div><div className="v">{fmt(data.portfolio)}</div></div>
        <div className="kpi"><div className="k">Units</div><div className="v">{data.units}</div></div>
        <div className="kpi"><div className="k">Confirmed sales</div><div className="v">{fmt(data.dashboard_kpi.portfolio_confirmed)}</div></div>
        <div className="kpi needs"><div className="k">Received actual</div><div className="v">{fmt(data.dashboard_kpi.received_actual)}</div></div>
      </div>

      <div className="card">
        <h2>Units by status</h2>
        {data.units_by_status.length === 0 && (
          <div className="loading">No units yet — run npm run db:setup</div>
        )}
        {data.units_by_status.map((u) => (
          <div key={u.status} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <span>{u.status}</span>
            <strong>{u.n}</strong>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Needs review</h2>
        {data.needs_review.length === 0 && <div className="loading">All clear</div>}
        {data.needs_review.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <span>{r.project} · {r.unit} · <strong>{r.buyer}</strong></span>
            <span className="pill pill-amber">{r.lead_days || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}