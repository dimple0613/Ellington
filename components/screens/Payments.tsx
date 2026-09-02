import React, { useState } from "react";
import { AC } from "../../lib/format";

type ReceiptRow = {
  rcp: string;
  date: string;
  buyer: string;
  unit: string;
  amount: string;
  method: string;
  esc: string;
  recon: "Matched" | "Unmatched";
};

type PdcRow = {
  no: string;
  date: string;
  buyer: string;
  unit: string;
  amount: string;
  bank: string;
  status: string;
};

export default function PaymentsScreen({ buyer }: { buyer?: string }) {
  const [tab, setTab] = useState<"receipts" | "pdc">("receipts");
  const [showForm, setShowForm] = useState(false);
  const [formBuyer, setFormBuyer] = useState(buyer || "");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("Bank transfer");
  const [saved, setSaved] = useState(false);
  const [extraRows, setExtraRows] = useState<ReceiptRow[]>([]);

  const kpis: { label: string; value: string; note: string; bad?: boolean }[] = [
    { label: "Collected today", value: "AED 4.24M", note: "9 receipts issued" },
    { label: "Collected MTD", value: "AED 61.2M", note: "+4.2% vs last month" },
    { label: "Cheques pending", value: "AED 12.8M", note: "18 PDCs held" },
    { label: "Unreconciled", value: "AED 340k", note: "12 items · escrow", bad: true },
    { label: "Bounced this month", value: "2", note: "AED 512k · fees raised", bad: true },
  ];

  const payRows: ReceiptRow[] = [
    ["RCP-H21-004712", "24 Aug 26", "Rajesh Menon", "H21-T1-3302", "367,875", "Bank transfer", "ESC-2026-9014", "Matched"],
    ["RCP-H21-004711", "24 Aug 26", "Aisha Al Marri", "H21-T1-2801", "512,000", "Bank transfer", "ESC-2026-9013", "Matched"],
    ["RCP-H21-004710", "23 Aug 26", "Daniel Whitfield", "H21-T1-1905", "842,500", "Cheque", "ESC-2026-9008", "Matched"],
    ["RCP-H21-004709", "23 Aug 26", "Elena Petrova", "H21-T1-4102", "1,204,000", "Bank transfer", "—", "Unmatched"],
    ["RCP-H21-004708", "22 Aug 26", "Omar Al Suwaidi", "H21-T1-3601", "298,400", "Card", "ESC-2026-8997", "Matched"],
    ["RCP-H21-004707", "22 Aug 26", "Grace Okonkwo", "H21-T1-1103", "186,250", "Bank transfer", "ESC-2026-8994", "Matched"],
    ["RCP-H21-004706", "21 Aug 26", "Marcus Lindqvist", "H21-T1-2404", "640,000", "Cheque", "—", "Unmatched"],
    ["RCP-H21-004705", "21 Aug 26", "Fatima Al Hashimi", "H21-T1-3005", "415,750", "Bank transfer", "ESC-2026-8988", "Matched"],
    ["RCP-H21-004704", "20 Aug 26", "Wei Chen", "H21-T1-1602", "722,000", "Bank transfer", "ESC-2026-8981", "Matched"],
    ["RCP-H21-004703", "20 Aug 26", "Priya Nair", "H21-T1-0904", "234,500", "Card", "ESC-2026-8979", "Matched"],
  ].map((r): ReceiptRow => ({ rcp: r[0], date: r[1], buyer: r[2], unit: r[3], amount: r[4], method: r[5], esc: r[6], recon: r[7] as ReceiptRow["recon"] }));

  const pdcRows: PdcRow[] = [
    ["CHQ-884102", "01 Sep 26", "Daniel Whitfield", "H21-T1-1905", "842,500", "Emirates NBD", "Held"],
    ["CHQ-884118", "05 Sep 26", "Marcus Lindqvist", "H21-T1-2404", "640,000", "ADCB", "Held"],
    ["CHQ-884120", "14 Sep 26", "Sunil Rathore", "H21-T1-3703", "415,000", "Mashreq", "Presented"],
    ["CHQ-883991", "18 Aug 26", "Nadia Khoury", "H21-T1-2202", "312,000", "ADIB", "Cleared"],
    ["CHQ-883964", "12 Aug 26", "Wei Chen", "H21-T1-1602", "268,000", "HSBC", "Bounced"],
    ["CHQ-884131", "22 Sep 26", "Priya Nair", "H21-T1-0904", "234,500", "Emirates NBD", "Held"],
  ].map((r): PdcRow => ({ no: r[0], date: r[1], buyer: r[2], unit: r[3], amount: r[4], bank: r[5], status: r[6] }));

  const pillStyle = (m: string): React.CSSProperties => {
    let bg: string, col: string;
    if (m === "Matched" || m === "Cleared") { bg = "#E9F8F1"; col = "#1F9D6B"; }
    else if (m === "Bounced") { bg = "#FDECEC"; col = "#E5484D"; }
    else if (m === "Presented") { bg = "#EDECFE"; col = AC; }
    else if (m === "Unmatched") { bg = "#FDECEC"; col = "#E5484D"; }
    else { bg = "#F1F2F6"; col = "#6B7180"; }
    return { display: "block", fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", textAlign: "center", background: bg, color: col };
  };

  const record = () => {
    const amt = (parseFloat(formAmount) || 0).toLocaleString("en-US");
    if (!formBuyer || !amt) return;
    const row: ReceiptRow = {
      rcp: "RCP-H21-" + String(4790 + extraRows.length).padStart(6, "0"),
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, " "),
      buyer: formBuyer,
      unit: "H21-T1-1204",
      amount: amt,
      method: formMethod,
      esc: "ESC-2026-" + (9014 + extraRows.length),
      recon: "Matched",
    };
    setExtraRows((r) => [row, ...r]);
    setSaved(true);
    setShowForm(false);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <div>
      {buyer && (
        <div style={{ background: "#F0EFFE", color: AC, borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Recording payment for <span style={{ fontWeight: 800 }}>{buyer}</span> \u00b7 sourced from Buyer 360 \u00b7 escrow deposit required
        </div>
      )}
      {saved && (
        <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Payment recorded \u00b7 {formBuyer} \u00b7 AED {parseFloat(formAmount).toLocaleString("en-US")} \u00b7 {formMethod} \u00b7 receipt issued \u00b7 escrow matched
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Payments &amp; receipts</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>All buyer funds must be deposited to the project escrow account</div>
        </div>
        <button style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Import bank statement</button>
        <button onClick={() => setShowForm(true)} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Record payment</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 11, color: k.bad ? "#E5484D" : "#14161F" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 4 }}>{k.note}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 13, padding: 4, margin: "16px 0 14px", width: "fit-content" }}>
        {(["receipts", "pdc"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ height: 32, border: 0, borderRadius: 10, padding: "0 15px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: tab === t ? "#F0EFFE" : "transparent", color: tab === t ? AC : "#9AA0AE" }}>
            {t === "receipts" ? "Receipts" : "Post-dated cheques"}
          </button>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "118px 86px 1.1fr 92px 96px 96px 104px 88px", gap: 8, padding: "14px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
          <span>Receipt</span><span>Date</span><span>Buyer</span><span>Unit</span><span style={{ textAlign: "right" }}>Amount</span><span>Method</span><span>Escrow ref</span><span>Recon</span>
        </div>
        {tab === "receipts" ? [...extraRows, ...payRows].map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "118px 86px 1.1fr 92px 96px 96px 104px 88px", gap: 8, alignItems: "center", padding: "0 22px", height: 40, borderBottom: "1px solid #F6F7FA" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600 }}>{r.rcp}</span>
            <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{r.date}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.buyer}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#4A5060" }}>{r.unit}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{r.amount}</span>
            <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{r.method}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#9AA0AE" }}>{r.esc}</span>
            <span style={pillStyle(r.recon)}>{r.recon}</span>
          </div>
        )) : (
          <div>
            <div style={{ padding: "20px 22px 6px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em" }}>Post-dated cheque register</div>
              <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>By presentation date · a bounced cheque raises a fee and a dunning event</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "96px 96px 1.1fr 92px 104px 116px 96px", gap: 8, padding: "14px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3" }}>
              <span>Cheque</span><span>Present</span><span>Buyer</span><span>Unit</span><span style={{ textAlign: "right" }}>Amount</span><span>Bank</span><span>Status</span>
            </div>
            {pdcRows.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "96px 96px 1.1fr 92px 104px 116px 96px", gap: 8, alignItems: "center", padding: "0 22px", height: 42, borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600 }}>{r.no}</span>
                <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{r.date}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>{r.buyer}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#4A5060" }}>{r.unit}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{r.amount}</span>
                <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{r.bank}</span>
                <span style={pillStyle(r.status)}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.35)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 440, background: "#fff", borderRadius: 22, padding: 24, boxShadow: "0 24px 60px rgba(20,22,31,.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <span style={{ flex: 1, fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>Record payment</span>
              <button onClick={() => setShowForm(false)} style={{ width: 28, height: 28, borderRadius: 9, border: "1px solid #EDEEF3", background: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#9AA0AE", cursor: "pointer" }}>&#10005;</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Buyer</div>
                <input value={formBuyer} onChange={(e) => setFormBuyer(e.target.value)} placeholder="Buyer name" style={{ width: "100%", height: 42, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Amount (AED)</div>
                  <input value={formAmount} onChange={(e) => setFormAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" style={{ width: "100%", height: 42, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Method</div>
                  <select value={formMethod} onChange={(e) => setFormMethod(e.target.value)} style={{ width: "100%", height: 42, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 12px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff", outline: "none" }}>
                    <option>Bank transfer</option><option>Cheque</option><option>Card</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22, paddingTop: 18, borderTop: "1px solid #F1F2F7" }}>
              <button onClick={() => setShowForm(false)} style={{ height: 40, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Cancel</button>
              <div style={{ flex: 1 }} />
              <button onClick={record} style={{ height: 40, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Record &amp; issue receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}