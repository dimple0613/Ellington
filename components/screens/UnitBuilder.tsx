import { useEffect, useMemo, useState } from "react";
import { AC, compact, money } from "../../lib/format";
import { fetchJSON } from "../../lib/api";

const TYPE_COLORS = ["#3B6EF6", "#827CCE", "#0EA5A4", "#D97706", "#DB2777", "#16A34A"];

type TypeRow = { type: string; beds: string; area: string; price: string };
type PreviewUnit = { no: string; floor: number; seq: number; type: string; beds: number; area: number; view: string; price: number };

function num(v: string): number {
  const x = parseFloat(v.replace(/,/g, "").trim() || "0");
  return isNaN(x) ? 0 : x;
}

const pad = (n: number, w: number) => String(n).padStart(w, "0");

function genPreview(code: string, tower: string, start: number, end: number, per: number, types: TypeRow[], uplift: number): PreviewUnit[] {
  const out: PreviewUnit[] = [];
  const base = code.toUpperCase();
  const sn = /^T/i.test(tower) ? tower : "T" + tower;
  const prefix = `${base}-${sn}-`;
  const VIEWS = ["Park", "Canal", "Skyline", "Creek"];
  let k = 0;
  for (let f = start; f <= end; f++) {
    for (let i = 0; i < per; i++) {
      const t = types[k % Math.max(1, types.length)];
      const upliftAmt = uplift > 0 ? f - start : 0;
      out.push({
        no: prefix + pad(f, 2) + pad(i + 1, 2),
        floor: f,
        seq: i + 1,
        type: t?.type || "2BR",
        beds: Math.max(0, Math.round(num(t?.beds)) || 1),
        area: Math.max(0, num(t?.area) || 700),
        view: VIEWS[k % VIEWS.length],
        price: Math.round((num(t?.price) || 0) * (1 + upliftAmt * (uplift / 100))),
      });
      k++;
    }
  }
  return out;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  const push = () => { cur.push(field); field = ""; };
  const pushRow = () => { push(); if (cur.some((c) => c.trim() !== "")) rows.push(cur); cur = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") push();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      if (cur.length || field !== "") pushRow();
    } else field += ch;
  }
  if (cur.length || field !== "") pushRow();
  return rows;
}

