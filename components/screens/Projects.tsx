import { useEffect, useState } from "react";
import { AC, compact } from "../../lib/format";

export type ProjectCard = {
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
};

const pillStyle = (cons: number): { background: string; color: string } =>
  cons === 100
    ? { background: "#E4F6F6", color: "#0B8A8A" }
    : cons < 10
    ? { background: "#E9F8F1", color: "#1F9D6B" }
    : { background: "#EDECFE", color: AC };

export default function ProjectsScreen({
  projects,
  onSelect,
}: {
  projects: ProjectCard[];
  onSelect?: (code: string) => void;
}) {
  const [list, setList] = useState<ProjectCard[]>(projects);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState(false);
  const [form, setForm] = useState({ name: "", loc: "", units: "0", gdv: "0", price: "0" });
  const [err, setErr] = useState("");

  useEffect(() => {
    setList(projects);
  }, [projects]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setErr(""); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const totalUnits = list.reduce((a, p) => a + p.units, 0);
  const totalGdv = list.reduce((a, p) => a + p.gdv, 0);

  const ordered = [...list].sort((a, b) =>
    sort ? b.sold / b.units - a.sold / a.units : a.gdv - b.gdv
  );

  const submit = () => {
    const name = form.name.trim();
    const loc = form.loc.trim();
    const units = parseInt(form.units, 10);
    const gdv = parseFloat(form.gdv);
    const price = parseFloat(form.price);
    if (!name || !loc) { setErr("Project name and location are required."); return; }
    if (!units || units < 1) { setErr("Units must be at least 1."); return; }
    if (isNaN(gdv) || gdv < 0) { setErr("Enter a valid GDV (AED M)."); return; }
    const code = name.replace(/\s+/g, "")
      .split(/(?=[A-Z])/)
      .map((c) => c[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() || "NEW";
    const card: ProjectCard = {
      code,
      name,
      loc,
      units,
      sold: 0,
      gdv,
      soldV: 0,
      coll: 0,
      cons: 0,
      status: "Launched",
      flag: true,
    };
    setList((prev) => [...prev, card]);
    setOpen(false);
    setForm({ name: "", loc: "", units: "0", gdv: "0", price: "0" });
    setErr("");
  };

  const field = (key: keyof typeof form, label: string, type = "text", ph = "") => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{label}</span>
      <input
        type={type}
        value={form[key]}
        placeholder={ph}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        style={{ height: 38, borderRadius: 10, border: "1px solid #EDEEF3", background: "#FAFBFD", padding: "0 12px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, outline: "none" }}
      />
    </label>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Projects</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>
            {list.length} projects · {totalUnits.toLocaleString("en-US")} units · {compact(totalGdv)} gross development value
          </div>
        </div>
        <button
          onClick={() => setSort((v) => !v)}
          style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: sort ? "#F0EFFE" : "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: sort ? AC : "#4A5060", cursor: "pointer" }}
        >
          Sort: {sort ? "GDV" : "sell-through"}
        </button>
        <button
          onClick={() => setOpen(true)}
          style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
        >
          + New project
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {ordered.map((p) => {
          const pct = Math.round((p.sold / p.units) * 100);
          const pill = pillStyle(p.cons);
          return (
            <button
              key={p.code}
              onClick={() => onSelect && onSelect(p.code)}
              style={{ textAlign: "left", border: 0, background: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
            >
              <div style={{ height: 132, background: "linear-gradient(135deg,#E8E9F5,#D3D6EA)", position: "relative" }}>
                <span style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 7, alignItems: "center" }}>
                  <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 10, fontWeight: 700, padding: "4px 7px", borderRadius: 8, background: "#EDECFE", color: AC }}>{p.code}</span>
                  {p.flag && <span style={{ width: 8, height: 8, borderRadius: 5, background: "#E5484D" }} />}
                </span>
                <span style={{ position: "absolute", top: 14, right: 14, fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "4px 9px", whiteSpace: "nowrap", background: pill.background, color: pill.color }}>{p.status}</span>
              </div>
              <div style={{ padding: "18px 20px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>{p.loc}</div>
                    <div style={{ fontSize: 12, color: "#6B7180", fontWeight: 600, marginTop: 10 }}>
                      {p.sold} of {p.units} sold
                    </div>
                  </div>
                  <div style={{ position: "relative", width: 64, height: 64, flex: "none" }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: "conic-gradient(" + AC + " 0 " + pct + "%,#E7E9F0 " + pct + "% 100%)", mask: "radial-gradient(circle,transparent 66%,#000 67%)", WebkitMask: "radial-gradient(circle,transparent 66%,#000 67%)" }} />
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800, letterSpacing: "-.03em" }}>{pct}%</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 14, borderTop: "1px solid #F1F2F7" }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" }}>GDV</div>
                    <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.02em", marginTop: 4 }}>{compact(p.gdv)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" }}>Sold</div>
                    <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.02em", marginTop: 4 }}>{compact(p.soldV)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "#9AA0AE", letterSpacing: ".05em", textTransform: "uppercase" }}>
                    <span>Collected</span>
                    <span>Construction {p.cons}%</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
                    <span style={{ flex: 1, height: 7, borderRadius: 5, background: "#F1F2F7", overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: p.coll + "%", background: AC }} />
                    </span>
                    <span style={{ flex: 1, height: 7, borderRadius: 5, background: "#F1F2F7", overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: p.cons + "%", background: "#34C08A" }} />
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {open && (
        <div onMouseDown={() => { setOpen(false); setErr(""); }} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.42)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "26px 28px", width: "100%", maxWidth: 520, boxShadow: "0 24px 60px rgba(20,22,31,.25)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>New project</div>
            <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>Create a new development. It will appear alongside the live portfolio.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              <div style={{ display: "flex", gap: 12 }}>{field("name", "Project name", "text", "e.g. Belgravia Heights IV")}</div>
              <div>{field("loc", "Location", "text", "e.g. Dubai Hills Estate")}</div>
              <div style={{ display: "flex", gap: 12 }}>
                {field("units", "Units", "number", "e.g. 120")}
                {field("gdv", "GDV (AED M)", "number", "e.g. 240")}
              </div>
              <div>{field("price", "Avg price / sqft (AED, optional)", "number", "e.g. 1,550")}</div>
              {err && <div style={{ fontSize: 11.5, fontWeight: 600, color: "#E5484D" }}>{err}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button
                onClick={() => { setOpen(false); setErr(""); }}
                style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}
              >Cancel</button>
              <button
                onClick={submit}
                style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
              >Create project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}