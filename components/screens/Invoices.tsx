import { useState } from "react";
import { AC } from "../../lib/format";
import { exportInvoicesLedger } from "../../lib/pdf";

type InvRow = { no: string; buyer: string; unit: string; inst: string; issued: string; due: string; amount: string; paid: string; status: string; viewed: string };

const INV_ROWS: InvRow[] = [
  { no: "INV-H21-003318", buyer: "Rajesh Menon", unit: "H21-T1-1204", inst: "04  \u00b7  Structure 40%", issued: "31 Aug 26", due: "14 Sep 26", amount: "465,500", paid: "0", status: "Sent", viewed: "Viewed" },
  { no: "INV-H21-003317", buyer: "Aisha Al Marri", unit: "H21-T1-2801", inst: "03  \u00b7  Excavation 20%", issued: "31 Aug 26", due: "14 Sep 26", amount: "512,000", paid: "512,000", status: "Paid", viewed: "Viewed" },
  { no: "INV-H21-003316", buyer: "Sunil Rathore", unit: "H21-T1-2705", inst: "04  \u00b7  Structure 40%", issued: "02 Jun 26", due: "16 Jun 26", amount: "824,000", paid: "0", status: "Overdue", viewed: "Viewed" },
  { no: "INV-H21-003315", buyer: "Elena Petrova", unit: "H21-T1-4102", inst: "03  \u00b7  Excavation 20%", issued: "18 May 26", due: "01 Jun 26", amount: "1,204,000", paid: "0", status: "Overdue", viewed: "Not viewed" },
  { no: "INV-H21-003314", buyer: "Daniel Whitfield", unit: "H21-T1-1905", inst: "04  \u00b7  Structure 40%", issued: "31 Aug 26", due: "14 Sep 26", amount: "842,500", paid: "842,500", status: "Paid", viewed: "Viewed" },
  { no: "INV-H21-003313", buyer: "Grace Okonkwo", unit: "H21-T1-1103", inst: "02  \u00b7  SPA execution", issued: "12 Aug 26", due: "26 Aug 26", amount: "186,250", paid: "186,250", status: "Paid", viewed: "Viewed" },
  { no: "INV-H21-003312", buyer: "Wei Chen", unit: "H21-T1-1602", inst: "04  \u00b7  Structure 40%", issued: "24 May 26", due: "07 Jun 26", amount: "722,000", paid: "268,000", status: "Part paid", viewed: "Viewed" },
  { no: "INV-H21-003311", buyer: "Priya Nair", unit: "H21-T1-0904", inst: "03  \u00b7  Excavation 20%", issued: "31 Aug 26", due: "14 Sep 26", amount: "234,500", paid: "0", status: "Sent", viewed: "Not viewed" },
];

const INV_KPIS: [string, string, string, boolean?][] = [
  ["Issued this month", "AED 96.4M", "148 invoices"],
  ["Paid", "AED 61.2M", "63.5% of issued"],
  ["Outstanding", "AED 35.2M", "52 invoices open"],
  ["Overdue", "AED 31.4M", "31 invoices", true],
  ["Awaiting issue", "AED 62.4M", "on Structure 40% certification"],
];

const SOA_FIELDS: [string, string][] = [
  ["Scope", "Buyer \u00b7 Rajesh Menon"],
  ["Date range", "01 Jan 2026 \u2013 25 Aug 2026"],
  ["Include", "Ledger, ageing, forward schedule"],
  ["Letterhead", "Ellington \u00b7 English"],
  ["Delivery", "Email + portal"],
];

const pillBg = (s: string) => s === "Paid" ? "#E9F8F1" : s === "Overdue" ? "#FDECEC" : s === "Part paid" ? "#FDF4E5" : "#EDECFE";
const pillCol = (s: string) => s === "Paid" ? "#1F9D6B" : s === "Overdue" ? "#E5484D" : s === "Part paid" ? "#B07B14" : AC;

export default function InvoicesScreen() {
  const [notice, setNotice] = useState("");
  const show = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

  const generateStatement = () => {
    exportInvoicesLedger(
      INV_ROWS.map((r) => ({ no: r.no, buyer: r.buyer, unit: r.unit, inst: r.inst, issued: r.issued, due: r.due, amount: r.amount, paid: r.paid, status: r.status })),
      { issued: "AED 96.4M", paid: "AED 61.2M", outstanding: "AED 35.2M", overdue: "AED 31.4M" }
    );
    show("Invoice ledger PDF generated");
  };

  const bulkIssue = () => { show("Bulk issue queued \u00b7 148 invoices will be sent for the Sep window"); };
  const producePdf = () => { show("Statement PDF produced \u00b7 emailed + published to buyer portal"); };

  return (
    <div>
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Invoices &amp; statements</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Auto-issued 14 days before due \u00b7 VAT shown as a separate line, never baked into the instalment</div>
        </div>
        <button onClick={bulkIssue} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Bulk issue for window</button>
        <button onClick={generateStatement} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Generate statement</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
        {INV_KPIS.map(([label, value, note, bad]) => (
          <div key={label} style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" as const }}>{label}</div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.03em", marginTop: 11, color: bad ? "#E5484D" : "#14161F" }}>{value}</div>
            <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 4 }}>{note}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, marginTop: 16, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "126px 1fr 96px 1.1fr 86px 86px 96px 96px 88px 76px", gap: 8, padding: "14px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" as const, background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
            <span>Invoice</span><span>Buyer</span><span>Unit</span><span>Instalment</span><span>Issued</span><span>Due</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Paid</span><span>Status</span><span>Viewed</span>
          </div>
          {INV_ROWS.map((r) => (
            <div key={r.no} style={{ display: "grid", gridTemplateColumns: "126px 1fr 96px 1.1fr 86px 86px 96px 96px 88px 76px", gap: 8, alignItems: "center", padding: "0 22px", height: 42, borderBottom: "1px solid #F6F7FA" }}>
              <span style={{ fontFamily: "monospace", fontSize: 10.5, fontWeight: 600 }}>{r.no}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.buyer}</span>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#4A5060" }}>{r.unit}</span>
              <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.inst}</span>
              <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{r.issued}</span>
              <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{r.due}</span>
              <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{r.amount}</span>
              <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>{r.paid}</span>
              <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", textAlign: "center", background: pillBg(r.status), color: pillCol(r.status) }}>{r.status}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: r.viewed === "Viewed" ? "#6B7180" : "#C2C6D2" }}>{r.viewed}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em" }}>Statement of account</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 4, lineHeight: 1.55 }}>Developer letterhead, full ledger, ageing, and the forward schedule with the escrow reference format to quote.</div>
          <div style={{ marginTop: 16 }}>
            {SOA_FIELDS.map(([k, v]) => (
              <div key={k} style={{ padding: "9px 0", borderBottom: "1px solid #F6F7FA" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase" as const }}>{k}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
          <button onClick={producePdf} style={{ marginTop: 18, width: "100%", height: 40, borderRadius: 12, background: "#14161F", color: "#fff", border: 0, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Produce PDF</button>
        </div>
      </div>
    </div>
  );
}
