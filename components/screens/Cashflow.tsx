import { useState } from "react";
import { AC } from "../../lib/format";

const FC: Record<string, [string, number][]> = {
  "7": [["Mon", 8.4], ["Tue", 12.1], ["Wed", 6.2], ["Thu", 14.8], ["Fri", 3.1], ["Sat", 1.2], ["Sun", 0.6]],
  "30": [["W1", 21.4], ["W2", 34.8], ["W3", 18.2], ["W4", 26.6]],
  "90": [["Mar", 96.4], ["Apr", 74.1], ["May", 112.8]],
  "180": [["Mar", 96.4], ["Apr", 74.1], ["May", 112.8], ["Jun", 88.2], ["Jul", 141.6], ["Aug", 67.4]],
};

const CF_LADDER: [string, string, number][] = [
  ["Opening escrow balance", "AED 188.4M", 0],
  ["Expected collections", "+ AED 101.0M", 1],
  ["Confidence adjustment", "\u2212 AED 8.7M", 2],
  ["Drawdown requests approved", "\u2212 AED 62.4M", 2],
  ["Refunds and cancellations", "\u2212 AED 3.1M", 2],
  ["Projected closing balance", "AED 215.2M", 0],
];

const CF_SPLIT: [string, number, string][] = [
  ["Date-driven instalments", 46, AC],
  ["Construction-milestone", 41, "#8B7CF6"],
  ["Handover payments", 13, "#B9B4FA"],
];

const CF_ROWS: [string, string, string, string, string][] = [
  ["Sep 26", "AED 101.0M", "AED 62.4M", "AED 38.6M", "AED 227.0M"],
  ["Oct 26", "AED 74.1M", "AED 0", "AED 74.1M", "AED 301.1M"],
  ["Nov 26", "AED 112.8M", "AED 48.0M", "AED 64.8M", "AED 365.9M"],
  ["Dec 26", "AED 88.2M", "AED 0", "AED 88.2M", "AED 454.1M"],
  ["Jan 27", "AED 141.6M", "AED 92.0M", "AED 49.6M", "AED 503.7M"],
  ["Feb 27", "AED 67.4M", "AED 0", "AED 67.4M", "AED 571.1M"],
];

export default function CashflowScreen() {
  const [fc, setFc] = useState("30");
  const bars = FC[fc];
  const mx = Math.max(...bars.map((b) => b[1]));
  const total = bars.reduce((a, b) => a + b[1], 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Cashflow forecast</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Escrow-level projection · milestone-driven money is contingent on verified progress</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 12, padding: 4 }}>
          {["7", "30", "90", "180"].map((f) => (
            <button
              key={f}
              onClick={() => setFc(f)}
              style={{
                height: 30, border: 0, borderRadius: 9, padding: "0 12px", cursor: "pointer",
                fontFamily: "inherit", fontSize: 11.5, fontWeight: 700,
                background: fc === f ? "#fff" : "transparent",
                color: fc === f ? "#14161F" : "#9AA0AE",
                boxShadow: fc === f ? "0 1px 3px rgba(20,22,31,.10)" : "none",
              }}
            >
              {f + (f === "180" ? " days" : "d")}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Expected collections</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 200, marginTop: 20 }}>
            {bars.map((b) => (
              <div key={b[0]} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7180" }}>{"AED " + b[1].toFixed(1) + "M"}</span>
                <span style={{ display: "block", width: "100%", maxWidth: 64, borderRadius: "10px 10px 4px 4px", background: AC, height: (b[1] / mx) * 100 + "%" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#9AA0AE" }}>{b[0]}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 20, borderTop: "1px solid #F1F2F7", paddingTop: 18 }}>
            {[
              { label: "Expected", value: "AED " + total.toFixed(1) + "M", note: "Scheduled instalments in window", red: false },
              { label: "Confidence-adjusted", value: "AED " + (total * 0.914).toFixed(1) + "M", note: "At 91.4% historical collection rate", red: false },
              { label: "At risk", value: "AED " + (total * 0.086).toFixed(1) + "M", note: "Broken promises and dunning ladder", red: true },
            ].map((x) => (
              <div key={x.label}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" }}>{x.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 6, color: x.red ? "#E5484D" : "#14161F" }}>{x.value}</div>
                <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 3 }}>{x.note}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 14 }}>Balance ladder · next 30 days</div>
            {CF_LADDER.map((l, i, a) => (
              <div key={l[0]} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "12px 0", borderBottom: "1px solid " + (i === a.length - 2 ? "#DDE0E8" : "#F6F7FA") }}>
                <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{l[0]}</span>
                <span style={{ fontSize: 13, fontWeight: l[2] === 0 ? 800 : 700, color: l[2] === 1 ? "#1F9D6B" : l[2] === 2 ? "#E5484D" : "#14161F", whiteSpace: "nowrap" }}>{l[1]}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 6 }}>By trigger type</div>
            {CF_SPLIT.map((c) => (
              <div key={c[0]} style={{ padding: "9px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 4, background: c[2], flex: "none" }}></span>
                  <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>{c[0]}</span>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{c[1] + "%"}</span>
                </div>
                <div style={{ height: 7, borderRadius: 5, background: "#F1F2F7", marginTop: 7, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: c[1] + "%", background: c[2] }}></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden", marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr 1fr", gap: 12, padding: "14px 24px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3", background: "#FAFBFD" }}>
          <span>Month</span><span style={{ textAlign: "right" }}>Inflow</span><span style={{ textAlign: "right" }}>Drawdowns</span><span style={{ textAlign: "right" }}>Net</span><span style={{ textAlign: "right" }}>Closing balance</span>
        </div>
        {CF_ROWS.map((r) => (
          <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr 1fr", gap: 12, alignItems: "center", padding: "0 24px", height: 44, borderBottom: "1px solid #F6F7FA" }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{r[0]}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600, color: "#1F9D6B" }}>{r[1]}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 600, color: "#E5484D" }}>{r[2]}</span>
            <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{r[3]}</span>
            <span style={{ textAlign: "right", fontSize: 12, fontWeight: 800 }}>{r[4]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}