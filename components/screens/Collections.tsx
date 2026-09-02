import { useState } from "react";
import { useRouter } from "next/router";
import { AC } from "../../lib/format";

type CollRow = { buyer: string; unit: string; amount: string; days: number; stage: string; action: string };
type StageMap = Record<string, { bg: string; color: string }>;

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

  const buckets = [
    { label: "Current", value: "AED 439.6M", note: "428 buyers", idx: 0 },
    { label: "1\u201330", value: "AED 18.4M", note: "21 buyers", idx: 1 },
    { label: "31\u201360", value: "AED 7.1M", note: "12 buyers", idx: 2 },
    { label: "61\u201390", value: "AED 3.7M", note: "8 buyers", idx: 3 },
    { label: "90+", value: "AED 33.6M", note: "31 buyers", idx: 4 },
    { label: "Legal", value: "AED 4.1M", note: "3 buyers", idx: 5 },
  ];

  const rows: CollRow[] = [
    { buyer: "Sunil Rathore", unit: "H21-T1-2705", amount: "4,120,000", days: 118, stage: "Final notice", action: "Legal review \u00b7 28 Aug" },
    { buyer: "Elena Petrova", unit: "H21-T1-4102", amount: "2,860,000", days: 104, stage: "30-day notice", action: "Notice issued 12 Aug" },
    { buyer: "Marcus Lindqvist", unit: "H21-T1-2404", amount: "1,940,000", days: 96, stage: "Reminder 2", action: "Promise to pay 02 Sep" },
    { buyer: "Wei Chen", unit: "H21-T1-1602", amount: "1,210,000", days: 92, stage: "Reminder 2", action: "Cheque bounced \u00b7 re-present" },
    { buyer: "Nadia Khoury", unit: "H21-T1-2202", amount: "864,000", days: 61, stage: "Reminder 1", action: "Call scheduled 26 Aug" },
    { buyer: "Omar Al Suwaidi", unit: "H21-T1-3601", amount: "640,000", days: 44, stage: "Reminder 1", action: "Awaiting bank confirmation" },
    { buyer: "Grace Okonkwo", unit: "H21-T1-1103", amount: "412,000", days: 31, stage: "Reminder 1", action: "Email sent 22 Aug" },
    { buyer: "Priya Nair", unit: "H21-T1-0904", amount: "208,000", days: 18, stage: "Upcoming", action: "Auto-reminder 27 Aug" },
  ];

  const tiers: [string, string, boolean][] = [
    ["Construction < 60%", "up to 25%", true],
    ["Construction 60\u201380%", "up to 40%", false],
    ["Construction > 80%", "full value", false],
  ];

  const defCalc = [
    ["Contract value", "AED 4,120,000", 700 as const],
    ["Paid to date", "AED 1,236,000", 700 as const],
    ["Permissible retention (25%)", "AED 1,030,000", 800 as const],
    ["Refund payable", "AED 206,000", 800 as const],
  ];

  const remind = (buyer: string) => { setNotice("Reminder queued for " + buyer + " \u00b7 email + SMS"); setTimeout(() => setNotice(""), 3000); };
  const logCall = (buyer: string) => { setLogEntry(buyer); setTimeout(() => setLogEntry(null), 3000); };
  const escalate = (row: CollRow) => { router.push({ pathname: "/finance", query: { s: "escrow" } }, undefined, { shallow: true }); };

  const pill = (stage: string) => {
    const s = STAGE_PILL[stage] || { bg: "#F1F2F6", color: "#6B7180" };
    return { display: "inline-block", fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px", background: s.bg, color: s.color, whiteSpace: "nowrap" as const };
  };

  return (
    <div>
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      {logEntry && <div style={{ background: "#F0EFFE", color: AC, borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>Call logged for {logEntry} \u00b7 15-min follow-up scheduled</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Collections</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>31 overdue instalments \u00b7 AED 31.4M \u00b7 sorted by priority score</div>
        </div>
        <button style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Dunning ladder</button>
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
                  <span style={{ flex: 1, fontSize: 10.5, color: "#6B7180", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.action}</span>
                  <button onClick={() => remind(r.buyer)} style={{ height: 28, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", padding: "0 9px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Remind</button>
                  <button onClick={() => logCall(r.buyer)} style={{ height: 28, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", padding: "0 9px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Log call</button>
                  <button onClick={() => escalate(r)} style={{ height: 28, borderRadius: 8, border: 0, background: "#F0EFFE", padding: "0 9px", fontFamily: "inherit", fontSize: 10, fontWeight: 700, color: AC, cursor: "pointer" }}>Escalate</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Default calculator</div>
          <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Dubai Law No. 19 of 2017. The retention tier is driven by verified construction progress.</div>
          <div style={{ background: "#F5F6FA", borderRadius: 12, padding: "14px 16px", marginTop: 14 }}>
            <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>Unit <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#14161F" }}>H21-T1-2705</span></div>
            <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 600, marginTop: 4 }}>Verified construction <span style={{ fontWeight: 700, color: "#14161F" }}>46.0%</span></div>
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {tiers.map(([label, val, active]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: active ? "#EDECFE" : "#F6F7FA" }}>
                <span style={{ flex: 1, fontSize: 12, fontWeight: active ? 700 : 600, color: active ? AC : "#4A5060" }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: active ? AC : "#6B7180" }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            {defCalc.map(([k, v, w]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: k === "Permissible retention (25%)" ? "1px solid #EDEEF3" : undefined }}>
                <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: w, color: k === "Refund payable" ? "#E5484D" : "#14161F" }}>{v}</span>
              </div>
            ))}
          </div>
          <button style={{ marginTop: 18, width: "100%", height: 42, borderRadius: 12, background: "#14161F", color: "#fff", border: 0, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Generate 30-day notice</button>
          <div style={{ fontSize: 10, color: "#9AA0AE", fontWeight: 500, marginTop: 8, textAlign: "center" }}>Requires legal review before issue</div>
        </div>
      </div>
    </div>
  );
}
