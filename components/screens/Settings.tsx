import { useState } from "react";
import { AC } from "../../lib/format";

type Tab = "company" | "numbering" | "notif" | "integr" | "other";
const TABS: [Tab, string][] = [["company", "Company"], ["numbering", "Numbering"], ["notif", "Notifications"], ["integr", "Integrations"], ["other", "Other"]];

const NOTIF_ROWS: [string, boolean, boolean, boolean][] = [
  ["New booking created", true, true, false],
  ["Payment received", true, true, true],
  ["Milestone certified", true, true, false],
  ["Drawdown request", true, true, true],
  ["Snag raised", false, true, false],
  ["Title deed issued", true, true, false],
  ["Unit price changed", true, true, false],
  ["User invited", true, false, false],
];

const INTEGRATIONS: { name: string; status: string; note: string; ok: boolean }[] = [
  { name: "Emirates NBD Escrow API", status: "Connected", note: "Statement import every 4 h", ok: true },
  { name: "DLD Oqood API", status: "Connected", note: "Registration sync daily", ok: true },
  { name: "DEWA Portal", status: "Connected", note: "Utility clearance on handover", ok: true },
  { name: "Mollak OA Platform", status: "Connected", note: "Service charge sync weekly", ok: true },
  { name: "Slack Workspace", status: "Connected", note: "#erp-alerts channel", ok: true },
  { name: "Salesforce CRM", status: "Not connected", note: "Optional \u00b7 lead import", ok: false },
];

export default function SettingsScreen() {
  const [tab, setTab] = useState<Tab>("company");
  const [notice, setNotice] = useState("");
  const save = () => { setNotice("Changes saved \u00b7 will take effect immediately"); setTimeout(() => setNotice(""), 3000); };

  const tabBtn = (on: boolean) => ({ height: 32, border: 0, borderRadius: 10, padding: "0 15px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: on ? "#F0EFFE" : "transparent", color: on ? AC : "#9AA0AE" });

  return (
    <div>
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Organization settings</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Ellington Properties Development LLC \u00b7 ORN 21281</div>
        </div>
        <button onClick={save} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Save changes</button>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 13, padding: 4, marginBottom: 16, width: "fit-content" }}>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={tabBtn(tab === k)}>{label}</button>
        ))}
      </div>

      {tab === "company" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 14 }}>Company identity</div>
            {[["Legal name", "Ellington Properties Development LLC"], ["Trade licence", "CN-2847192"], ["ORN", "21281"], ["RERA", "1884"], ["VAT TRN", "100234567800003"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 14 }}>Brand &amp; locale</div>
            {[["Primary color", "#4F46F5"], ["Currency", "AED"], ["Date format", "DD MMM YYYY"], ["Timezone", "Asia/Dubai (GMT+4)"], ["Fiscal year", "Jan \u2013 Dec"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "numbering" && (
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #EDEEF3" }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Numbering conventions</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 2fr", gap: 8, padding: "12px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #F6F7FA" }}>
            <span>Object</span><span>Prefix</span><span>Pattern</span>
          </div>
          {[["Unit", "{project}-T{tower}-{seq}", "WPK-T1-0402 \u2014 auto-increment per tower"], ["Receipt", "RCP-{project}-{seq}", "RCP-H21-004712 \u2014 sequential"], ["Cheque", "CHQ-{seq}", "CHQ-884102 \u2014 sequential across all projects"], ["Drawdown", "DDR-{seq}", "DDR-0004 \u2014 sequential per project"], ["Escrow ref", "ESC-{year}-{seq}", "ESC-2026-9014 \u2014 yearly reset"], ["Notice", "NTC-{type}-{unit}", "NTC-30D-WPK-T1-0210"]].map(([obj, prefix, pattern]) => (
            <div key={obj} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 2fr", gap: 8, padding: "10px 22px", borderBottom: "1px solid #F6F7FA" }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{obj}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: AC }}>{prefix}</span>
              <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{pattern}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "notif" && (
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #EDEEF3" }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Notification matrix</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 100px 100px 100px", gap: 8, padding: "12px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #F6F7FA" }}>
            <span>Event</span><span style={{ textAlign: "center" }}>In-app</span><span style={{ textAlign: "center" }}>Email</span><span style={{ textAlign: "center" }}>Slack</span>
          </div>
          {NOTIF_ROWS.map(([event, app, email, slack]) => (
            <div key={event} style={{ display: "grid", gridTemplateColumns: "1.5fr 100px 100px 100px", gap: 8, alignItems: "center", padding: "0 22px", height: 44, borderBottom: "1px solid #F6F7FA" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{event}</span>
              {[app, email, slack].map((on, i) => (
                <span key={i} style={{ display: "block", width: 28, height: 16, borderRadius: 9, background: on ? AC : "#DDE0E8", cursor: "pointer", position: "relative", margin: "0 auto" }}>
                  <span style={{ position: "absolute", top: 2, width: 12, height: 12, borderRadius: 7, background: "#fff", left: on ? "14px" : "2px" }} />
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === "integr" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {INTEGRATIONS.map((i) => (
            <div key={i.name} style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: i.ok ? "#34C08A" : "#DDE0E8" }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{i.name}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 500 }}>{i.note}</div>
              <button style={{ marginTop: 12, height: 32, borderRadius: 10, border: "1px solid " + (i.ok ? "#EDEEF3" : AC), background: i.ok ? "#fff" : AC, color: i.ok ? "#4A5060" : "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{i.ok ? "Manage" : "Connect"}</button>
            </div>
          ))}
        </div>
      )}

      {tab === "other" && (
        <div style={{ background: "#fff", borderRadius: 20, padding: "40px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>&#9881;</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>More settings coming soon</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 6 }}>Data retention, export schedules, IP allow-list and SSO configuration</div>
        </div>
      )}
    </div>
  );
}
