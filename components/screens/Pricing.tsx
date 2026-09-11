import { useEffect, useMemo, useState } from "react";
import { AC, money } from "../../lib/format";
import { fetchJSON } from "../../lib/api";

const BANDS = ["L1-10", "L11-20", "L21-30", "L31-40", "L41-45"];

const SEL_OPTIONS = [
  { label: "Unsold \u00b7 floors 38\u201345", filter: { kind: "unsold_floors", floors: [38, 39, 40, 41, 42, 43, 44, 45] } },
  { label: "Unsold \u00b7 all floors", filter: { kind: "unsold_all" } },
  { label: "2BR typology", filter: { kind: "type", type: "2BR" } },
  { label: "All units \u00b7 tower 1", filter: { kind: "tower", tower: "T1" } },
  { label: "3BR-A \u00b7 floors 31\u201340", filter: { kind: "type_floors", type: "3BR-A", floors: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] } },
];

const CHG_OPTIONS = [
  { label: "Increase by 3.0%", pct: 3 },
  { label: "Increase by 5.0%", pct: 5 },
  { label: "Decrease by 2.0%", pct: -2 },
  { label: "Flat hold", pct: 0 },
];

const pill = (s: string) =>
  s === "Live"
    ? { background: "#E9F8F1", color: "#1F9D6B" }
    : s === "Scheduled"
    ? { background: "#FDF4E5", color: "#B07B14" }
    : s === "applied"
    ? { background: "#E9F8F1", color: "#1F9D6B" }
    : s === "pending_approval"
    ? { background: "#FDF4E5", color: "#B07B14" }
    : { background: "#F1F2F6", color: "#6B7180" };

type InvRow = {
  id?: string | number | null;
  no?: string | number | null;
  type?: string | null;
  area?: string | number | null;
  status?: string | null;
  price?: string | number | null;
};

const UNSOLD = new Set(["available", "held", "blocked", "reserved"]);

function floorOf(no: string): number {
  const m = String(no || "").match(/(\d{4})$/);
  return m ? parseInt(m[1].slice(0, 2), 10) : 99;
}

function matchFilter(u: InvRow, f: any): boolean {
  const base = String(u.type || "").replace(/-.*/, "");
  switch (f?.kind) {
    case "unsold_floors":
      return UNSOLD.has(String(u.status)) && (f.floors || []).includes(floorOf(String(u.no)));
    case "unsold_all":
      return UNSOLD.has(String(u.status));
    case "type":
      return base === String(f.type || "").replace(/-.*/, "");
    case "tower": {
      const t = String(f.tower || "T1").replace(/^t/i, "T");
      return String(u.no).includes("-" + (t.startsWith("T") ? t : "T" + t) + "-");
    }
    case "type_floors":
      return base === String(f.type || "").replace(/-.*/, "") && (f.floors || []).includes(floorOf(String(u.no)));
    default:
      return true;
  }
}

