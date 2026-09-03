import { useState } from "react";
import { AC } from "../../lib/format";

type Row = { ts: string; actor: string; role: string; action: string; object: string; field: string; before: string; after: string; sens?: boolean };
const ROWS: Row[] = [
  { ts: "03 Sep, 09:14", actor: "Khalid Al Fahim", role: "CEO", action: "Approved", object: "BLG III \u00b7 Discount request", field: "Discount %", before: "\u2014", after: "5%" },
  { ts: "03 Sep, 08:47", actor: "Sarah Mitchell", role: "Sales Dir", action: "Created", object: "BLG III \u00b7 Lead", field: "\u2014", before: "\u2014", after: "Rajesh Menon" },
  { ts: "02 Sep, 17:33", actor: "Ravi Kumar", role: "Finance Mgr", action: "Updated", object: "H21 \u00b7 Receipt RCP-H21-004789", field: "Status", before: "Unmatched", after: "Matched" },
  { ts: "02 Sep, 16:10", actor: "Ravi Kumar", role: "Finance Mgr", action: "Created", object: "DDR-0004", field: "\u2014", before: "\u2014", after: "Structure 60%" },
  { ts: "02 Sep, 14:52", actor: "Khalid Al Fahim", role: "CEO", action: "Approved", object: "WPK \u00b7 Phase 2 release", field: "\u2014", before: "\u2014", after: "12 units" },
  { ts: "01 Sep, 11:08", actor: "Sarah Mitchell", role: "Sales Dir", action: "Updated", object: "BLG III \u00b7 Price list", field: "Price/psf", before: "AED 2,140", after: "AED 2,200", sens: true },
  { ts: "01 Sep, 10:41", actor: "Omar Saeed", role: "Project Mgr", action: "Created", object: "BLG III \u00b7 Snag SNG-0412", field: "\u2014", before: "\u2014", after: "Paint crack" },
  { ts: "31 Aug, 16:22", actor: "Ravi Kumar", role: "Finance Mgr", action: "Exported", object: "Finance \u00b7 Statement", field: "\u2014", before: "\u2014", after: "47 rows CSV", sens: true },
  { ts: "31 Aug, 14:05", actor: "Khalid Al Fahim", role: "CEO", action: "Updated", object: "System \u00b7 User", field: "Status", before: "Active", after: "Suspended", sens: true },
  { ts: "30 Aug, 09:58", actor: "Sarah Mitchell", role: "Sales Dir", action: "Created", object: "BLG III \u00b7 Booking BK-9042", field: "\u2014", before: "\u2014", after: "Unit 0402" },
  { ts: "29 Aug, 15:30", actor: "Ravi Kumar", role: "Finance Mgr", action: "Updated", object: "Escrow \u00b7 Reconciliation", field: "Variance", before: "AED 14,200", after: "AED 0" },
  { ts: "28 Aug, 11:15", actor: "Omar Saeed", role: "Project Mgr", action: "Updated", object: "WPK \u00b7 Milestone", field: "Status", before: "Pending", after: "Certified" },
];

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

export default function AuditLogScreen() {
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("All");
  const [sensOnly, setSensOnly] = useState(false);
  const [notice, setNotice] = useState("");

  const filtered = ROWS.filter((r) => {
    if ((r.actor + r.action + r.object + r.field + r.before + r.after).toLowerCase().includes(search.toLowerCase()) === false) return false;
    if (project !== "All" && PROJECT(r.object) !== project) return false;
    if (sensOnly && !r.sens) return false;
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
  const cellGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "20px 130px 140px 100px 90px 1.4fr 90px 110px 110px", gap: 6, alignItems: "center", padding: "0 22px", height: 44, borderBottom: "1px solid #F6F7FA" };

  const actionClr = (a: string) => a === "Approved" ? "#1F9D6B" : a === "Created" ? AC : a === "Exported" ? "#F5A623" : "#6B7180";

  return (
    <div>
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Audit log</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>1,284,117 entries \u00b7 filter by actor, object, action, project or date</div>
        </div>
        <select value={project} onChange={(e) => setProject(e.target.value)} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", padding: "0 12px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: "#fff", color: "#4A5060" }}>
          {PROJECTS.map((p) => <option key={p} value={p}>{p === "All" ? "All projects" : p}</option>)}
        </select>
        <button onClick={() => setSensOnly((s) => !s)} style={{ height: 38, borderRadius: 12, border: "1px solid " + (sensOnly ? "#E5484D" : "#EDEEF3"), background: sensOnly ? "#FDECEC" : "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: sensOnly ? "#E5484D" : "#4A5060", cursor: "pointer" }}>{"\u26A0"} High sensitivity</button>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor, action, object\u2026" style={{ height: 38, width: 240, borderRadius: 12, border: "1px solid #EDEEF3", padding: "0 14px", fontSize: 12, fontWeight: 600, outline: "none", fontFamily: "inherit" }} />
        <button onClick={exportCsv} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Export CSV</button>
      </div>

      <div style={{ background: "#14161F", borderRadius: 12, padding: "13px 16px", fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 5, background: "#34C08A" }} />
        This log is append-only and cannot be edited or deleted by any role.
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.55)", fontWeight: 500 }}>Red markers are high-sensitivity actions: price change, status override, payment deletion, permission change, PII export.</span>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
        <div style={hdrStyle}>
          <span></span><span>Timestamp</span><span>Actor</span><span>Role</span><span>Action</span><span>Object</span><span>Field</span><span>Before</span><span>After</span>
        </div>
        {filtered.map((r, i) => (
          <div key={i} style={cellGrid}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: r.sens ? "#E5484D" : "transparent" }} />
            <span style={{ fontSize: 10.5, color: "#6B7180", fontWeight: 600, fontFamily: "monospace" }}>{r.ts}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.actor}</span>
            <span style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600 }}>{r.role}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: actionClr(r.action) }}>{r.action}</span>
            <span style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.object}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{r.field}</span>
            <span style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600 }}>{r.before}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#1F9D6B" }}>{r.after}</span>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#9AA0AE", fontWeight: 600 }}>No matching entries</div>}
      </div>
    </div>
  );
}
