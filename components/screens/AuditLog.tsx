import { useEffect, useState } from "react";
import { AC } from "../../lib/format";
import { fetchJSON } from "../../lib/api";

const fmtTs = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || "";
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return dd + " " + mon[d.getMonth()] + ", " + hh + ":" + mm;
};

type Row = { ts: string; raw: string; actor: string; role: string; action: string; object: string; field: string; before: string; after: string; sens?: boolean };

const PROJECT = (o: string): string => {
  if (o.startsWith("BLG III")) return "BLG III";
  if (o.startsWith("WPK")) return "WPK";
  if (o.startsWith("H21")) return "H21";
  if (o.startsWith("Finance") || o.startsWith("DDR")) return "Finance";
  if (o.startsWith("Escrow")) return "Escrow";
  if (o.startsWith("System")) return "System";
  return "Other";
};

const PROJECTS = ["All", "BLG III", "WPK", "H21", "Finance", "Escrow", "System"];

const ctrlStyle: React.CSSProperties = { height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 12px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", color: "#4A5060" };

export default function AuditLogScreen() {
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("All");
  const [sensOnly, setSensOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actor, setActor] = useState("All");
  const [action, setAction] = useState("All");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let active = true;
    fetchJSON<{ audit: { ts: string; actor: string; role: string; action: string; object: string; field: string; before_val: string; after_val: string; sensitive: boolean }[] }>("/api/system")
      .then((j) => {
        if (!active || !Array.isArray(j.audit)) return;
        const mapped: Row[] = j.audit.map((a) => ({
          ts: fmtTs(a.ts),
          raw: a.ts,
          actor: a.actor || "",
          role: a.role || "",
          action: a.action || "",
          object: a.object || "",
          field: a.field || "\u2014",
          before: a.before_val || "\u2014",
          after: a.after_val || "\u2014",
          sens: !!a.sensitive,
        }));
        if (mapped.length) setRows(mapped);
      })
      .catch((e) => {
        if (active) setApiError(e?.message || "Failed to load audit log");
      });
    return () => { active = false; };
  }, []);

  const actorList = ["All", ...Array.from(new Set(rows.map((r) => r.actor).filter(Boolean)))];
  const actionList = ["All", ...Array.from(new Set(rows.map((r) => r.action).filter(Boolean)))];

  const filtered = rows.filter((r) => {
    if ((r.actor + r.action + r.object + r.field + r.before + r.after).toLowerCase().includes(search.toLowerCase()) === false) return false;
    if (project !== "All" && PROJECT(r.object) !== project) return false;
    if (sensOnly && !r.sens) return false;
    if (actor !== "All" && r.actor !== actor) return false;
    if (action !== "All" && r.action !== action) return false;
    const t = r.raw ? new Date(r.raw).getTime() : null;
    if (t !== null) {
      if (dateFrom && t < new Date(dateFrom + "T00:00:00").getTime()) return false;
      if (dateTo && t > new Date(dateTo + "T23:59:59").getTime()) return false;
    }
    return true;
  });

  const exportCsv = () => {
    const hdr = "Timestamp,Actor,Role,Action,Object,Field,Before,After";
    const csv = filtered.map((r) =>
      [r.ts, r.actor, r.role, r.action, r.object, r.field, r.before, r.after].map((c) => '"' + c.replace(/"/g, '""') + '"').join(",")
    ).join("\n");
    const blob = new Blob([hdr + "\n" + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "audit-log.csv"; a.click();
    URL.revokeObjectURL(url);
    setNotice("CSV exported \u00b7 " + filtered.length + " rows");
    setTimeout(() => setNotice(""), 3000);
  };

  const hdrStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "20px 130px 140px 100px 90px 1.4fr 90px 110px 110px", gap: 6, padding: "13px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" as const, background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" };
  const cellGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "20px 130px 140px 100px 90px 1.4fr 90px 110px 110px", gap: 6, alignItems: "center", padding: "0 22px", height: 44, borderBottom: "1px solid #F6F7FA", cursor: "pointer" };

  const actionClr = (a: string) => a === "Approved" ? "#1F9D6B" : a === "Created" ? AC : a === "Exported" ? "#F5A623" : "#6B7180";

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — audit trail stays empty until data loads
        </div>
      )}
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Audit log</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>{rows.length} entries \u00b7 filter by actor, object, action, project or date</div>
        </div>
        <select value={project} onChange={(e) => setProject(e.target.value)} style={ctrlStyle}>
          {PROJECTS.map((p) => <option key={p} value={p}>{p === "All" ? "All projects" : p}</option>)}
        </select>
        <select value={actor} onChange={(e) => setActor(e.target.value)} style={{ ...ctrlStyle, maxWidth: 150 }}>
          {actorList.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)} style={{ ...ctrlStyle, maxWidth: 130 }}>
          {actionList.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" style={{ ...ctrlStyle, padding: "0 10px" }} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" style={{ ...ctrlStyle, padding: "0 10px" }} />
        <button onClick={() => setSensOnly((s) => !s)} style={{ height: 38, borderRadius: 12, border: "1px solid " + (sensOnly ? "#E5484D" : "#EDEEF3"), background: sensOnly ? "#FDECEC" : "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: sensOnly ? "#E5484D" : "#4A5060", cursor: "pointer" }}>{"\u26A0"} High sensitivity</button>
        <button onClick={exportCsv} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Export CSV</button>
      </div>

      <div style={{ background: "#14161F", borderRadius: 12, padding: "13px 16px", fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 5, background: "#34C08A" }} />
        This log is append-only and cannot be edited or deleted by any role.
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.55)", fontWeight: 500 }}>Click a row to expand the before/after diff. Red markers are high-sensitivity actions: price change, status override, payment deletion, permission change, PII export.</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor, action, object\u2026" style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", padding: "0 14px", fontSize: 12, fontWeight: 600, outline: "none", fontFamily: "inherit", width: "100%" }} />
        <button onClick={() => { setProject("All"); setActor("All"); setAction("All"); setSensOnly(false); setDateFrom(""); setDateTo(""); setSearch(""); setExpanded(null); }} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Clear filters</button>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
        <div style={hdrStyle}>
          <span></span><span>Timestamp</span><span>Actor</span><span>Role</span><span>Action</span><span>Object</span><span>Field</span><span>Before</span><span>After</span>
        </div>
        {filtered.map((r, i) => {
          const open = expanded === i;
          return (
            <div key={i}>
              <div style={cellGrid} onClick={() => setExpanded(open ? null : i)}>
                {r.sens
                  ? <span style={{ width: 8, height: 8, borderRadius: 4, background: "#E5484D" }} />
                  : <span style={{ width: 8, height: 8, borderRadius: 4, background: "transparent" }} />}
                <span style={{ fontSize: 10.5, color: "#6B7180", fontWeight: 600, fontFamily: "monospace" }}>{r.ts}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.actor}</span>
                <span style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600 }}>{r.role}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: actionClr(r.action) }}>{r.action}</span>
                <span style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.object}</span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{r.field}</span>
                <span style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600 }}>{r.before}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#1F9D6B" }}>{r.after}<span style={{ color: "#C2C6D2", marginLeft: 8 }}>{open ? "\u25BE" : "\u25B8"}</span></span>
              </div>
              {open && (
                <div style={{ margin: "0 22px 12px", border: "1px solid #EDEEF3", borderRadius: 12, background: "#FAFBFD", padding: "14px 16px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 8 }}>
                    Field diff {r.field !== "\u2014" ? "\u00b7 " + r.field : ""} — {r.action} on {r.object}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'JetBrains Mono',monospace" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "8px 12px", borderRadius: 9, border: "1px solid #FDECEC", background: "#FDECEC", color: "#E5484D", minWidth: 140 }}>{r.before}</span>
                    <span style={{ color: "#9AA0AE", fontWeight: 700 }}>{"\u2192"}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "8px 12px", borderRadius: 9, border: "1px solid #E9F8F1", background: "#E9F8F1", color: "#1F9D6B", minWidth: 140 }}>{r.after}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, color: "#C2C6D2", fontWeight: 600 }}>{r.actor} · {r.role}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#9AA0AE", fontWeight: 600 }}>No matching entries</div>}
      </div>
    </div>
  );
}