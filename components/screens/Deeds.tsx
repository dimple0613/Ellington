import { useState } from "react";
import { AC } from "../../lib/format";
import { exportOaData, exportHandoverCert } from "../../lib/pdf";

type DeedRow = { unit: string; buyer: string; oqood: string; dld: string; deed: string; issued: string; keys: string; oa: string };

const DEED_PILL: Record<string, { bg: string; color: string }> = { Issued: { bg: "#E9F8F1", color: "#1F9D6B" }, Applied: { bg: "#FDF4E5", color: "#B07B14" }, Blocked: { bg: "#FDECEC", color: "#E5484D" } };
const KEYS_PILL: Record<string, { bg: string; color: string }> = { Released: { bg: "#E4F6F6", color: "#0B8A8A" }, Held: { bg: "#F1F2F6", color: "#6B7180" } };
const OA_PILL: Record<string, { bg: string; color: string }> = { Registered: { bg: "#E9F8F1", color: "#1F9D6B" }, Pending: { bg: "#F1F2F6", color: "#6B7180" } };

const ROWS: DeedRow[] = [
  { unit: "WPK-T1-0402", buyer: "Nadia Khoury", oqood: "OQD-3312", dld: "AED 118,000", deed: "Issued", issued: "04 Aug 26", keys: "Released", oa: "Registered" },
  { unit: "WPK-T1-0405", buyer: "Mariam Haddad", oqood: "OQD-3318", dld: "AED 124,400", deed: "Issued", issued: "08 Aug 26", keys: "Released", oa: "Registered" },
  { unit: "WPK-T1-0607", buyer: "Omar Al Suwaidi", oqood: "OQD-3341", dld: "AED 96,800", deed: "Applied", issued: "\u2014", keys: "Held", oa: "Pending" },
  { unit: "WPK-T1-0703", buyer: "Elena Petrova", oqood: "OQD-3350", dld: "AED 142,000", deed: "Issued", issued: "18 Aug 26", keys: "Released", oa: "Registered" },
  { unit: "WPK-T1-0801", buyer: "Fatima Al Hashimi", oqood: "OQD-3362", dld: "AED 88,400", deed: "Issued", issued: "22 Aug 26", keys: "Released", oa: "Pending" },
  { unit: "WPK-T1-0210", buyer: "Vikram Shetty", oqood: "OQD-3370", dld: "AED 104,200", deed: "Blocked", issued: "\u2014", keys: "Held", oa: "Pending" },
];

const MOLLAK: [string, string][] = [
  ["Service charge rate", "AED 16.40 / sq.ft"],
  ["Annual charge \u00b7 1,180 sq.ft", "AED 19,352"],
  ["OA registration", "Mollak \u00b7 registered 12 Jul 2026"],
  ["First invoice", "01 Oct 2026"],
  ["Warranty \u00b7 general", "1 year to 04 Aug 2027"],
  ["Warranty \u00b7 structural", "10 years to 04 Aug 2036"],
];

const pill = (v: string, map: Record<string, { bg: string; color: string }>) => {
  const s = map[v] || { bg: "#F1F2F6", color: "#6B7180" };
  return { display: "inline-block", fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px", background: s.bg, color: s.color };
};

export default function DeedsScreen() {
  const [notice, setNotice] = useState("");
  const [certOpen, setCertOpen] = useState(false);
  const [certUnit, setCertUnit] = useState("WPK-T1-0402");

  const banner = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 3000); };

  const doExport = () => {
    exportOaData(ROWS);
    banner("OA data exported \u00b7 6 rows \u00b7 CSV");
  };

  const doIssue = () => {
    const row = ROWS.find((r) => r.unit === certUnit) || ROWS[0];
    exportHandoverCert(row.unit, row.buyer, row.oqood, row.dld);
    setCertOpen(false);
    banner("Certificate issued \u00b7 " + row.unit + " \u00b7 " + row.buyer);
  };

  return (
    <div>
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Title deeds &amp; owners association</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Deed issuance, key release, warranty pack and the Mollak service charge handoff</div>
        </div>
        <button onClick={doExport} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Export OA data</button>
        <button onClick={() => setCertOpen(true)} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Issue handover certificate</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "110px 1.2fr 96px 104px 88px 92px 88px 96px", gap: 8, padding: "13px 20px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
            <span>Unit</span><span>Owner</span><span>Oqood</span><span style={{ textAlign: "right" }}>DLD 4%</span><span>Deed</span><span>Issued</span><span>Keys</span><span>Mollak</span>
          </div>
          {ROWS.map((r) => (
            <div key={r.unit} style={{ display: "grid", gridTemplateColumns: "110px 1.2fr 96px 104px 88px 92px 88px 96px", gap: 8, alignItems: "center", padding: "0 20px", height: 48, borderBottom: "1px solid #F6F7FA" }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Service charge &amp; warranty</div>
            <div style={{ marginTop: 12 }}>
              {MOLLAK.map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #F6F7FA" }}>
                  <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: "right", color: "#14161F" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#E4F6F6", borderRadius: 20, padding: "18px 20px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#0B8A8A", textTransform: "uppercase" }}>Handover completion</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.04em", color: "#0B8A8A", marginTop: 10 }}>96 of 140</div>
            <div style={{ fontSize: 12, color: "#0B8A8A", fontWeight: 600, marginTop: 5, lineHeight: 1.5 }}>Keys released. 4 units blocked, 40 in progress across the pipeline.</div>
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
                  {ROWS.map((r) => (
                    <span key={r.unit} onClick={() => setCertUnit(r.unit)} style={{ fontSize: 11.5, fontWeight: 700, padding: "7px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "monospace", background: certUnit === r.unit ? AC : "#F1F2F6", color: certUnit === r.unit ? "#fff" : "#4A5060" }}>{r.unit}</span>
                  ))}
                </div>
              </div>
              <div style={{ background: "#FAFBFD", borderRadius: 12, padding: "12px 14px", fontSize: 11.5, color: "#4A5060", fontWeight: 600, lineHeight: 1.6 }}>
                {(ROWS.find((r) => r.unit === certUnit) || ROWS[0]).buyer}
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