export default function PricingScreen({ scope = "ALL" }: { scope?: string }) {
  const [sel, setSel] = useState(SEL_OPTIONS[0]);
  const [selOpen, setSelOpen] = useState(false);
  const [chg, setChg] = useState(CHG_OPTIONS[0]);
  const [chgOpen, setChgOpen] = useState(false);
  const [eff, setEff] = useState("");
  const [reason, setReason] = useState("Market adjustment");
  const [reasonOpen, setReasonOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState("");
  const [histOpen, setHistOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [matrix, setMatrix] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [leakage, setLeakage] = useState<number[]>([]);
  const [rows, setRows] = useState<InvRow[]>([]);
  const [projName, setProjName] = useState(scope && scope !== "ALL" ? scope : "All projects");
  const [live, setLive] = useState(false);

  const [phaseName, setPhaseName] = useState("");
  const [phaseDate, setPhaseDate] = useState("");
  const [phaseUnits, setPhaseUnits] = useState("0");
  const [phaseUplift, setPhaseUplift] = useState("0");

  const reload = () => {
    fetchJSON<any>("/api/pricing" + (scope && scope !== "ALL" ? "?project=" + encodeURIComponent(scope) : ""))
      .then((j) => {
        if (!j) return;
        if (Array.isArray(j.revisions)) setRevisions(j.revisions);
        if (Array.isArray(j.phases)) setPhases(j.phases);
      })
      .catch(() => {});
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchJSON<any>("/api/pricing" + (scope && scope !== "ALL" ? "?project=" + encodeURIComponent(scope) : "")),
      fetchJSON<{ units: InvRow[]; projects?: { code: string; name: string }[] }>("/api/inventory" + (scope && scope !== "ALL" ? "?project=" + encodeURIComponent(scope) : "")),
    ]).then(([p, inv]) => {
      if (!active) return;
      if (p.matrix) setMatrix(p.matrix);
      if (Array.isArray(p.revisions)) setRevisions(p.revisions);
      if (Array.isArray(p.phases)) setPhases(p.phases);
      if (Array.isArray(p.discounts)) setDiscounts(p.discounts);
      if (Array.isArray(p.leakage)) setLeakage(p.leakage);
      if (p.live) setLive(true);
      if (inv?.units) setRows(inv.units);
      const name = inv?.projects?.find((x) => x.code === scope)?.name;
      if (name) setProjName(name);
    }).catch(() => {});
    return () => { active = false; };
  }, [scope]);

  const previewRows = useMemo(() => {
    if (!rows.length) {
      return [
        { no: "H21-T1-3801", typ: "3BR", old: "AED 3,565,000", nw: "AED 3,672,000", d: "+3.0%", price: 3565000 },
        { no: "H21-T1-3802", typ: "1BR", old: "AED 1,595,000", nw: "AED 1,643,000", d: "+3.0%", price: 1595000 },
        { no: "H21-T1-3804", typ: "2BR", old: "AED 2,470,000", nw: "AED 2,544,000", d: "+3.0%", price: 2470000 },
        { no: "H21-T1-3901", typ: "2BR", old: "AED 2,675,000", nw: "AED 2,755,000", d: "+3.0%", price: 2675000 },
      ];
    }
    const m = rows.filter((r) => matchFilter(r, sel.filter)).slice(0, 4).map((r) => {
      const old = Number(r.price) || 0;
      const nw = Math.round(old * (1 + chg.pct / 100));
      return {
        no: String(r.no ?? r.id ?? ""),
        typ: String(r.type ?? ""),
        old: money(old),
        nw: money(nw),
        d: (chg.pct > 0 ? "+" : "") + chg.pct + "%",
        price: nw - old,
      };
    });
    return m;
  }, [rows, sel, chg]);

  const attachRows = useMemo(() => {
    if (!rows.length) return 42;
    return rows.filter((r) => matchFilter(r, sel.filter)).length;
  }, [rows, sel]);

  const gdvImpact = useMemo(() => previewRows.reduce((a, r) => a + r.price, 0), [previewRows]);

  const submit = async () => {
    if (!scope || scope === "ALL") { setNotice("Open a specific project to submit a revision"); setTimeout(() => setNotice(""), 4000); return; }
    setBusy(true);
    try {
      const j = await fetchJSON<any>("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", project: scope, pct: chg.pct, selection: sel.filter, effective: eff || "", reason }),
      });
      if (j.submitted) { setSubmitted(true); setNotice("Submitted for approval \u00b7 " + j.total + " units affected"); reload(); }
    } catch (e: any) {
      setNotice(e?.message || "Submit failed");
    } finally { setBusy(false); setTimeout(() => setNotice(""), 5000); }
  };

  const approve = async (id: number) => {
    setBusy(true);
    try {
      const j = await fetchJSON<any>("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", project: scope, id }),
      });
      if (j.applied) setNotice("Revision " + id + " applied to units");
      reload();
    } catch (e: any) {
      setNotice(e?.message || "Approve failed");
    } finally { setBusy(false); setTimeout(() => setNotice(""), 5000); }
  };

  const addPhase = async () => {
    if (!scope || scope === "ALL") { setNotice("Open a specific project to schedule a release"); setTimeout(() => setNotice(""), 4000); return; }
    if (!phaseName) { setNotice("Phase name required"); setTimeout(() => setNotice(""), 4000); return; }
    setBusy(true);
    try {
      const j = await fetchJSON<any>("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "phase", project: scope, name: phaseName, unit_count: phaseUnits, release_date: phaseDate || "", uplift_pct: phaseUplift }),
      });
      if (j.created) { setPhaseName(""); setPhaseUnits("0"); setPhaseUplift("0"); setPhaseDate(""); setNotice("Phase scheduled"); reload(); }
    } catch (e: any) {
      setNotice(e?.message || "Could not add phase");
    } finally { setBusy(false); setTimeout(() => setNotice(""), 5000); }
  };

  const versions = revisions.map((r, i) => (
    <div key={"r" + r.id} style={{ display: "grid", gridTemplateColumns: "90px 1.2fr 100px 1fr 96px", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F6F7FA" }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: AC }}>v{11 - i} \u00b7 R{r.id}</span>
      <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>Effective {r.effective}</span>
      <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 600 }}>{r.by}</span>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{r.reason}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", textAlign: "center", background: pill(r.status).background, color: pill(r.status).color }}>{r.status === "pending_approval" ? "Pending" : r.status === "applied" ? "Applied" : "Draft"}</span>
        {r.status === "pending_approval" && (
          <button onClick={() => approve(r.id)} disabled={busy} style={{ height: 26, borderRadius: 8, border: 0, background: AC, color: "#fff", padding: "0 10px", fontFamily: "inherit", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>Approve</button>
        )}
      </span>
    </div>
  ));

  const exportCsv = () => {
    const esc = (v: string) => {
      const s = /^[=+\-@]/.test(v) ? "'" + v : v;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const head = "Typology,Band,Rate (AED/sq.ft)";
    const body = (matrix.length ? matrix : []).flatMap((m: any) =>
      (m.cells || []).map((c: any) => [m.typ, c.band, c.psf].map(esc).join(","))
    );
    const csv = [head, ...body].join("\n");
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

  const dropSel = (o: typeof SEL_OPTIONS[number]) => { setSel(o); setSelOpen(false); };
  const dropChg = (o: typeof CHG_OPTIONS[number]) => { setChg(o); setChgOpen(false); };

  const box = (label: string, node: React.ReactNode) => (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
      {node}
    </div>
  );

  const dropdown = (open: boolean, current: string, children: React.ReactNode) => (
    <div style={{ position: "relative" }}>
      <div onClick={() => { setSelOpen(false); setChgOpen(false); setReasonOpen(false); }} style={{ height: 40, borderRadius: 12, border: "1px solid #E4E6EE", display: "flex", alignItems: "center", padding: "0 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{current}</div>
      {open && (
        <div style={{ position: "absolute", top: 44, left: 0, right: 0, zIndex: 10, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 12, boxShadow: "0 8px 24px rgba(20,22,31,.1)", padding: 6 }}>
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", rowGap: 12, alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Pricing &amp; availability</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>{projName} \u00b7 price ladder from live inventory{live ? "" : " \u00b7 demo"} </div>
        </div>
        <button onClick={() => setHistOpen(!histOpen)} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Version history</button>
        <button onClick={exportCsv} style={{ height: 38, borderRadius: 12, background: "#14161F", color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Export price list</button>
      </div>

      {notice && (
        <div style={{ background: notice.includes("permission") ? "#FDF4E5" : "#E9F8F1", color: notice.includes("permission") ? "#B07B14" : "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>
      )}

      {histOpen && (
        <div style={{ background: "#fff", borderRadius: 20, padding: "14px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Version history</div>
          {versions.length === 0 && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "8px 0" }}>No revisions yet \u2014 submit one from the bulk revision panel below.</div>}
          {versions}
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Price ladder \u00b7 AED per sq.ft</div>
            <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Typology \u00d7 floor band, computed from live unit prices. Darker means richer; sold count exposes where pricing is working.</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9AA0AE" }}>low</span>
          <span style={{ width: 110, height: 8, borderRadius: 5, background: "linear-gradient(90deg,#F0EFFE,#827CCE)" }}></span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9AA0AE" }}>high</span>
        </div>
        <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 8, paddingLeft: 104, marginBottom: 8 }}>
          {BANDS.map((b) => (
            <span key={b} style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{b}</span>
          ))}
        </div>
        {matrix.map((m) => (
          <div key={m.typ} style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 96, flex: "none", display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700 }}>{m.typ}</span>
            {BANDS.map((b, bi) => {
              const c = m.cells?.find((x: any) => x.band === b) || { psf: "\u2014", meta: "", bg: "#F1F2F6" };
              return (
                <div key={b} style={{ flex: 1, borderRadius: 13, padding: "13px 14px", background: c.bg || "#F1F2F6", color: "#14161F", minHeight: 62 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.02em" }}>{c.psf}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, marginTop: 5, color: "#14161F" }}>{c.meta || "\u00a0"}</div>
                </div>
              );
            })}
          </div>
        ))}
        {matrix.length === 0 && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "16px 0", textAlign: "center" }}>No units yet \u2014 generate inventory from the Unit Builder to compute a price ladder.</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Bulk price revision</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
            {box("Selection", dropdown(selOpen, sel.label, SEL_OPTIONS.map((o) => (
              <div key={o.label} onClick={(e) => { e.stopPropagation(); dropSel(o); }} style={{ padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: sel.label === o.label ? "#F0EFFE" : "transparent", color: sel.label === o.label ? AC : "#4A5060" }}>{o.label}</div>
            ))))}
            {box("Change", dropdown(chgOpen, chg.label, CHG_OPTIONS.map((o) => (
              <div key={o.label} onClick={(e) => { e.stopPropagation(); dropChg(o); }} style={{ padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: chg.label === o.label ? "#F0EFFE" : "transparent", color: chg.label === o.label ? AC : "#4A5060" }}>{o.label}</div>
            ))))}
            {box("Effective date", (
              <input type="date" value={eff} onChange={(e) => setEff(e.target.value)} style={{ height: 40, borderRadius: 12, border: "1px solid #E4E6EE", background: "#fff", padding: "0 13px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />
            ))}
            {box("Reason", dropdown(reasonOpen, reason, ["Market adjustment", "Phase launch", "Owner instruction", "Cost escalation", "Positioning"].map((o) => (
              <div key={o} onClick={(e) => { e.stopPropagation(); setReason(o); setReasonOpen(false); }} style={{ padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: reason === o ? "#F0EFFE" : "transparent", color: reason === o ? AC : "#4A5060" }}>{o}</div>
            ))))}
          </div>
          <div style={{ marginTop: 18, borderTop: "1px solid #F1F2F7", paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 10 }}>{"Preview \u00b7 " + previewRows.length + " of " + attachRows + " affected"}</div>
            {previewRows.map((r) => (
              <div key={String(r.no)} style={{ display: "grid", gridTemplateColumns: "110px 90px 1fr 1fr 62px", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600 }}>{r.no}</span>
                <span style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600 }}>{r.typ}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, color: "#9AA0AE", fontWeight: 600, textDecoration: "line-through" }}>{r.old}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{r.nw}</span>
                <span style={{ textAlign: "right", fontSize: 11, fontWeight: 800, color: chg.pct < 0 ? "#E5484D" : "#1F9D6B" }}>{r.d}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6B7180" }}>GDV impact {chg.pct < 0 ? "-" : "+"}{money(Math.abs(gdvImpact))}</span>
              {submitted ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#1F9D6B", background: "#E9F8F1", borderRadius: 8, padding: "8px 14px" }}>Submitted \u00b7 pending approval</span>
              ) : (
                <button onClick={submit} disabled={busy} style={{ height: 36, borderRadius: 11, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>{busy ? "Submitting\u2026" : "Submit for approval"}</button>
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
            {phases.map((p) => {
              const pl = pill(p.status);
              return (
                <div key={p.name + p.when} style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 1.1fr 68px 88px", gap: 10, alignItems: "center", padding: "0 22px", height: 44, borderBottom: "1px solid #F6F7FA" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{p.units}</span>
                  <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{p.when}</span>
                  <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{p.uplift}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", textAlign: "center", background: pl.background, color: pl.color }}>{p.status}</span>
                </div>
              );
            })}
            {phases.length === 0 && <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 600, padding: "14px 22px" }}>No phases yet \u2014 schedule the first release below.</div>}
            <div style={{ padding: "14px 22px", display: "grid", gridTemplateColumns: "1.2fr 1fr 70px 90px auto", gap: 10, alignItems: "center", borderTop: "1px solid #F1F2F7" }}>
              <input value={phaseName} onChange={(e) => setPhaseName(e.target.value)} placeholder="Phase name" style={{ height: 34, borderRadius: 10, border: "1px solid #E4E6EE", padding: "0 11px", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", outline: "none" }} />
              <input type="date" value={phaseDate} onChange={(e) => setPhaseDate(e.target.value)} style={{ height: 34, borderRadius: 10, border: "1px solid #E4E6EE", padding: "0 11px", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", outline: "none" }} />
              <input value={phaseUnits} onChange={(e) => setPhaseUnits(e.target.value)} placeholder="units" title="units" style={{ height: 34, borderRadius: 10, border: "1px solid #E4E6EE", padding: "0 11px", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", outline: "none", width: 70 }} />
              <input value={phaseUplift} onChange={(e) => setPhaseUplift(e.target.value)} placeholder="+%" title="uplift %" style={{ height: 34, borderRadius: 10, border: "1px solid #E4E6EE", padding: "0 11px", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", outline: "none", width: 90 }} />
              <button onClick={addPhase} disabled={busy} style={{ height: 34, borderRadius: 10, border: 0, background: "#14161F", color: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Add phase</button>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Discount governance</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", marginTop: 14 }}>
              {(discounts.length ? discounts : [{ role: "Sales agent", max_pct: 3 }, { role: "Sales manager", max_pct: 5 }, { role: "Sales director", max_pct: 8 }, { role: "Owner", max_pct: null }]).map((d) => (
                <div key={d.role} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: "1px solid #F6F7FA" }}>
                  <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500 }}>{d.role}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700 }}>{d.max_pct == null ? "Unlimited" : "0\u2013" + d.max_pct + "%"}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 18 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase" }}>Discount leakage \u00b7 % of list GDV</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#E5484D" }}>{leakage.length ? (leakage[leakage.length - 1] ?? 0).toFixed(1) + "% this month" : "\u2014 this month"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 76, marginTop: 12 }}>
              {(leakage.length ? leakage : []).map((v, i) => (
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