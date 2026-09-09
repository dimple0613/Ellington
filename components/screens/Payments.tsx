import React, { useEffect, useMemo, useState } from "react";
import { AC } from "../../lib/format";
import { fetchJSON } from "../../lib/api";
import { KpiSkeleton, PanelSkeleton } from "../Loading";

type ReceiptRow = {
  id?: number | string | null;
  rcp: string;
  date: string;
  buyer: string;
  unit: string;
  amount: string;
  method: string;
  esc: string;
  recon: "Matched" | "Unmatched";
  isCheque: boolean;
  chequeNo: string;
  chequeDate: string;
  bank: string;
  pdc: string;
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

type StmtRow = {
  id: number;
  date: string;
  reference: string;
  amount: number;
  description: string;
  matched: boolean;
  receiptId: number | null;
};

type ApiReceipt = {
  id?: number | string | null;
  amount?: number | string | null;
  method?: string | null;
  reference?: string | null;
  matched?: boolean;
  date?: string | null;
  buyer?: string | null;
  unit?: string | null;
  cheque_no?: string | null;
  cheque_date?: string | null;
  bank_name?: string | null;
  pdc_status?: string | null;
};

const PDC_STATUSES = ["Held", "Presented", "Cleared", "Bounced"];

export default function PaymentsScreen({ buyer }: { buyer?: string }) {
  const [tab, setTab] = useState<"receipts" | "pdc" | "statement">("receipts");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [formBuyer, setFormBuyer] = useState(buyer || "");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("Bank transfer");
  const [csvText, setCsvText] = useState("");
  const [saved, setSaved] = useState(false);
  const [imported, setImported] = useState<{ imported: number; matched: number } | null>(null);
  const [extraRows, setExtraRows] = useState<ReceiptRow[]>([]);
  const [dbRows, setDbRows] = useState<ReceiptRow[]>([]);
  const [rawReceipts, setRawReceipts] = useState<ApiReceipt[]>([]);
  const [stmtRows, setStmtRows] = useState<StmtRow[]>([]);
  const [apiError, setApiError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadReceipts = () =>
    fetchJSON<{ receipts: ApiReceipt[] }>("/api/receipts")
      .then((j) => {
        if (!Array.isArray(j.receipts)) return;
        setRawReceipts(j.receipts);
        setDbRows(
          j.receipts.map((x: ApiReceipt) => ({
            id: x.id,
            rcp: "RCP-" + String(x.id).padStart(6, "0"),
            date: x.date || "",
            buyer: x.buyer || "",
            unit: x.unit || "",
            amount: (x.amount || 0).toLocaleString("en-US"),
            method: (x.method || "bank_transfer").replace("_", " "),
            esc: x.reference || "—",
            recon: x.matched ? "Matched" : "Unmatched",
            isCheque: String(x.method || "").toLowerCase().includes("cheque") || !!x.pdc_status,
            chequeNo: x.cheque_no || "",
            chequeDate: x.cheque_date || "",
            bank: x.bank_name || "",
            pdc: x.pdc_status || "",
          }))
        );
      })
      .catch((e) => setApiError(e?.message || "Failed to load receipts"));

  const loadStmts = () =>
    fetchJSON<{ statements: StmtRow[] }>("/api/receipts/import")
      .then((j) => setStmtRows(Array.isArray(j.statements) ? j.statements : []))
      .catch(() => setStmtRows([]));

  useEffect(() => {
    let active = true;
    Promise.all([loadReceipts(), loadStmts()]).then(() => { if (active) setLoaded(true); }).catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const liveKpis = useMemo(() => {
    if (!rawReceipts.length) return null;
    const today = new Date();
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parseD = (s: string) => { const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{2})$/.exec(s || ""); if (!m) return null; return new Date(2000 + Number(m[3]), MON.indexOf(m[2]), Number(m[1])); };
    const sameMonth = (d: Date | null) => !!d && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const sameDay = (d: Date | null) => !!d && sameMonth(d) && d.getDate() === today.getDate();
    const fmt = (v: number) => (v >= 1e6 ? "AED " + (v / 1e6).toFixed(2).replace(/\.0+$/, "") + "M" : v >= 1e3 ? "AED " + Math.round(v / 1e3) + "k" : "AED " + Math.round(v));
    const out = { today: 0, todayN: 0, mtd: 0, mtdN: 0, chq: 0, chqN: 0, unr: 0, unrN: 0, bounced: 0 };
    rawReceipts.forEach((r) => {
      const amt = Number(r.amount) || 0;
      const d = parseD(r.date || "");
      const isChq = String(r.method || "").toLowerCase().includes("cheque") || !!r.pdc_status;
      if (sameDay(d)) { out.today += amt; out.todayN++; }
      if (sameMonth(d)) { out.mtd += amt; out.mtdN++; }
      if (isChq && (r.pdc_status === "Held" || r.pdc_status === "Presented")) { out.chq += amt; out.chqN++; }
      if (!r.matched) { out.unr += amt; out.unrN++; }
      if (r.pdc_status === "Bounced") out.bounced++;
    });
    if (!out.today && !out.mtd && !out.chq && !out.unr && !out.bounced) return null;
    return [
      { label: "Collected today", value: fmt(out.today), note: out.todayN + " receipts issued" },
      { label: "Collected MTD", value: fmt(out.mtd), note: out.mtdN + " receipts · live" },
      { label: "Cheques pending", value: fmt(out.chq), note: out.chqN + " PDCs held/pending" },
      { label: "Unreconciled", value: fmt(out.unr), note: out.unrN + " items · escrow", bad: true },
      { label: "Bounced this month", value: String(out.bounced), note: "fees raised on bounce", bad: true },
    ];
  }, [rawReceipts]);

  const kpiList = liveKpis || [];

  const livePdc: PdcRow[] = [...dbRows, ...extraRows]
    .filter((r) => r.isCheque)
    .map((r) => ({
      no: r.chequeNo || r.rcp.replace(/^RCP-/, "CHQ-"),
      date: r.chequeDate || r.date,
      buyer: r.buyer,
      unit: r.unit,
      amount: r.amount,
      bank: r.bank || "—",
      status: r.pdc || "Held",
    }));

  const pdcList = livePdc;

  const pillStyle = (m: string): React.CSSProperties => {
    let bg: string, col: string;
    if (m === "Matched" || m === "Cleared") { bg = "#E9F8F1"; col = "#1F9D6B"; }
    else if (m === "Bounced") { bg = "#FDECEC"; col = "#E5484D"; }
    else if (m === "Presented") { bg = "#EDECFE"; col = AC; }
    else if (m === "Unmatched") { bg = "#FDECEC"; col = "#E5484D"; }
    else { bg = "#F1F2F6"; col = "#6B7180"; }
    return { display: "block", fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", textAlign: "center", background: bg, color: col };
  };

  const record = async () => {
    const amt = parseFloat(formAmount) || 0;
    if (!formBuyer || !amt) return;
    const row: ReceiptRow = {
      rcp: "RCP-…",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
      buyer: formBuyer,
      unit: "—",
      amount: amt.toLocaleString("en-US"),
      method: formMethod,
      esc: "—",
      recon: "Unmatched",
      isCheque: formMethod === "Cheque",
      chequeNo: "",
      chequeDate: "",
      bank: "",
      pdc: "",
    };
    setExtraRows((r) => [row, ...r]);
    setSaved(true);
    setShowForm(false);
    setTimeout(() => setSaved(false), 4000);
    try {
      await fetchJSON<{ ok?: boolean }>("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_code: "BLG",
          buyer_name: formBuyer,
          amount: amt,
          method: formMethod.toLowerCase().replace(" ", "_"),
          ...(formMethod === "Cheque" ? { bank_name: "—", pdc_status: "Held" } : {}),
        }),
      });
      loadReceipts();
    } catch {
      /* keep local preview row */
    }
  };

  const setPdcStatus = (r: PdcRow, status: string) => {
    if (!r.no || status === r.status) return;
    const base = [...dbRows, ...extraRows].find((x) => (x.chequeNo || x.rcp) === r.no);
    if (!base?.id) return;
    fetch("/api/receipts?id=" + base.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pdc", status }),
    }).then((resp) => (resp.ok ? loadReceipts() : null)).catch(() => {});
  };

  const importCsv = () => {
    if (!csvText.trim()) return;
    setShowImport(false);
    fetch("/api/receipts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText }),
    })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((j) => {
        if (j) {
          setImported({ imported: j.imported, matched: j.matched });
          setTimeout(() => setImported(null), 5000);
        }
        loadStmts();
        loadReceipts();
      })
      .catch(() => {});
    setCsvText("");
  };

  const actStmt = (id: number, action: "confirm" | "reject") => {
    fetch("/api/receipts/import?id=" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).then((resp) => (resp.ok ? loadStmts() : null)).catch(() => {});
  };

  if (!loaded) {
    return (
      <div>
        <KpiSkeleton count={5} />
        <div style={{ marginTop: 16 }}>
          <PanelSkeleton headerW={180} rows={10} cols={7} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — payments are empty until data loads
        </div>
      )}
      {buyer && (
        <div style={{ background: "#F0EFFE", color: AC, borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Recording payment for <span style={{ fontWeight: 800 }}>{buyer}</span> · sourced from Buyer 360 · escrow deposit required
        </div>
      )}
      {saved && (
        <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Payment recorded · {formBuyer} · AED {parseFloat(formAmount).toLocaleString("en-US")} · {formMethod} · receipt issued
        </div>
      )}
      {imported && (
        <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Bank statement imported · {imported.imported} rows · {imported.matched} auto-matched to receipts · {imported.imported - imported.matched} in review queue
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Payments &amp; receipts</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>All buyer funds must be deposited to the project escrow account</div>
        </div>
        <button onClick={() => setShowImport(true)} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Import bank statement</button>
        <button onClick={() => setShowForm(true)} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Record payment</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
        {kpiList.map((k) => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 11, color: k.bad ? "#E5484D" : "#14161F" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 4 }}>{k.note}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 13, padding: 4, margin: "16px 0 14px", width: "fit-content" }}>
        {(["receipts", "pdc", "statement"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ height: 32, border: 0, borderRadius: 10, padding: "0 15px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: tab === t ? "#F0EFFE" : "transparent", color: tab === t ? AC : "#9AA0AE" }}>
            {t === "receipts" ? "Receipts" : t === "pdc" ? "Post-dated cheques" : "Bank statement"}
          </button>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden" }}>
        {tab === "receipts" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "118px 86px 1.1fr 92px 96px 96px 104px 88px", gap: 8, padding: "14px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
              <span>Receipt</span><span>Date</span><span>Buyer</span><span>Unit</span><span style={{ textAlign: "right" }}>Amount</span><span>Method</span><span>Escrow ref</span><span>Recon</span>
            </div>
            {[...dbRows, ...extraRows].map((r, i) => (
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
            ))}
          </>
        )}
        {tab === "pdc" && (
          <>
            <div style={{ padding: "20px 22px 6px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em" }}>Post-dated cheque register</div>
              <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>By presentation date · a bounced cheque raises a fee and a dunning event</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "96px 96px 1.1fr 92px 104px 116px 96px", gap: 8, padding: "14px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3", background: "#FAFBFD" }}>
              <span>Cheque</span><span>Present</span><span>Buyer</span><span>Unit</span><span style={{ textAlign: "right" }}>Amount</span><span>Bank</span><span>Status</span>
            </div>
            {pdcList.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "96px 96px 1.1fr 92px 104px 116px 96px", gap: 8, alignItems: "center", padding: "0 22px", height: 44, borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600 }}>{r.no}</span>
                <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{r.date}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>{r.buyer}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#4A5060" }}>{r.unit}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{r.amount}</span>
                <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{r.bank}</span>
                <span>
                  {livePdc.length && [...dbRows, ...extraRows].some((x) => (x.chequeNo || x.rcp) === r.no) ? (
                    <select value={r.status} onChange={(e) => setPdcStatus(r, e.target.value)} style={{ width: 96, height: 28, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", fontFamily: "inherit", fontSize: 11, fontWeight: 600, color: "#4A5060", outline: "none", padding: "0 4px" }}>
                      {PDC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span style={pillStyle(r.status)}>{r.status}</span>
                  )}
                </span>
              </div>
            ))}
          </>
        )}
        {tab === "statement" && (
          <>
            <div style={{ padding: "20px 22px 6px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em" }}>Bank statement · review queue</div>
              <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Imported lines auto-match to receipts · confirm or reject each suggestion</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "96px 1fr 104px 1.3fr 92px 132px", gap: 8, padding: "14px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3", background: "#FAFBFD" }}>
              <span>Value date</span><span>Reference</span><span style={{ textAlign: "right" }}>Amount</span><span>Description</span><span>Match</span><span style={{ textAlign: "right" }}>Action</span>
            </div>
            {stmtRows.length === 0 && (
              <div style={{ padding: "26px 22px", fontSize: 12, color: "#9AA0AE", fontWeight: 600 }}>
                No statement lines yet — use <strong>Import bank statement</strong> with CSV rows of date,reference,amount,description.
              </div>
            )}
            {stmtRows.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "96px 1fr 104px 1.3fr 92px 132px", gap: 8, alignItems: "center", padding: "0 22px", height: 44, borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600 }}>{r.date}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#4A5060" }}>{r.reference}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{(r.amount || 0).toLocaleString("en-US")}</span>
                <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description || "—"}</span>
                <span style={pillStyle(r.matched ? "Matched" : "Unmatched")}>{r.matched ? "Matched" : "Unmatched"}</span>
                <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {!r.matched && (
                    <>
                      <button onClick={() => actStmt(r.id, "confirm")} style={{ height: 28, borderRadius: 8, background: AC, color: "#fff", border: 0, padding: "0 10px", fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Confirm</button>
                      <button onClick={() => actStmt(r.id, "reject")} style={{ height: 28, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", padding: "0 10px", fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "#9AA0AE", cursor: "pointer" }}>Reject</button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </>
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

      {showImport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.35)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 520, background: "#fff", borderRadius: 22, padding: 24, boxShadow: "0 24px 60px rgba(20,22,31,.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ flex: 1, fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>Import bank statement</span>
              <button onClick={() => setShowImport(false)} style={{ width: 28, height: 28, borderRadius: 9, border: "1px solid #EDEEF3", background: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#9AA0AE", cursor: "pointer" }}>&#10005;</button>
            </div>
            <div style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 500, marginBottom: 12 }}>
              Paste statement lines as CSV — <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5 }}>date,reference,amount,description</span>. Rows auto-match to receipts by amount &amp; reference.
            </div>
            <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8} placeholder={"date,reference,amount,description\n2026-09-01,RCP-H21-004789,1236000,MENON RM 3302"} style={{ width: "100%", borderRadius: 12, border: "1px solid #E4E6EE", padding: 12, fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", boxSizing: "border-box", outline: "none", resize: "vertical", background: "#FAFBFD" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 18, paddingTop: 18, borderTop: "1px solid #F1F2F7" }}>
              <button onClick={() => setShowImport(false)} style={{ height: 40, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Cancel</button>
              <div style={{ flex: 1 }} />
              <button onClick={importCsv} style={{ height: 40, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Import &amp; auto-match</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}