import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useApi } from "../lib/useApi";
import { api } from "../lib/client";

type Unit = {
  id: number; no: string; type: string; beds: number; area: string;
  view: string; status: string; price: string;
  project_code: string; project_name: string; buyer: string | null;
};
type Data = { units: Unit[]; summary: { status: string; n: number }[]; projects: { code: string; name: string }[] };

const STATUS_DOT: Record<string, string> = {
  available: "var(--green)", booked: "var(--primary)", reserved: "var(--amber)",
  held: "var(--amber)", blocked: "var(--red)", sold: "var(--red)",
};
const fmt = (n: string) => "AED " + Number(n || 0).toLocaleString("en-US");

export default function Inventory() {
  const router = useRouter();
  const { data, loading, error, reload } = useApi<Data>("/api/inventory");
  const [project, setProject] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => { reload(); }, [project, status, reload]);

  if (loading || !data) return <div className="loading">Loading inventory…</div>;
  if (error) return <div className="loading">Error: {error}</div>;

  const SORT = ["available", "reserved", "held", "blocked", "booked", "sold"];
  const ordered = [...data.summary].sort((a, b) => SORT.indexOf(a.status) - SORT.indexOf(b.status));
  const total = data.summary.reduce((s, r) => s + r.n, 0);

  return (
    <div className="dash">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Inventory · <span style={{ color: "var(--muted)", fontWeight: 600 }}>{total} units</span></h1>
        <button className="btn-primary" style={{ width: "auto", padding: "9px 16px" }} onClick={() => router.push("/dashboard")}>Dashboard</button>
      </div>

      <div className="toolbar">
        <select value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="all">All projects</option>
          {data.projects.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {SORT.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="status-tiles">
        <div className={"status-tile" + (status === "all" ? " active" : "")} onClick={() => setStatus("all")}>
          <div className="st-n">{total}</div><div className="st-l">All units</div>
        </div>
        {ordered.map((r) => (
          <div key={r.status} className={"status-tile" + (status === r.status ? " active" : "")} onClick={() => setStatus(r.status)}>
            <div className="st-n">{r.n}</div>
            <div className="st-l" style={{ color: STATUS_DOT[r.status] }}>{r.status}</div>
          </div>
        ))}
      </div>

      <div className="board">
        {data.units.map((u) => (
          <div key={u.id} className="unit-card">
            <div className="u-no">
              <span>{u.no}</span>
              <span className="dot" style={{ background: STATUS_DOT[u.status] || "var(--faint)" }} />
            </div>
            <div className="u-proj">{u.project_name}</div>
            <div className="u-meta">
              <span>{u.type} · {u.beds} bed</span>
              <span>{u.area} sqft</span>
            </div>
            <div className="u-price">{fmt(u.price)}</div>
            <div className="u-buyer">{u.status === "sold" && u.buyer ? "Buyer: " + u.buyer : u.status}</div>
          </div>
        ))}
      </div>

      {data.units.length === 0 && <div className="loading">No units match the current filter.</div>}
    </div>
  );
}