export default function UnitBuilderScreen({ scope = "ALL" }: { scope?: string }) {
  const [tab, setTab] = useState<"rules" | "csv">("rules");
  const [projs, setProjs] = useState<{ code: string; name: string }[]>([]);
  const [code, setCode] = useState(scope !== "ALL" ? scope : "");

  const [tower, setTower] = useState("T1");
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState("24");
  const [per, setPer] = useState("4");
  const [uplift, setUplift] = useState("0");
  const [types, setTypes] = useState<TypeRow[]>([
    { type: "1BR", beds: "1", area: "720", price: "950000" },
    { type: "2BR", beds: "2", area: "980", price: "1450000" },
  ]);

  const [preview, setPreview] = useState<PreviewUnit[]>([]);
  const [conflictCheck, setConflictCheck] = useState<{ total: number; conflicts: number; conflicting: string[] } | null>(null);
  const [syncNote, setSyncNote] = useState("");
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // csv
  const [csvText, setCsvText] = useState("");
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({ type: "type", price: "price", no: "", beds: "beds", area: "area", view: "view" });
  const [errs, setErrs] = useState<{ row: number; msg: string }[]>([]);
  const [validRows, setValidRows] = useState<number>(0);
  const [csvResult, setCsvResult] = useState<{ inserted: number; skipped: number } | null>(null);

  useEffect(() => {
    let active = true;
    fetchJSON<{ projects: { code: string; name: string }[] }>("/api/unit-builder")
      .then((j) => { if (active && Array.isArray(j.projects)) setProjs(j.projects); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const projName = projs.find((p) => p.code === code)?.name || (code ? code : "Select a project");

  useEffect(() => {
    if (!code) { setPreview([]); return; }
    const s = Math.max(1, Math.round(num(start) || 1));
    const e = Math.max(s, Math.round(num(end) || 24));
    const p = Math.max(1, Math.round(num(per) || 1));
    setPreview(genPreview(code, tower, s, e, p, types, num(uplift)));
  }, [code, tower, start, end, per, types, uplift]);

  const gdv = useMemo(() => preview.reduce((a, u) => a + u.price, 0), [preview]);
  const floors = useMemo(() => {
    const group = new Map<number, PreviewUnit[]>();
    preview.forEach((u) => { if (!group.has(u.floor)) group.set(u.floor, []); group.get(u.floor)!.push(u); });
    return Array.from(group.entries()).sort((a, b) => b[0] - a[0]);
  }, [preview]);

  const checkConflicts = async () => {
    if (!code) return;
    setBusy(true);
    setSyncNote("");
    try {
      const j = await fetchJSON<any>("/api/unit-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, mode: "rules", preview: true, tower, startFloor: start, endFloor: end, unitsPerFloor: per, types, uplift: num(uplift) }),
      });
      setConflictCheck({ total: j.total, conflicts: j.conflicts, conflicting: j.conflicting });
    } catch (e: any) {
      setSyncNote((e?.message || "Preview failed"));
    } finally { setBusy(false); }
  };

  const generate = async () => {
    if (!code) { setSyncNote("Select a project first"); return; }
    setBusy(true);
    setSyncNote("");
    try {
      const j = await fetchJSON<any>("/api/unit-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, mode: "rules", preview: false, tower, startFloor: start, endFloor: end, unitsPerFloor: per, types, uplift: num(uplift) }),
      });
      setResult({ inserted: j.inserted, skipped: j.skipped });
      setConflictCheck(null);
    } catch (e: any) {
      setSyncNote(e?.message || "Generate failed");
    } finally { setBusy(false); }
  };

  const headerIdx = csvRows.length ? csvRows[0] : [];
  const dataRows = csvRows.slice(1);
  const headerOptions = useMemo(() => {
    const known: [string, string][] = [
      ["no", "Unit no / code"],
      ["type", "Type / typology"],
      ["beds", "Beds"],
      ["area", "Area sq.ft"],
      ["view", "View"],
      ["price", "Price (AED)"],
    ];
    const idxByName = new Map<string, number>();
    headerIdx.forEach((h, i) => idxByName.set(String(h).trim().toLowerCase(), i));
    return known.map(([key, label]) => {
      const auto = ["no", "unit", "unit_no", "unitno", "unit id", "code"].includes(key) ? (idxByName.get(key) ?? idxByName.get("unit") ?? idxByName.get("unit_no")) : key !== "no" ? idxByName.get(key) : idxByName.get("no") ?? idxByName.get("unit") ?? idxByName.get("unit_no");
      return { key, label, col: auto != null ? auto : -1 };
    });
  }, [headerIdx]);

  useEffect(() => {
    if (!headerIdx.length) { setErrs([]); setValidRows(0); return; }
    const col = (key: string) => headerIdx.findIndex((h) => String(h).trim().toLowerCase() === key);
    const mm: Record<string, string> = {};
    (["type", "beds", "area", "view", "price", "no"]).forEach((k) => {
      const target = headerOptions.find((h) => h.key === k);
      mm[k] = target && target.col >= 0 ? String(target.col) : "";
    });
    setMapping(mm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvRows]);

  const runValidation = () => {
    if (!headerIdx.length) return;
    const idx = (k: string) => { const i = parseInt(mapping[k] || "-1", 10); return i >= 0 ? i : -1; };
    const errors: { row: number; msg: string }[] = [];
    let valid = 0;
    dataRows.forEach((r, i) => {
      const no = idx("no") >= 0 ? (r[idx("no")] || "").trim() : "";
      const type = idx("type") >= 0 ? (r[idx("type")] || "").trim() : "";
      const price = idx("price") >= 0 ? num(r[idx("price")]) : 0;
      if (!type) { errors.push({ row: i + 2, msg: "missing typology in mapped column" }); return; }
      if (price <= 0) { errors.push({ row: i + 2, msg: "price must be a positive number" }); return; }
      valid++;
    });
    setErrs(errors);
    setValidRows(valid);
  };

  useEffect(() => { if (csvRows.length > 1) runValidation(); }, [csvRows, mapping]);

  const importCsv = async () => {
    if (!code) { setSyncNote("Select a project first"); return; }
    const idx = (k: string) => { const i = parseInt(mapping[k] || "-1", 10); return i >= 0 ? i : -1; };
    const rows: any[] = [];
    dataRows.forEach((r, i) => {
      const type = idx("type") >= 0 ? (r[idx("type")] || "").trim() : "";
      const price = idx("price") >= 0 ? num(r[idx("price")]) : 0;
      if (!type || price <= 0) return;
      rows.push({
        no: idx("no") >= 0 ? (r[idx("no")] || "").trim() : "",
        type,
        beds: idx("beds") >= 0 && (r[idx("beds")] || "").trim() !== "" ? r[idx("beds")].trim() : null,
        area: idx("area") >= 0 && (r[idx("area")] || "").trim() !== "" ? r[idx("area")].trim() : null,
        view: idx("view") >= 0 ? (r[idx("view")] || "").trim() : null,
        price,
      });
    });
    if (!rows.length) { setSyncNote("No valid rows to import"); return; }
    setBusy(true);
    try {
      const j = await fetchJSON<any>("/api/unit-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, mode: "csv", preview: false, rows }),
      });
      setCsvResult({ inserted: j.inserted, skipped: j.skipped });
    } catch (e: any) {
      setSyncNote(e?.message || "Import failed");
    } finally { setBusy(false); }
  };

  const csvField = {
    box: { width: "100%", height: 40, borderRadius: 11, border: "1px solid #EDEEF3", background: "#FAFBFD", padding: "0 12px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, outline: "none", color: "#14161F" } as const,
    label: { fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" as const },
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Unit Builder</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Create hundreds of units in minutes — rules or CSV, with a live preview and a validation report.</div>
        </div>
        <select value={code} onChange={(e) => setCode(e.target.value)} style={csvField.box as React.CSSProperties}>
          <option value="">Select project…</option>
          {projs.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 13, padding: 4 }}>
          <button onClick={() => setTab("rules")} style={{ height: 32, border: 0, borderRadius: 9, padding: "0 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: tab === "rules" ? "#F0EFFE" : "transparent", color: tab === "rules" ? AC : "#6B7180" }}>Rule generator</button>
          <button onClick={() => setTab("csv")} style={{ height: 32, border: 0, borderRadius: 9, padding: "0 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: tab === "csv" ? "#F0EFFE" : "transparent", color: tab === "csv" ? AC : "#6B7180" }}>CSV import</button>
        </div>
      </div>

      {syncNote && <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{syncNote}</div>}
      {!code && (
        <div style={{ background: "#fff", borderRadius: 20, padding: "60px 24px", textAlign: "center", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Pick a project to start</div>
          <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 500, marginTop: 5 }}>Units are created inside an existing project code (name, code, towers come from its setup).</div>
        </div>
      )}

      {code && tab === "rules" && (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Generation rules</div>
            <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>{projName} · unit pattern {code.toUpperCase()}-{tower}-FF##</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <Field label="Tower" value={tower} onChange={setTower} box={csvField} />
              <Field label="Uplift % / floor" value={uplift} onChange={setUplift} box={csvField} />
              <Field label="First floor" value={start} onChange={setStart} box={csvField} />
              <Field label="Last floor" value={end} onChange={setEnd} box={csvField} />
              <Field label="Units / floor" value={per} onChange={setPer} box={csvField} span />
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase", marginTop: 18, marginBottom: 8 }}>Typology cycle</div>
            {types.map((t, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "64px 1fr 1fr 1fr 26px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                <input value={t.type} onChange={(e) => setTypes((a) => a.map((r, j) => j === i ? { ...r, type: e.target.value } : r))} placeholder="2BR" style={csvField.box} />
                <input value={t.beds} onChange={(e) => setTypes((a) => a.map((r, j) => j === i ? { ...r, beds: e.target.value } : r))} placeholder="beds" style={csvField.box} />
                <input value={t.area} onChange={(e) => setTypes((a) => a.map((r, j) => j === i ? { ...r, area: e.target.value } : r))} placeholder="area" style={csvField.box} />
                <input value={t.price} onChange={(e) => setTypes((a) => a.map((r, j) => j === i ? { ...r, price: e.target.value } : r))} placeholder="price" style={csvField.box} />
                <button onClick={() => setTypes((a) => a.filter((_, j) => j !== i))} style={{ width: 26, height: 26, borderRadius: 8, border: 0, background: "#FDECEC", color: "#E5484D", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>×</button>
              </div>
            ))}
            <button onClick={() => setTypes((a) => [...a, { type: "3BR", beds: "3", area: "1200", price: "2100000" }])} style={{ height: 32, borderRadius: 10, border: "1px dashed #D9DCE7", background: "#fff", padding: "0 12px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: AC, cursor: "pointer" }}>+ Add type</button>

            {result && (
              <div style={{ marginTop: 16, background: "#E9F8F1", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1F9D6B" }}>Created {result.inserted} unit{result.inserted === 1 ? "" : "s"}</div>
                <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 600, marginTop: 3 }}>{result.skipped} skipped as duplicates</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={checkConflicts} disabled={busy} style={{ height: 38, borderRadius: 11, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>{busy ? "Checking…" : "Check conflicts"}</button>
              <button onClick={generate} disabled={busy} style={{ height: 38, borderRadius: 11, border: 0, background: AC, color: "#fff", padding: "0 18px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", flex: 1 }}>{busy ? "Working…" : "Generate " + preview.length + " units"}</button>
            </div>

            {conflictCheck && (
              <div style={{ marginTop: 14, border: "1px solid " + (conflictCheck.conflicts ? "#F2D7C3" : "#CBE9DD"), background: conflictCheck.conflicts ? "#FEF6EF" : "#F2FBF6", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: conflictCheck.conflicts ? "#C0392B" : "#1F9D6B" }}>
                  {conflictCheck.conflicts ? conflictCheck.conflicts + " of " + conflictCheck.total + " already exist" : "No conflicts — all " + conflictCheck.total + " can be created"}
                </div>
                {conflictCheck.conflicting.length > 0 && (
                  <div style={{ fontSize: 10.5, color: "#6B7180", fontWeight: 600, marginTop: 5, fontFamily: "'JetBrains Mono',monospace" }}>{conflictCheck.conflicting.join(" · ")}</div>
                )}
              </div>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Live tower preview</span>
              <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500 }}>{floors.length} floors · {preview.length} units · {money(gdv)} at base prices</span>
            </div>
            <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginBottom: 14 }}>Floor {start}–{end} · {per} units per floor · typologies cycle by unit</div>
            <div style={{ maxHeight: 460, overflow: "auto", paddingRight: 6 }}>
              {floors.map(([f, units]) => (
                <div key={f} style={{ display: "grid", gridTemplateColumns: "46px 1fr", gap: 10, alignItems: "center", padding: "5px 0", borderBottom: "1px solid #F4F5F9" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#9AA0AE", fontFamily: "'JetBrains Mono',monospace" }}>L{f}</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {units.map((u) => (
                      <span key={u.no} title={u.no + " · " + u.type + " · " + money(u.price)} style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 7px", borderRadius: 7, fontSize: 9.5, fontWeight: 700, background: TYPE_COLORS[Math.max(0, types.findIndex((t) => t.type === u.type)) % TYPE_COLORS.length], color: "#fff" }}>
                        {u.seq}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {preview.length === 0 && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "20px 0", textAlign: "center" }}>No units match these rules</div>}
            </div>
          </div>
        </div>
      )}

      {code && tab === "csv" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Import from CSV</div>
            <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3, marginBottom: 14 }}>Columns: unit_no, type, beds, area, view, price — map headers to the fields below.</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, height: 38, borderRadius: 11, border: "1px solid #EDEEF3", background: "#FAFBFD", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: AC, cursor: "pointer" }}>
              {"\u2191"} Choose .csv file
              <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => { setCsvText(String(reader.result || "")); setCsvRows(parseCsv(String(reader.result || ""))); };
                reader.readAsText(f);
                e.target.value = "";
              }} />
            </label>
            <textarea value={csvText} onChange={(e) => { setCsvText(e.target.value); setCsvRows(parseCsv(e.target.value)); }} rows={7} placeholder={"unit_no,type,beds,area,view,price\nH21-T1-1201,1BR,1,720,Park,950000\nH21-T1-1202,2BR,2,980,Canal,1450000"}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 12, borderRadius: 12, border: "1px solid #E4E6EE", background: "#fff", padding: "12px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 500, outline: "none", resize: "vertical", color: "#14161F" }} />

            {headerIdx.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 8 }}>Column mapping</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[["type", "Type / typology"], ["beds", "Beds"], ["area", "Area sq.ft"], ["view", "View"], ["price", "Price (AED)"], ["no", "Unit no (optional)"]].map(([key, label]) => (
                    <label key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={csvField.label}>{label}</span>
                      <select value={mapping[key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))} style={csvField.box as React.CSSProperties}>
                        <option value="">— ignore —</option>
                        {headerIdx.map((h, i) => (
                          <option key={i} value={String(i)}>{h || "(col " + (i + 1) + ")"}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Validation report</span>
              <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500 }}>{dataRows.length} rows parsed</span>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1, borderRadius: 14, background: "#E9F8F1", color: "#1F9D6B", padding: "14px 16px" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{validRows}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1F9D6B" }}>ready to import</div>
              </div>
              <div style={{ flex: 1, borderRadius: 14, background: errs.length ? "#FDECEC" : "#F1F2F6", color: errs.length ? "#E5484D" : "#6B7180", padding: "14px 16px" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{errs.length}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: errs.length ? "#E5484D" : "#6B7180" }}>rows with errors</div>
              </div>
            </div>
            <div style={{ maxHeight: 200, overflow: "auto", marginTop: 12 }}>
              {errs.slice(0, 20).map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid #F6F7FA", fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#9AA0AE", flex: "none" }}>row {e.row}</span>
                  <span style={{ color: "#E5484D" }}>{e.msg}</span>
                </div>
              ))}
              {errs.length === 0 && dataRows.length > 0 && <div style={{ padding: "10px 0", fontSize: 11.5, color: "#1F9D6B", fontWeight: 700 }}>Every row mapped & verified — ready to import.</div>}
            </div>

            {csvResult && (
              <div style={{ marginTop: 14, background: "#E9F8F1", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1F9D6B" }}>Imported {csvResult.inserted} unit{csvResult.inserted === 1 ? "" : "s"}</div>
                <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 600, marginTop: 3 }}>{csvResult.skipped} skipped as duplicates</div>
              </div>
            )}

            <button onClick={importCsv} disabled={busy || validRows === 0} style={{ marginTop: 16, height: 40, borderRadius: 11, border: 0, background: validRows > 0 && !busy ? AC : "#C7CBD6", color: "#fff", padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: validRows > 0 && !busy ? "pointer" : "not-allowed", width: "100%" }}>
              {busy ? "Importing…" : "Import " + validRows + " units"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, box, span }: { label: string; value: string; onChange: (v: string) => void; box: { box: React.CSSProperties; label: React.CSSProperties }; span?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: span ? "1 / -1" : undefined }}>
      <span style={box.label}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={box.box} />
    </label>
  );
}