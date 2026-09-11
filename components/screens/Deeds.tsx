import { useEffect, useState } from "react";
import { AC } from "../../lib/format";
import { exportOaData, exportHandoverCert } from "../../lib/pdf";
import { fetchJSON } from "../../lib/api";
import { PanelSkeleton } from "../Loading";

type DeedRow = { unit: string; buyer: string; oqood: string; dld: string; deed: string; issued: string; keys: string; oa: string };

const DEED_PILL: Record<string, { bg: string; color: string }> = { Issued: { bg: "#E9F8F1", color: "#1F9D6B" }, Applied: { bg: "#FDF4E5", color: "#B07B14" }, Blocked: { bg: "#FDECEC", color: "#E5484D" } };
const KEYS_PILL: Record<string, { bg: string; color: string }> = { Released: { bg: "#E4F6F6", color: "#0B8A8A" }, Held: { bg: "#F1F2F6", color: "#6B7180" } };
const OA_PILL: Record<string, { bg: string; color: string }> = { Registered: { bg: "#E9F8F1", color: "#1F9D6B" }, Pending: { bg: "#F1F2F6", color: "#6B7180" } };

const MOLLAK: [string, string][] = [];

const pill = (v: string, map: Record<string, { bg: string; color: string }>) => {
  const s = map[v] || { bg: "#F1F2F6", color: "#6B7180" };
  return { display: "inline-block", fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px", background: s.bg, color: s.color };
};

export default function DeedsScreen({ scope }: { scope?: string }) {
  const [notice, setNotice] = useState("");
  const [certOpen, setCertOpen] = useState(false);
  const [certUnit, setCertUnit] = useState("");
  const [rows, setRows] = useState<DeedRow[]>([]);
  const [apiError, setApiError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setRows([]);
    const proj = scope && scope !== "ALL" ? "?project=" + encodeURIComponent(scope) : "";
    fetchJSON<{ deeds: { unit_no: string; buyer: string; oqood: string; dld: string; deed: string; issued: string; keys: string; oa: string }[] }>("/api/handover" + proj)
      .then((j) => {
        if (active) setLoaded(true);
        if (!active || !Array.isArray(j.deeds)) return;
        const mapped: DeedRow[] = j.deeds.map((d) => ({
          unit: d.unit_no || "",
          buyer: d.buyer || "",
          oqood: d.oqood || "—",
          dld: d.dld || "—",
          deed: d.deed || "Applied",
          issued: d.issued || "—",
          keys: d.keys || "Held",
          oa: d.oa || "Pending",
        }));
        if (mapped.length) setRows(mapped);
      })
      .catch((e) => {
        if (active) { setLoaded(true); setApiError(e?.message || "Failed to load deeds"); }
      });
    return () => { active = false; };
  }, [scope]);

  const banner = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 3000); };

  const doExport = () => {
    exportOaData(rows);
    banner("OA data exported \u00b7 " + rows.length + " rows \u00b7 CSV");
  };

  const doIssue = () => {
    if (!rows.length) return;
    const row = rows.find((r) => r.unit === certUnit) || rows[0];
    exportHandoverCert(row.unit, row.buyer, row.oqood, row.dld);
    setCertOpen(false);
    banner("Certificate issued \u00b7 " + row.unit + " \u00b7 " + row.buyer);
  };

  if (!loaded) {
    return (
      <div>
        <PanelSkeleton headerW={200} rows={6} cols={7} />
      </div>
    );
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — rows stay empty until data loads
        </div>
      )}
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", rowGap: 12, alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Title deeds &amp; owners association</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Deed issuance, key release, warranty pack and the Mollak service charge handoff</div>
        </div>
        <button onClick={doExport} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Export OA data</button>
        <button onClick={() => setCertOpen(true)} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Issue handover certificate</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "110px 1.2fr 96px 104px 88px 92px 88px 96px", minWidth: 860, gap: 8, padding: "13px 20px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
            <span>Unit</span><span>Owner</span><span>Oqood</span><span style={{ textAlign: "right" }}>DLD 4%</span><span>Deed</span><span>Issued</span><span>Keys</span><span>Mollak</span>
          </div>
          {rows.map((r) => (
            <div key={r.unit} style={{ display: "grid", gridTemplateColumns: "110px 1.2fr 96px 104px 88px 92px 88px 96px", minWidth: 860, gap: 8, alignItems: "center", padding: "0 20px", height: 48, borderBottom: "1px solid #F6F7FA" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600 }}>{r.unit}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.buyer}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#6B7180" }}>{r.oqood}</span>
              <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{r.dld}</span>
              <span style={pill(r.deed, DEED_PILL)}>{r.deed}</span>
              <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{r.issued}</span>
              <span style={pill(r.keys, KEYS_PILL)}>{r.keys}</span>
              <span style={pill(r.oa, OA_PILL)}>{r.oa}</span>
            </div>
          ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Service charge &amp; warranty</div>
            <div style={{ marginTop: 12 }}>
              {MOLLAK.length ? (
                MOLLAK.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #F6F7FA" }}>
                    <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{k}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: "right", color: "#14161F" }}>{v}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, fontWeight: 600, color: "#9AA0AE", padding: "4px 0" }}>Service charge details appear once units reach handover.</div>
              )}
            </div>
          </div>

          <div style={{ background: "#E4F6F6", borderRadius: 20, padding: "18px 20px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#0B8A8A", textTransform: "uppercase" }}>Handover completion</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.04em", color: "#0B8A8A", marginTop: 10 }}>{rows.length ? (rows.filter((r) => r.keys === "Released").length) + " of " + rows.length : "\u2014"}</div>
            <div style={{ fontSize: 12, color: "#0B8A8A", fontWeight: 600, marginTop: 5, lineHeight: 1.5 }}>{rows.length ? (rows.filter((r) => r.keys === "Released").length + " keys released \u00b7 " + rows.filter((r) => r.deed === "Blocked").length + " blocked \u00b7 computed from the live deed register.") : "Computed live once deeds load."}</div>
          </div>
        </div>
      </div>

      {certOpen && (
        <div onMouseDown={() => setCertOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.42)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "26px 28px", width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(20,22,31,.25)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>Issue handover certificate</div>
            <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>Select a unit to issue the owner's handover certificate, key release record and warranty pack.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Unit</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {rows.map((r) => (
                    <span key={r.unit} onClick={() => setCertUnit(r.unit)} style={{ fontSize: 11.5, fontWeight: 700, padding: "7px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "monospace", background: certUnit === r.unit ? AC : "#F1F2F6", color: certUnit === r.unit ? "#fff" : "#4A5060" }}>{r.unit}</span>
                  ))}
                </div>
              </div>
              <div style={{ background: "#FAFBFD", borderRadius: 12, padding: "12px 14px", fontSize: 11.5, color: "#4A5060", fontWeight: 600, lineHeight: 1.6 }}>
                {rows.length ? (rows.find((r) => r.unit === certUnit) || rows[0]).buyer : "No units loaded yet"}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setCertOpen(false)} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Cancel</button>
              <button onClick={doIssue} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Issue certificate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
