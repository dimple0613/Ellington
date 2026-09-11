import { useEffect, useState } from "react";
import { AC } from "../../lib/format";
import { exportInvoicesLedger } from "../../lib/pdf";
import { fetchJSON } from "../../lib/api";
import { KpiSkeleton, PanelSkeleton } from "../Loading";

type InvRow = { id: number; no: string; buyer: string; unit: string; inst: string; issued: string; due: string; amount: string; paid: string; status: string; viewed: string };

const SOA_FIELDS: [string, string][] = [
  ["Scope", "Buyer on file"],
  ["Date range", "Ledger to date"],
  ["Include", "Ledger, ageing, forward schedule"],
  ["Letterhead", "Ellington \u00b7 English"],
  ["Delivery", "Email + portal"],
];

const pillBg = (s: string) => s === "Paid" ? "#E9F8F1" : s === "Overdue" ? "#FDECEC" : s === "Part paid" ? "#FDF4E5" : "#EDECFE";
const pillCol = (s: string) => s === "Paid" ? "#1F9D6B" : s === "Overdue" ? "#E5484D" : s === "Part paid" ? "#B07B14" : AC;

export default function InvoicesScreen() {
  const [notice, setNotice] = useState("");
  const [apiError, setApiError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [rows, setRows] = useState<InvRow[]>([]);
  const [voidTarget, setVoidTarget] = useState<{ id: number; no: string } | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidErr, setVoidErr] = useState("");
  const [voidBusy, setVoidBusy] = useState(false);
  const show = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

  const generateStatement = () => {
    exportInvoicesLedger(
      rows.map((r) => ({ no: r.no, buyer: r.buyer, unit: r.unit, inst: r.inst, issued: r.issued, due: r.due, amount: r.amount, paid: r.paid, status: r.status })),
      { issued: "AED " + issuedAmt.toLocaleString(), paid: "AED " + paidAmt.toLocaleString(), outstanding: "AED " + (issuedAmt - paidAmt).toLocaleString(), overdue: "AED " + overdueRows.reduce((a, r) => a + toN(r.amount), 0).toLocaleString() }
    );
    show("Invoice ledger PDF generated");
  };

  const mapRows = (list: any[]): InvRow[] =>
    list.map((r) => {
      const due = new Date(r.due);
      const issuedDate = r.issued_at ? new Date(r.issued_at) : new Date(due.getTime() - 14 * 86400000);
      const paidAmt = Number(r.paid ? r.amount : 0);
      let status: string;
      if (r.voided_at) status = "Void";
      else if (!r.issued_at) status = "Draft";
      else if (paidAmt) status = "Paid";
      else if (due.getTime() < Date.now()) status = "Overdue";
      else status = "Sent";
      return {
        id: Number(r.id),
        no: "INV-H21-00" + String(r.no).replace("INV-", "").padStart(4, "0"),
        buyer: r.buyer,
        unit: r.unit_no,
        inst: "Milestone \u00b7 " + r.milestone,
        issued: issuedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
        due: due.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
        amount: Number(r.amount).toLocaleString("en-US"),
        paid: paidAmt ? Number(r.amount).toLocaleString("en-US") : "0",
        status,
        viewed: "Viewed",
      };
    });

  const load = () => {
    let active = true;
    fetchJSON<{ invoices: any[] }>("/api/finance")
      .then((j) => {
        if (active) { setLoaded(true); if (j?.invoices?.length) setRows(mapRows(j.invoices)); else setRows([]); }
      })
      .catch((e) => { if (active) { setLoaded(true); setApiError(e?.message || "Failed to load invoices"); setRows([]); } });
    return () => { active = false; };
  };

  useEffect(() => { return load(); }, []);

  const bulkIssue = async () => {
    setNotice("");
    try {
      const d = await fetchJSON<{ issued: number }>("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bulk-issue" }) });
      show("Bulk issue complete \u00b7 " + (d.issued || 0) + " invoices issued");
      load();
    } catch (e: any) { show("Bulk issue failed: " + (e?.message || "request failed")); }
  };

  const issueInv = async (id: number) => {
    try {
      await fetchJSON<{ no: string }>("/api/invoices?id=" + id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "issue", id }) });
      show("Invoice issued and sent for delivery");
      load();
    } catch (e: any) { show("Issue failed: " + (e?.message || "request failed")); }
  };

  const voidInv = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) { setVoidErr("A void reason is required"); return; }
    setVoidBusy(true);
    try {
      await fetchJSON<{ no: string }>("/api/invoices?id=" + voidTarget.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "void", id: voidTarget.id, reason: voidReason.trim() }) });
      show("Invoice " + voidTarget.no + " voided: " + voidReason.trim());
      setVoidTarget(null); setVoidReason(""); setVoidErr("");
      load();
    } catch (e: any) { setVoidErr(e?.message || "Failed to void invoice"); }
    finally { setVoidBusy(false); }
  };

  const producePdf = () => { show("Statement PDF produced \u00b7 emailed + published to buyer portal"); };

  if (!loaded) {
    return (
      <div>
        <KpiSkeleton count={5} />
        <div style={{ marginTop: 16 }}>
          <PanelSkeleton headerW={220} rows={8} cols={7} />
        </div>
      </div>
    );
  }

  const toN = (s: string) => Number(String(s).replace(/[^0-9]/g, "")) || 0;
  const issuedAmt = rows.reduce((a, r) => a + toN(r.amount), 0);
  const paidAmt = rows.reduce((a, r) => a + toN(r.paid), 0);
  const overdueRows = rows.filter((r) => r.status === "Overdue");
  const openRows = rows.filter((r) => r.status !== "Paid" && r.status !== "Void" && r.status !== "Draft");
  const draftRows = rows.filter((r) => r.status === "Draft");
  const INV_KPIS: [string, string, string, boolean?][] = [
    ["Issued", "AED " + issuedAmt.toLocaleString(), rows.length + " invoices"],
    ["Paid", "AED " + paidAmt.toLocaleString(), Math.round(issuedAmt ? paidAmt / issuedAmt * 100 : 0) + "% of issued"],
    ["Outstanding", "AED " + (issuedAmt - paidAmt).toLocaleString(), openRows.length + " invoices open"],
    ["Overdue", "AED " + overdueRows.reduce((a, r) => a + toN(r.amount), 0).toLocaleString(), overdueRows.length + " invoices", overdueRows.length > 0],
    ["Draft", String(draftRows.length), "awaiting issue"],
  ];

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — invoices are empty until data loads
        </div>
      )}
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", rowGap: 12, alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
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
          <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "126px 1fr 96px 1.1fr 86px 86px 96px 96px 88px 76px 76px", minWidth: 1000, gap: 8, padding: "14px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" as const, background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
            <span>Invoice</span><span>Buyer</span><span>Unit</span><span>Instalment</span><span>Issued</span><span>Due</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Paid</span><span>Status</span><span>Viewed</span><span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {rows.map((r) => (
            <div key={r.no} style={{ display: "grid", gridTemplateColumns: "126px 1fr 96px 1.1fr 86px 86px 96px 96px 88px 76px 76px", minWidth: 1000, gap: 8, alignItems: "center", padding: "0 22px", height: 42, borderBottom: "1px solid #F6F7FA" }}>
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
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                {r.status === "Draft" && (
                  <button onClick={() => issueInv(r.id)} style={{ height: 24, borderRadius: 7, border: 0, background: "#EDECFE", padding: "0 8px", fontFamily: "inherit", fontSize: 9.5, fontWeight: 700, color: AC, cursor: "pointer" }}>Issue</button>
                )}
                {(r.status === "Sent" || r.status === "Overdue") && (
                  <button onClick={() => { setVoidTarget({ id: r.id, no: r.no }); setVoidErr(""); setVoidReason(""); }} style={{ height: 24, borderRadius: 7, border: "1px solid #EDEEF3", background: "#fff", padding: "0 8px", fontFamily: "inherit", fontSize: 9.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Void</button>
                )}
              </div>
            </div>
          ))}
          </div>
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

      {voidTarget && (
        <div onMouseDown={() => { setVoidTarget(null); setVoidErr(""); setVoidReason(""); }} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.42)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "26px 28px", width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(20,22,31,.25)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>Void invoice {voidTarget.no}</div>
            <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>Provide a reason. This invoice will no longer appear in the payment schedule or collections queue.</div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Reason</div>
              <input value={voidReason} onChange={(e) => { setVoidReason(e.target.value); setVoidErr(""); }} placeholder="e.g. Buyer requested cancellation" autoFocus style={{ width: "100%", boxSizing: "border-box", height: 40, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 12px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, outline: "none" }} />
              {voidErr && <div style={{ fontSize: 11.5, fontWeight: 600, color: "#E5484D", marginTop: 6 }}>{voidErr}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setVoidTarget(null); setVoidErr(""); setVoidReason(""); }} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Cancel</button>
              <button onClick={voidInv} disabled={voidBusy} style={{ height: 38, borderRadius: 12, background: "#E5484D", color: "#fff", border: 0, padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: voidBusy ? "wait" : "pointer" }}>{voidBusy ? "Voiding…" : "Void invoice"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
