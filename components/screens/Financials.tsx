import { useMemo } from "react";
import { AC, compact } from "../../lib/format";
import { PROJECTS } from "../../lib/data";

type FinRow = {
  code: string;
  name: string;
  gdv: string;
  soldV: string;
  coll: string;
  out: string;
  comm: string;
  dld: string;
  net: string;
};

type TitleTile = { label: string; value: string; note: string; bad?: boolean };

export type FinExport = { tiles: TitleTile[]; rows: FinRow[] };

export function useFinancialData(): FinExport {
  return useMemo(() => {
    const tiles: TitleTile[] = [
      { label: "Gross development value", value: "AED 1.94B", note: "5 SPVs consolidated" },
      { label: "Revenue recognised", value: "AED 604.2M", note: "percentage-of-completion" },
      { label: "Cash collected", value: "AED 819.6M", note: "net of refunds" },
      { label: "VAT payable", value: "AED 8.4M", note: "commercial + service charge" },
      { label: "Commission accrued", value: "AED 26.1M", note: "AED 18.4M paid" },
      { label: "DLD collected vs remitted", value: "AED 52.8M / 51.2M", note: "AED 1.6M pending", bad: true },
    ];
    const rows: FinRow[] = PROJECTS.map((p) => {
      const coll = (p.soldV * p.coll) / 100;
      return {
        code: p.code,
        name: p.name,
        gdv: compact(p.gdv),
        soldV: compact(p.soldV),
        coll: compact(coll),
        out: compact(p.soldV - coll),
        comm: compact(p.soldV * 0.02),
        dld: compact(p.soldV * 0.04),
        net: compact(coll - p.soldV * 0.02),
      };
    });
    return { tiles, rows };
  }, []);
}

const REV_BARS: [string, number][] = [
  ["Q1 25", 42], ["Q2 25", 58], ["Q3 25", 71], ["Q4 25", 96], ["Q1 26", 112], ["Q2 26", 138], ["Q3 26", 87],
];

const COMM_ROWS: [string, string, string, string, string, string][] = [
  ["Betterhomes", "Agency", "AED 8.42M", "AED 6.10M", "On SPA signature", "Due"],
  ["Allsopp & Allsopp", "Agency", "AED 6.18M", "AED 6.18M", "On 20% collected", "Paid"],
  ["Haus & Haus", "Agency", "AED 4.02M", "AED 2.40M", "On SPA signature", "Due"],
  ["Internal · sales team", "Internal", "AED 5.64M", "AED 3.72M", "On 20% collected", "Due"],
  ["Referral programme", "Referral", "AED 1.84M", "AED 0", "On handover", "Accrued"],
];

const pill = (s: string) =>
  s === "Paid"
    ? { background: "#E9F8F1", color: "#1F9D6B" }
    : s === "Due"
    ? { background: "#FDF4E5", color: "#B07B14" }
    : { background: "#F1F2F6", color: "#6B7180" };

function csv(rows: FinRow[]) {
  const head = "Code,Entity,GDV,Sold,Collected,Outstanding,Commission,DLD,Net cash";
  const body = rows.map((r) => [r.code, r.name, r.gdv, r.soldV, r.coll, r.out, r.comm, r.dld, r.net].map((v) => '"' + v + '"').join(","));
  return head + "\n" + body.join("\n");
}

export default function FinancialsScreen() {
  const { tiles, rows } = useFinancialData();
  const maxRev = 138;

  const accountingExport = () => {
    const blob = new Blob([csv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ellington-accounting-export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const boardPackPdf = () => {
    import("../../lib/pdf").then(({ exportFinancialsPdf }) => exportFinancialsPdf(tiles, rows));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Consolidated financials</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>5 SPVs · books kept separate, position consolidated · YTD to 25 Aug 2026</div>
        </div>
        <button onClick={accountingExport} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Accounting export</button>
        <button onClick={boardPackPdf} style={{ height: 38, borderRadius: 12, background: "#14161F", color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Board pack PDF</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase", lineHeight: 1.35 }}>{t.label}</div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.03em", marginTop: 11, color: t.bad ? "#E5484D" : "#14161F" }}>{t.value}</div>
            <div style={{ fontSize: 10.5, color: "#6B7180", fontWeight: 500, marginTop: 4 }}>{t.note}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden", marginTop: 16 }}>
        <div style={{ padding: "20px 24px 4px", fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Position by project entity</div>
        <div style={{ display: "grid", gridTemplateColumns: "44px 1.4fr 88px 88px 88px 88px 84px 88px 96px", gap: 10, padding: "14px 24px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3" }}>
          <span></span><span>Entity</span><span style={{ textAlign: "right" }}>GDV</span><span style={{ textAlign: "right" }}>Sold</span><span style={{ textAlign: "right" }}>Collected</span><span style={{ textAlign: "right" }}>Outstanding</span><span style={{ textAlign: "right" }}>Commission</span><span style={{ textAlign: "right" }}>DLD</span><span style={{ textAlign: "right" }}>Net cash</span>
        </div>
        {rows.map((r) => (
          <div key={r.code} style={{ display: "grid", gridTemplateColumns: "44px 1.4fr 88px 88px 88px 88px 84px 88px 96px", gap: 10, alignItems: "center", padding: "0 24px", height: 46, borderBottom: "1px solid #F6F7FA" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, padding: "4px 5px", borderRadius: 7, background: "#EDECFE", color: AC, textAlign: "center" }}>{r.code}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{r.name}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600 }}>{r.gdv}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600 }}>{r.soldV}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700, color: "#4F46F5" }}>{r.coll}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>{r.out}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>{r.comm}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>{r.dld}</span>
            <span style={{ textAlign: "right", fontSize: 12, fontWeight: 800 }}>{r.net}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, marginTop: 16 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Revenue recognised by quarter</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Percentage-of-completion · current quarter part-period</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 170, marginTop: 20 }}>
            {REV_BARS.map((b, i) => (
              <div key={b[0]} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7180" }}>{"AED " + b[1] + "M"}</span>
                <span style={{ display: "block", width: "100%", maxWidth: 52, borderRadius: "9px 9px 3px 3px", background: i === REV_BARS.length - 1 ? "#B9B4FA" : AC, height: (b[1] / maxRev) * 100 + "%" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#9AA0AE" }}>{b[0]}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px 4px", fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Commission payable</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 92px 92px 1fr 82px", gap: 10, padding: "14px 24px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3" }}>
            <span>Payee</span><span>Type</span><span style={{ textAlign: "right" }}>Accrued</span><span style={{ textAlign: "right" }}>Paid</span><span>Trigger</span><span>Status</span>
          </div>
          {COMM_ROWS.map((c, i) => {
            const st = pill(c[5]);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 92px 92px 1fr 82px", gap: 10, alignItems: "center", padding: "0 24px", height: 46, borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{c[0]}</span>
                <span style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600 }}>{c[1]}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{c[2]}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>{c[3]}</span>
                <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{c[4]}</span>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", textAlign: "center", background: st.background, color: st.color }}>{c[5]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}