import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AC } from "../../lib/format";
import { exportCollectionNotice } from "../../lib/pdf";
import { fetchJSON } from "../../lib/api";
import { KpiSkeleton, PanelSkeleton } from "../Loading";

type CollRow = { id: number; buyer: string; unit: string; amount: string; days: number; stage: string; action: string; promised?: string };type StageMap = Record<string, { bg: string; color: string }>;

const STAGE_PILL: StageMap = {
  "Final notice": { bg: "#FDECEC", color: "#E5484D" },
  "30-day notice": { bg: "#FDECEC", color: "#E5484D" },
  "Reminder 2": { bg: "#FDF4E5", color: "#B07B14" },
  "Reminder 1": { bg: "#FDF4E5", color: "#B07B14" },
  Upcoming: { bg: "#F1F2F6", color: "#6B7180" },
};

export default function CollectionsScreen() {
  const router = useRouter();
  const [sel, setSel] = useState(0);
  const [notice, setNotice] = useState("");
  const [logEntry, setLogEntry] = useState<string | null>(null);
  const [ladderOpen, setLadderOpen] = useState(false);
  const [promiseTarget, setPromiseTarget] = useState<CollRow | null>(null);
  const [promiseDate, setPromiseDate] = useState("");
  const [promiseAmount, setPromiseAmount] = useState("");
  const [promiseErr, setPromiseErr] = useState("");

  const [liveRows, setLiveRows] = useState<CollRow[]>([]);
  const [apiError, setApiError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [calc, setCalc] = useState<any>(null);
  const [calcErr, setCalcErr] = useState("");
  const [calcUnit, setCalcUnit] = useState("");

  useEffect(() => {
    let active = true;
    fetchJSON<{ collections: any[]; defaultCalc: any }>("/api/finance")
      .then((j) => {
        if (!active) return;
        setLoaded(true);
        if (j?.collections) {
          setLiveRows(j.collections.map((c) => ({
            id: Number(c.id),
            buyer: c.buyer,
            unit: c.unit_no,
            amount: Number(c.amount).toLocaleString("en-US"),
            days: c.days_due,
            stage: c.stage,
            action: c.action || "",
            promised: c.promised_date ? ("Promise \u00b7 " + String(c.promised_date).slice(0, 10)) : undefined,
          })));
        }
        if (j?.defaultCalc) setCalc(j.defaultCalc);
      })
      .catch((e) => { if (active) { setLoaded(true); setApiError(e?.message || "Failed to load collections"); } });
    return () => { active = false; };
  }, []);

  const loadCalc = (unit: string) => {
    setCalcErr("");
    fetchJSON<any>("/api/finance?unit=" + encodeURIComponent(unit))
      .then((j) => { setCalc(j?.defaultCalc || null); if (!j?.defaultCalc) setCalcErr("Unit not found"); })
      .catch((e) => setCalcErr(e?.message || "Failed to load calculator"));
  };

  const rows = liveRows;

  const buckets = useMemo(() => {
    if (!liveRows.length) return [];
    const fmt = (v: number) => (v >= 1e6 ? "AED " + (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : v >= 1e3 ? "AED " + Math.round(v / 1e3) + "k" : "AED " + v);
    const build = (label: string, idx: number, pred: (r: CollRow) => boolean) => {
      const sel = rows.filter(pred);
      const v = sel.reduce((a, r) => a + (Number(String(r.amount).replace(/,/g, "")) || 0), 0);
      return { label, value: fmt(v), note: sel.length + (sel.length === 1 ? " buyer" : " buyers"), idx };
    };
    return [
      build("Current", 0, (r) => r.days <= 0),
      build("1\u201330", 1, (r) => r.days >= 1 && r.days <= 30),
      build("31\u201360", 2, (r) => r.days >= 31 && r.days <= 60),
      build("61\u201390", 3, (r) => r.days >= 61 && r.days <= 90),
      build("90+", 4, (r) => r.days > 90),
      build("Legal", 5, (r) => /notice/i.test(r.stage || "")),
    ];
  }, [rows, liveRows.length]);

  const overdueRows = rows.filter((r) => r.days > 0);
  const overdueSum = overdueRows.reduce((a, r) => a + (Number(String(r.amount).replace(/,/g, "")) || 0), 0);
  const overdueFmt = (v: number) => (v >= 1e6 ? "AED " + (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : "AED " + Math.round(v / 1e3) + "k");

  const tiers: [string, string, boolean][] = [
    ["Construction < 60%", "up to 25%", true],
    ["Construction 60\u201380%", "up to 40%", false],
    ["Construction > 80%", "full value", false],
  ];

  const ladder: { stage: string; trigger: string; action: string; count: number; color: string }[] = [
    { stage: "Upcoming", trigger: "14\u201330 days before due", action: "Auto-reminder \u00b7 email + SMS", count: rows.filter((r) => r.days <= 0).length, color: "#6B7180" },
    { stage: "Reminder 1", trigger: "0\u201330 days overdue", action: "Email + SMS \u00b7 soft reminder", count: rows.filter((r) => r.days > 0 && r.days <= 30).length, color: "#B07B14" },
    { stage: "Reminder 2", trigger: "31\u201360 days overdue", action: "Promise-to-pay + cheque follow-up", count: rows.filter((r) => r.days > 30 && r.days <= 60).length, color: "#B07B14" },
    { stage: "30-day notice", trigger: "61\u201390 days overdue", action: "Formal notice \u00b7 legal review", count: rows.filter((r) => r.days > 60 && r.days <= 90).length, color: "#E5484D" },
    { stage: "Final notice", trigger: "90+ days overdue", action: "Cancellation + retention per Law 19", count: rows.filter((r) => r.days > 90).length, color: "#E5484D" },
  ];

  const remind = async (row: CollRow) => {
    if (row.id == null) { setNotice("Reminder queued for " + row.buyer + " \u00b7 email + SMS"); setTimeout(() => setNotice(""), 3000); return; }
    try {
      await fetchJSON<any>("/api/finance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remind", id: row.id }) });
      setNotice("Reminder sent for " + row.buyer + " \u00b7 email + SMS");
    } catch (e: any) { setNotice("Remind failed: " + (e?.message || "request failed")); }
    setTimeout(() => setNotice(""), 3000);
  };

  const logCall = async (row: CollRow) => {
    if (row.id == null) { setLogEntry(row.buyer); setTimeout(() => setLogEntry(null), 3000); return; }
    try {
      await fetchJSON<any>("/api/finance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "log", id: row.id }) });
      setLogEntry(row.buyer);
    } catch (e: any) { setNotice("Log failed: " + (e?.message || "request failed")); }
    setTimeout(() => setLogEntry(null), 3000);
  };

  const promisePay = async () => {
    if (!promiseTarget) return;
    if (!promiseDate) { setPromiseErr("Pick a promised date"); return; }
    try {
      await fetchJSON<any>("/api/finance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "promise", id: promiseTarget.id, date: promiseDate, amount: promiseAmount || null }) });
      setLiveRows((rs) => rs.map((r) => r.id === promiseTarget.id ? { ...r, promised: "Promise \u00b7 " + promiseDate } : r));
      setNotice("Promise to pay logged for " + promiseTarget.buyer + " \u00b7 " + promiseDate + " \u00b7 tracked as at-risk");
      setPromiseTarget(null); setPromiseDate(""); setPromiseAmount(""); setPromiseErr("");
    } catch (e: any) { setPromiseErr(e?.message || "Failed to log promise"); }
    setTimeout(() => setNotice(""), 4000);
  };

  const escalate = (row: CollRow) => { router.push({ pathname: "/finance", query: { s: "escrow" } }, undefined, { shallow: true }); };
  const genNotice = () => {
    const c = calc;
    const first = rows.find((r) => r.days > 0) || rows[0];
    const amt = first ? Number(String(first.amount).replace(/,/g, "")) : 0;
    exportCollectionNotice(
      first?.buyer || "Buyer",
      first?.unit || "",
      first ? amt.toLocaleString("en-US") : "0",
      first?.days || 0,
      c ? Number(c.retentionAmount).toLocaleString("en-US") : String(Math.round(amt * 0.25)),
      c ? Number(c.refund).toLocaleString("en-US") : String(Math.round(amt * 0.05))
    );
    setNotice("30-day notice generated for " + (first?.buyer || "buyer") + " \u00b7 sent to legal review");
    setTimeout(() => setNotice(""), 3000);
  };

  const pill = (stage: string) => {
    const s = STAGE_PILL[stage] || { bg: "#F1F2F6", color: "#6B7180" };
    return { display: "inline-block", fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px", background: s.bg, color: s.color, whiteSpace: "nowrap" as const };
  };

  if (!loaded) {
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, alignItems: "start" }}>
          <div>
            <KpiSkeleton count={5} />
            <div style={{ marginTop: 16 }}>
              <PanelSkeleton headerW={200} rows={8} cols={6} />
            </div>
          </div>
          <div>
            <KpiSkeleton count={2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — collections are empty until data loads
        </div>
      )}
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      {logEntry && <div style={{ background: "#F0EFFE", color: AC, borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>Call logged for {logEntry} \u00b7 15-min follow-up scheduled</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Collections</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>{overdueRows.length} overdue instalments \u00b7 {overdueFmt(overdueSum)} \u00b7 sorted by priority score</div>
        </div>
        <button onClick={() => setLadderOpen(true)} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Dunning ladder</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, marginBottom: 16 }}>
        {buckets.map((b) => {
          const active = b.idx === sel;
          const danger = b.idx >= 3;
          return (
            <button key={b.label} onClick={() => setSel(b.idx)} style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", border: active ? "2px solid #E5484D" : "1px solid #EDEEF3", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{b.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 10, color: danger ? "#E5484D" : "#14161F" }}>{b.value}</div>
              <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 4 }}>{b.note}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, alignItems: "start" }}>
        <div>
          <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 92px 96px 72px 116px 1fr", gap: 8, padding: "13px 20px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
              <span>Buyer</span><span>Unit</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Days</span><span>Stage</span><span>Next action</span>
            </div>
            {rows.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.1fr 92px 96px 72px 116px 1fr", gap: 8, alignItems: "center", padding: "0 20px", height: 46, borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.buyer}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#4A5060" }}>{r.unit}</span>
                <span style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "#E5484D" }}>AED {r.amount}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700, color: r.days >= 90 ? "#E5484D" : r.days >= 30 ? "#B07B14" : "#4A5060" }}>{r.days}</span>
                <span style={pill(r.stage)}>{r.stage}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ flex: 1, fontSize: 10.5, color: "#6B7180", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.promised || r.action}</span>
                  <button onClick={() => remind(r)} style={{ height: 28, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", padding: "0 9px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Remind</button>
                  <button onClick={() => logCall(r)} style={{ height: 28, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", padding: "0 9px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Log call</button>
                  <button onClick={() => { setPromiseTarget(r); setPromiseDate(""); setPromiseAmount(""); setPromiseErr(""); }} style={{ height: 28, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", padding: "0 9px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Promise</button>
                  <button onClick={() => escalate(r)} style={{ height: 28, borderRadius: 8, border: 0, background: "#F0EFFE", padding: "0 9px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: AC, cursor: "pointer" }}>Escalate</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Default calculator</div>
          <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Dubai Law No. 19 of 2017. The retention tier is driven by verified construction progress.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input value={calcUnit} onChange={(e) => setCalcUnit(e.target.value)} placeholder="Unit e.g. H21-T1-2705" style={{ flex: 1, height: 38, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 12px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, outline: "none" }} />
            <button onClick={() => loadCalc(calcUnit)} style={{ height: 38, borderRadius: 12, border: 0, background: AC, color: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Calculate</button>
          </div>
          {calcErr && <div style={{ fontSize: 11.5, fontWeight: 600, color: "#E5484D", marginTop: 8 }}>{calcErr}</div>}
          {calc && (
            <>
              <div style={{ background: "#F5F6FA", borderRadius: 12, padding: "14px 16px", marginTop: 14 }}>
                <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>Unit <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#14161F" }}>{calc.unit}</span></div>
                <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 600, marginTop: 4 }}>Verified construction <span style={{ fontWeight: 700, color: "#14161F" }}>{Number(calc.constructionPct).toFixed(1).replace(/\.0$/, "")}%</span></div>
              </div>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {tiers.map(([label, val]) => {
                  const active = calc.tier === label;
                  return (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: active ? "#EDECFE" : "#F6F7FA" }}>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: active ? 700 : 600, color: active ? AC : "#4A5060" }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: active ? AC : "#6B7180" }}>{val}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  ["Contract value", Number(calc.contract).toLocaleString("en-US"), 700],
                  ["Paid to date", Number(calc.paid).toLocaleString("en-US"), 700],
                  ["Permissible retention (" + calc.retentionPct + "%)", Number(calc.retentionAmount).toLocaleString("en-US"), 800],
                  ["Refund payable", Number(calc.refund).toLocaleString("en-US"), 800],
                ].map(([k, v, w]: any[]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: String(k).includes("Permissible") ? "1px solid #EDEEF3" : undefined }}>
                    <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: w, color: String(k) === "Refund payable" ? "#E5484D" : "#14161F" }}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={genNotice} style={{ marginTop: 18, width: "100%", height: 42, borderRadius: 12, background: "#14161F", color: "#fff", border: 0, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Generate 30-day notice</button>
              <div style={{ fontSize: 10, color: "#9AA0AE", fontWeight: 500, marginTop: 8, textAlign: "center" }}>Requires legal review before issue</div>
            </>
          )}
        </div>
      </div>

      {ladderOpen && (
        <div onMouseDown={() => setLadderOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.42)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "26px 28px", width: "100%", maxWidth: 680, boxShadow: "0 24px 60px rgba(20,22,31,.25)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>Dunning ladder</div>
            <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>Automated collection escalation \u00b7 Dubai Law No. 19 of 2017 \u00b7 stages are triggered by overdue days.</div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", gap: 8, paddingBottom: 12, borderBottom: "1px solid #EDEEF3" }}>
                {ladder.map((s, i) => (
                  <div key={s.stage} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 9, border: "2px solid " + s.color, background: "#fff", margin: "0 auto", position: "relative" }}>
                      {i < ladder.length - 1 && <span style={{ position: "absolute", left: 18, top: 7, width: "200%", height: 2, background: s.color, opacity: 0.3 }} />}
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: s.color, marginTop: 6 }}>{s.stage}</div>
                    <div style={{ fontSize: 9, color: "#9AA0AE", fontWeight: 600, marginTop: 2 }}>{s.count} live</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 4 }}>
                {ladder.map((s) => (
                  <div key={s.stage} style={{ display: "grid", gridTemplateColumns: "150px 1fr 1.2fr 60px", gap: 10, alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #F6F7FA" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.stage}</span>
                    <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{s.trigger}</span>
                    <span style={{ fontSize: 11.5, color: "#4A5060", fontWeight: 600 }}>{s.action}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, textAlign: "right" }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={() => setLadderOpen(false)} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {promiseTarget && (
        <div onMouseDown={() => { setPromiseTarget(null); setPromiseErr(""); }} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.42)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "26px 28px", width: "100%", maxWidth: 460, boxShadow: "0 24px 60px rgba(20,22,31,.25)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>Promise to pay</div>
            <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>Log a promised date for {promiseTarget.buyer}. This appears in cashflow as at-risk and auto-escalates if broken.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Promised date</div>
                <input type="date" value={promiseDate} onChange={(e) => { setPromiseDate(e.target.value); setPromiseErr(""); }} style={{ width: "100%", boxSizing: "border-box", height: 40, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 12px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, outline: "none" }} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Promised amount (AED) — optional, defaults to balance</div>
                <input value={promiseAmount} onChange={(e) => setPromiseAmount(e.target.value)} placeholder="e.g. 4,120,000" style={{ width: "100%", boxSizing: "border-box", height: 40, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 12px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, outline: "none" }} />
              </div>
              {promiseErr && <div style={{ fontSize: 11.5, fontWeight: 600, color: "#E5484D" }}>{promiseErr}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setPromiseTarget(null); setPromiseErr(""); }} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Cancel</button>
              <button onClick={promisePay} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Log promise</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
