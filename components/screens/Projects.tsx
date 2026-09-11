import { useEffect, useState } from "react";
import { AC, compact } from "../../lib/format";
import ProjectWizard, { CreatedProject } from "../app/ProjectWizard";

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

  useEffect(() => {
    setList(projects);
  }, [projects]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const totalUnits = list.reduce((a, p) => a + p.units, 0);
  const totalGdv = list.reduce((a, p) => a + p.gdv, 0);

  const ordered = [...list].sort((a, b) =>
    sort ? b.sold / b.units - a.sold / a.units : a.gdv - b.gdv
  );

  const created = (p: CreatedProject) => {
    const card: ProjectCard = {
      code: p.code,
      name: p.name,
      loc: p.location,
      units: p.units,
      sold: 0,
      gdv: p.gdv,
      soldV: 0,
      coll: 0,
      cons: 0,
      status: "Launched",
      flag: true,
    };
    setList((prev) => [...prev.filter((c) => c.code !== p.code), card]);
    setOpen(false);
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", rowGap: 12, alignItems: "flex-end", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
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
        <ProjectWizard
          open={open}
          onClose={() => setOpen(false)}
          onCreated={created}
        />
      )}
    </div>
  );
}