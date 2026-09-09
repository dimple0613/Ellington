import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AC, MONTHS_ABBR } from "../../lib/format";
import { fetchJSON } from "../../lib/api";

type Tab = "company" | "financial" | "numbering" | "templates" | "notif" | "integr" | "data";
const TABS: [Tab, string][] = [
  ["company", "Company"], ["financial", "Financial"], ["numbering", "Numbering"], ["templates", "Templates"],
  ["notif", "Notifications"], ["integr", "Integrations"], ["data", "Data"],
];

type NotifRow = [string, boolean, boolean, boolean, string];
const NOTIF_ROWS: NotifRow[] = [
  ["New booking created", true, true, false, "Sales director · agent"],
  ["Payment received", true, true, true, "Finance · buyer"],
  ["Milestone certified", true, true, false, "Project manager · CEO"],
  ["Drawdown request", true, true, true, "CEO · Finance"],
  ["Snag raised", false, true, false, "Contractor · PM"],
  ["Title deed issued", true, true, false, "Legal · buyer"],
  ["Unit price changed", true, true, false, "Sales · CEO"],
  ["User invited", true, false, false, "New user"],
];

type NumRow = { object: string; prefix: string; pattern: string; next: number };
const NUMBERING_ROWS: NumRow[] = [
  { object: "Unit", prefix: "{project}-T{tower}-{seq}", pattern: "WPK-T1-0402 — auto-increment per tower", next: 403 },
  { object: "Booking", prefix: "BKG-{year}-{seq}", pattern: "BKG-2026-00891 — sequential per year", next: 892 },
  { object: "Receipt", prefix: "RCP-{project}-{seq}", pattern: "RCP-H21-004712 — sequential", next: 4713 },
  { object: "Invoice", prefix: "INV-{project}-{seq}", pattern: "INV-H21-003318 — sequential per project", next: 3319 },
  { object: "Cheque", prefix: "CHQ-{seq}", pattern: "CHQ-884102 — sequential across all projects", next: 884103 },
  { object: "Drawdown", prefix: "DDR-{seq}", pattern: "DDR-0004 — sequential per project", next: 5 },
  { object: "Escrow ref", prefix: "ESC-{year}-{seq}", pattern: "ESC-2026-9014 — yearly reset", next: 9015 },
  { object: "Notice", prefix: "NTC-{type}-{unit}", pattern: "NTC-30D-WPK-T1-0210", next: 1 },
  { object: "Quote", prefix: "QTE-{year}-{seq}", pattern: "QTE-2026-0142 — yearly reset", next: 143 },
];

const INTEGRATIONS: { name: string; status: string; note: string; ok: boolean }[] = [
  { name: "Emirates NBD Escrow API", status: "Connected", note: "Statement import every 4 h", ok: true },
  { name: "DLD Oqood API", status: "Connected", note: "Registration sync daily", ok: true },
  { name: "DEWA Portal", status: "Connected", note: "Utility clearance on handover", ok: true },
  { name: "Mollak OA Platform", status: "Connected", note: "Service charge sync weekly", ok: true },
  { name: "Slack Workspace", status: "Connected", note: "#erp-alerts channel", ok: true },
  { name: "Salesforce CRM", status: "Not connected", note: "Optional \u00b7 lead import", ok: false },
];

type BankRow = { name: string; iban: string; kind: "Operating" | "Escrow" };
const BANK_DEFAULT: BankRow[] = [
  { name: "Emirates NBD", iban: "AE07 0260 0010 1528 4739 001", kind: "Operating" },
  { name: "Emirates NBD \u00b7 H21 escrow", iban: "AE07 0260 0010 2140 0899 012", kind: "Escrow" },
  { name: "Mashreq \u00b7 WPK escrow", iban: "AE07 0400 0018 7704 221 101", kind: "Escrow" },
  { name: "ADCB \u00b7 BLG III escrow", iban: "AE07 0300 0011 2205 884 102", kind: "Escrow" },
];

type Tpl = { name: string; type: string; lang: string; status: string; body: string };
const TEMPLATES: Tpl[] = [
  {
    name: "Instalment reminder", type: "Email", lang: "EN", status: "Active",
    body: "Dear {{buyer_name}},\n\nYour instalment of AED {{amount}} for {{unit}} is due on {{next_due}}. Please transfer to the project escrow account and share the receipt reference.\n\nBest regards,\nEllington Properties",
  },
  {
    name: "Instalment reminder", type: "Email", lang: "AR", status: "Draft",
    body: "عزيزي {{buyer_name}}،\n\nيستحق قسطك بمبلغ AED {{amount}} للوحدة {{unit}} في {{next_due}}. يرجى التحويل إلى حساب الضمان ومشاركة مرجع الإيصال.\n\nمع تحياتنا،\nإلينغتون العقارية",
  },
  {
    name: "Invoice issued", type: "Email", lang: "EN", status: "Active",
    body: "Dear {{buyer_name}},\n\nInvoice {{invoice_no}} for {{unit}} has been issued. Amount AED {{amount}}, due {{next_due}}.\n\nEllington Properties",
  },
  {
    name: "Title deed ready", type: "WhatsApp", lang: "EN", status: "Draft",
    body: "{{buyer_name}}, the title deed for {{unit}} is ready for pick-up at the Oqood centre. Bring your Emirates ID and passport.\n\nEllington Properties",
  },
  {
    name: "Snag scheduled", type: "Email", lang: "EN", status: "Draft",
    body: "Hi {{buyer_name}},\n\nA re-inspection for {{unit}} is scheduled. The contractor will resolve the outstanding items before handover.\n\nEllington Properties",
  },
  {
    name: "Handover reminder", type: "SMS", lang: "EN", status: "Draft",
    body: "{{buyer_name}}, your handover for {{unit}} is on {{date}}. Note: all outstanding dues must clear first. Ellington Properties",
  },
];
const MERGE_FIELDS = ["{{buyer_name}}", "{{unit}}", "{{amount}}", "{{next_due}}", "{{project}}", "{{escrow_bank}}", "{{invoice_no}}", "{{date}}"];
const MERGE_SAMPLES: Record<string, string> = {
  buyer_name: "Hassan Al Rayes", unit: "H21-T1-1204", amount: "465,500", next_due: "14 Sep 2026",
  project: "H21", escrow_bank: "Emirates NBD \u00b7 H21 escrow", invoice_no: "INV-H21-003318", date: "24 Aug 2026",
};

type RetentionRow = [string, string];
const RETENTION_DEFAULT: RetentionRow[] = [
  ["Audit logs", "10 years"], ["Financial records", "10 years"], ["Buyer documents (SPA / KYC)", "15 years"],
  ["Snag & handover records", "7 years"], ["Broker records", "10 years"],
];

type PiiRow = [string, boolean];
const PII_DEFAULT: PiiRow[] = [
  ["Encrypt PII at rest (name, phone, email)", true],
  ["Pseudonymise PII in data exports", true],
  ["Right-to-erasure request queue (UAE PDPL)", false],
  ["Data processing register (Art. 17)", true],
];

export default function SettingsScreen() {
  const router = useRouter();
  const tabFromUrl = typeof router.query.tab === "string" && TABS.some(([k]) => k === router.query.tab) ? (router.query.tab as Tab) : "company";
  const [tab, setTab] = useState<Tab>(tabFromUrl);
  const [notice, setNotice] = useState("");
  const [notif, setNotif] = useState<NotifRow[]>(NOTIF_ROWS);
  const [numbering, setNumbering] = useState<NumRow[]>(NUMBERING_ROWS);
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [company, setCompany] = useState<Record<string, string>>({
    "Legal name": "Ellington Properties Development LLC",
    "Trade licence": "CN-2847192",
    "ORN": "21281",
    "RERA": "1884",
    "DLD developer no.": "330-00524",
    "VAT TRN": "100234567800003",
    "Address": "Level 8, Boulevard Plaza Tower 1, Downtown Dubai, UAE",
  });
  const [brand, setBrand] = useState<Record<string, string>>({
    "Primary color": "#3B6EF6",
    "Currency": "AED",
    "Date format": "DD MMM YYYY",
    "Timezone": "Asia/Dubai (GMT+4)",
    "Fiscal year": "Jan \u2013 Dec",
  });
  const [fx, setFx] = useState<[string, string, string, string][]>([
    ["USD", "3.6725", "CBUAE daily", "9 Sep 2026"],
    ["EUR", "4.0520", "CBUAE daily", "8 Sep 2026"],
    ["GBP", "4.7950", "CBUAE daily", "8 Sep 2026"],
    ["SAR", "0.9793", "CBUAE daily", "9 Sep 2026"],
  ]);
  const [vat, setVat] = useState<Record<string, string>>({
    "Standard VAT rate": "5%",
    "Residential sales": "Exempt (0%)",
    "Fiscal year": "Jan \u2013 Dec",
    "Rounding rule": "Round half up \u00b7 2 dp",
  });
  const [banks, setBanks] = useState<BankRow[]>(BANK_DEFAULT);
  const [tpls, setTpls] = useState<Tpl[]>(TEMPLATES);
  const [tplSel, setTplSel] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [retention, setRetention] = useState<RetentionRow[]>(RETENTION_DEFAULT);
  const [pii, setPii] = useState<PiiRow[]>(PII_DEFAULT);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let active = true;
    fetchJSON<{ settings: { company: Record<string, string>; brand: Record<string, string>; numbering: NumRow[]; notif: { event: string; inapp: boolean; email: boolean; slack: boolean; who?: string }[]; fx: [string, string, string, string][]; vat: Record<string, string>; banks: BankRow[]; templates: Tpl[]; retention: RetentionRow[]; pii: PiiRow[]; integrations: { name: string; status: string; note: string; ok: boolean }[] } }>("/api/system")
      .then((j) => {
        if (!active || !j?.settings) return;
        if (j.settings.company && Object.keys(j.settings.company).length) setCompany((prev) => ({ ...prev, ...j.settings.company }));
        if (j.settings.brand && Object.keys(j.settings.brand).length) setBrand((prev) => ({ ...prev, ...j.settings.brand }));
        if (j.settings.numbering && j.settings.numbering.length) {
          const byObj = new Map(j.settings.numbering.map((r) => [r.object, r]));
          setNumbering(NUMBERING_ROWS.map((row) => byObj.get(row.object) ? { object: row.object, prefix: byObj.get(row.object)!.prefix, pattern: byObj.get(row.object)!.pattern, next: byObj.get(row.object)!.next || 1 } : row));
        }
        if (j.settings.notif && j.settings.notif.length) setNotif(j.settings.notif.map((r) => [r.event, !!r.inapp, !!r.email, !!r.slack, r.who || ""] as NotifRow));
        if (j.settings.fx && j.settings.fx.length) setFx(j.settings.fx.map((r) => [String(r[0]), String(r[1]), String(r[2]), String(r[3])]));
        if (j.settings.vat && Object.keys(j.settings.vat).length) setVat((prev) => ({ ...prev, ...j.settings.vat }));
        if (j.settings.banks && j.settings.banks.length) setBanks(j.settings.banks);
        if (j.settings.templates && j.settings.templates.length) setTpls(j.settings.templates);
        if (j.settings.retention && j.settings.retention.length) setRetention(j.settings.retention);
        if (j.settings.pii && j.settings.pii.length) setPii(j.settings.pii);
        if (j.settings.integrations && j.settings.integrations.length) setIntegrations(j.settings.integrations);
      })
      .catch((e) => {
        if (active) setApiError(e?.message || "Failed to load settings");
      });
    return () => { active = false; };
  }, []);

  const banner = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 3000); };

  const save = () => {
    const payload = {
      company,
      brand,
      numbering,
      notif: notif.map(([event, inapp, email, slack, who]) => ({ event, inapp, email, slack, who })),
      fx,
      vat,
      banks,
      templates: tpls,
      retention,
      pii,
      integrations,
    };
    fetchJSON<{ settings: Record<string, unknown> }>("/api/system", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(() => banner("Changes saved \u00b7 will take effect immediately"))
      .catch((e) => banner("Save failed \u00b7 " + (e?.message || "try again")));
  };

  const flipNotif = (rowIdx: number, colIdx: number) => {
    setNotif((prev) => prev.map((row, ri) => ri !== rowIdx ? row : [row[0], colIdx === 0 ? !row[1] : row[1], colIdx === 1 ? !row[2] : row[2], colIdx === 2 ? !row[3] : row[3], row[4]] as NotifRow));
    banner("Notification " + (["In-app", "Email", "Slack"][colIdx]) + " toggled for " + notif[rowIdx][0]);
  };

  const connectIntegration = (name: string) => {
    if (name === "Salesforce CRM") {
      setIntegrations((prev) => prev.map((i) => i.name === name ? { ...i, status: "Connected", note: "Optional \u00b7 lead import", ok: true } : i));
      banner("Salesforce CRM connected \u00b7 lead import enabled");
    } else {
      banner("Manage " + name + " \u00b7 connection healthy");
    }
  };

  const refreshFx = (cur: string) => {
    const now = new Date();
    const stamp = String(now.getDate()).padStart(2, "0") + " " + MONTHS_ABBR[now.getMonth()] + " " + String(now.getFullYear());
    setFx((prev) => prev.map((r) => r[0] === cur ? [r[0], r[1], "CBUAE \u00b7 manual", stamp] as [string, string, string, string] : r));
    banner("FX rate refreshed for " + cur);
  };

  const selTpl = tpls[tplSel] || tpls[0];
  const renderedBody = (selTpl?.body || "").replace(/\{\{(\w+)\}\}/g, (m, k) => MERGE_SAMPLES[k] || m);

  const insertMerge = (tok: string) => {
    setTpls((prev) => prev.map((t, ti) => ti === tplSel ? { ...t, body: t.body + (t.body ? "\n" : "") + tok } : t));
    banner("Merge field " + tok + " inserted");
  };

  const swapLang = (lang: string) => {
    const idx = tpls.findIndex((t, ti) => ti !== tplSel && t.name === selTpl.name && t.type === selTpl.type && t.lang === lang);
    if (idx >= 0) { setTplSel(idx); banner(selTpl.name + " \u00b7 " + lang + " variant selected"); }
    else banner("No " + lang + " variant saved for " + selTpl.name + " yet");
  };

  const toggleTplStatus = () => {
    setTpls((prev) => prev.map((t, ti) => ti === tplSel ? { ...t, status: t.status === "Active" ? "Draft" : "Active" } : t));
    banner(selTpl.name + " set to " + (selTpl.status === "Active" ? "Draft" : "Active"));
  };

  const testSend = () => {
    if (!selTpl) return;
    banner("Test " + selTpl.type.toLowerCase() + " sent to finance@ellington.ae \u00b7 check inbox");
  };

  const setRetentionVal = (label: string, v: string) => setRetention((prev) => prev.map(([l, rv]) => l === label ? [l, v] : [l, rv]));

  const flipPii = (rowIdx: number) => {
    setPii((prev) => prev.map((row, ri) => ri !== rowIdx ? row : [row[0], !row[1]] as [string, boolean]));
    banner("PII setting toggled for " + pii[rowIdx][0]);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), company, brand, numbering, notif }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ellington-settings-backup.json"; a.click();
    URL.revokeObjectURL(url);
    banner("Settings backup exported \u00b7 JSON");
  };

  const tabBtn = (on: boolean) => ({ height: 32, border: 0, borderRadius: 10, padding: "0 15px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: on ? "#F0EFFE" : "transparent", color: on ? AC : "#9AA0AE" });

  const fieldInput = (key: string, val: string, change: (k: string, v: string) => void) => (
    <input
      value={val}
      onChange={(e) => change(key, e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") save(); }}
      style={{ height: 32, borderRadius: 9, border: "1px solid #E4E6EE", padding: "0 10px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: "#fff", width: 180, boxSizing: "border-box", textAlign: "right" }}
    />
  );

  const toggleSwitch = (on: boolean, flip: () => void) => (
    <span onClick={flip} style={{ display: "block", width: 28, height: 16, borderRadius: 9, background: on ? AC : "#DDE0E8", cursor: "pointer", position: "relative" }}>
      <span style={{ position: "absolute", top: 2, width: 12, height: 12, borderRadius: 7, background: "#fff", left: on ? "14px" : "2px" }} />
    </span>
  );

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — showing defaults
        </div>
      )}
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
            {Object.keys(company).map((k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{k}</span>
                {fieldInput(k, company[k], (key, v) => setCompany((p) => ({ ...p, [key]: v })))}
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 14 }}>Brand &amp; locale</div>
            {Object.keys(brand).map((k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{k}</span>
                {fieldInput(k, brand[k], (key, v) => setBrand((p) => ({ ...p, [key]: v })))}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "financial" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 4 }}>Base currency &amp; FX rates</div>
            <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginBottom: 14 }}>Reporting currency AED \u00b7 rates from CBUAE daily fix</div>
            {fx.map((r) => (
              <div key={r[0]} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ width: 52, fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>{r[0]}</span>
                <input value={r[1]} onChange={(e) => setFx((prev) => prev.map((x) => x[0] === r[0] ? [x[0], e.target.value, x[2], x[3]] : x))} style={{ width: 76, height: 30, borderRadius: 9, border: "1px solid #E4E6EE", padding: "0 10px", fontSize: 11.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", textAlign: "right" }} />
                <span style={{ flex: 1, fontSize: 11, color: "#9AA0AE", fontWeight: 500 }}>{r[2]} \u00b7 {r[3]}</span>
                <button onClick={() => refreshFx(r[0])} style={{ height: 30, borderRadius: 9, border: "1px solid #EDEEF3", background: "#fff", padding: "0 12px", fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Refresh</button>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 14 }}>VAT &amp; fiscal policy</div>
            {Object.keys(vat).map((k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{k}</span>
                {fieldInput(k, vat[k], (key, v) => setVat((p) => ({ ...p, [key]: v })))}
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 12 }}>UAE VAT: residential off-plan sales are zero-rated (0%) \u00b7 commercial at 5%.</div>
          </div>
          <div style={{ gridColumn: "1 / -1", background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 4 }}>Bank accounts</div>
            <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginBottom: 10 }}>Escrow accounts are RERA-locked under Law No. 8 of 2007 — all buyer funds land here, never the operating account.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 2.6fr 140px", gap: 10, padding: "8px 0", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #F6F7FA" }}>
              <span>Bank</span><span>IBAN</span><span>Purpose</span>
            </div>
            {banks.map((b) => (
              <div key={b.iban} style={{ display: "grid", gridTemplateColumns: "1.6fr 2.6fr 140px", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{b.name}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#4A5060" }}>{b.iban}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: b.kind === "Escrow" ? "#B07B14" : "#6B7180", background: b.kind === "Escrow" ? "#FDF4E5" : "#EEF0F5", borderRadius: 8, padding: "4px 10px", width: "fit-content" }}>{b.kind}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "numbering" && (
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #EDEEF3" }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Numbering conventions</span>
            <span style={{ float: "right", fontSize: 11, color: "#9AA0AE", fontWeight: 600 }}>Prefixes, pattern &amp; next number — saved with the rest</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr 2.4fr 1.2fr 1.8fr", gap: 10, padding: "12px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #F6F7FA" }}>
            <span>Object</span><span>Prefix</span><span>Pattern</span><span style={{ textAlign: "right" }}>Next</span><span>Live preview</span>
          </div>
          {numbering.map((row, ri) => {
            const preview = row.prefix
              .replace("{project}", "H21").replace("{tower}", "1").replace("{type}", "30D").replace("{unit}", "WPK-T1-0210")
              .replace("{year}", "2026").replace("{seq}", String(row.next).padStart(4, "0"));
            return (
              <div key={row.object} style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr 2.4fr 1.2fr 1.8fr", gap: 10, alignItems: "center", padding: "10px 22px", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{row.object}</span>
                <input value={row.prefix} onChange={(e) => setNumbering((p) => p.map((r, i) => i === ri ? { ...r, prefix: e.target.value } : r))} style={{ height: 30, borderRadius: 9, border: "1px solid #E4E6EE", padding: "0 10px", fontSize: 11.5, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", color: AC, width: "100%", boxSizing: "border-box" }} />
                <input value={row.pattern} onChange={(e) => setNumbering((p) => p.map((r, i) => i === ri ? { ...r, pattern: e.target.value } : r))} style={{ height: 30, borderRadius: 9, border: "1px solid #E4E6EE", padding: "0 10px", fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", color: "#4A5060", width: "100%", boxSizing: "border-box" }} />
                <input value={row.next} type="number" onChange={(e) => setNumbering((p) => p.map((r, i) => i === ri ? { ...r, next: Number(e.target.value) || 1 } : r))} style={{ height: 30, borderRadius: 9, border: "1px solid #E4E6EE", padding: "0 10px", fontSize: 11.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", width: "100%", boxSizing: "border-box", textAlign: "right" }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "#1F9D6B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{preview}</span>
              </div>
            );
          })}
        </div>
      )}

      {tab === "templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #EDEEF3", fontSize: 13, fontWeight: 700 }}>Template library</div>
            {tpls.map((t, ti) => (
              <button key={t.name + t.lang + t.type} onClick={() => setTplSel(ti)} style={{ display: "flex", width: "100%", textAlign: "left", alignItems: "center", gap: 8, padding: "11px 20px", border: 0, borderBottom: "1px solid #F6F7FA", background: tplSel === ti ? "#F0EFFE" : "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: t.status === "Active" ? "#34C08A" : "#C2C6D2", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#14161F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                  <span style={{ display: "block", fontSize: 10, color: "#9AA0AE", fontWeight: 600 }}>{t.type} \u00b7 {t.lang} \u00b7 {t.status}</span>
                </span>
              </button>
            ))}
          </div>
          {selTpl && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>{selTpl.name}</div>
                  <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 2 }}>{selTpl.type} template \u00b7 {selTpl.lang}</div>
                </div>
                <select value={selTpl.lang} onChange={(e) => swapLang(e.target.value)} style={{ height: 34, borderRadius: 10, border: "1px solid #EDEEF3", padding: "0 10px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: "#fff" }}>
                  <option value="EN">English</option>
                  <option value="AR">العربية</option>
                </select>
                <button onClick={toggleTplStatus} style={{ height: 34, borderRadius: 10, border: "1px solid #EDEEF3", background: "#fff", padding: "0 12px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>{selTpl.status === "Active" ? "Set draft" : "Activate"}</button>
                <button onClick={testSend} style={{ height: 34, borderRadius: 10, border: 0, background: AC, color: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Test send</button>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Body with merge fields</div>
              <textarea
                value={selTpl.body}
                onChange={(e) => setTpls((prev) => prev.map((t, ti) => ti === tplSel ? { ...t, body: e.target.value } : t))}
                style={{ width: "100%", boxSizing: "border-box", minHeight: 150, borderRadius: 12, border: "1px solid #E4E6EE", padding: "12px 14px", fontSize: 12, fontWeight: 500, fontFamily: "inherit", lineHeight: 1.6, resize: "vertical", outline: "none" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#9AA0AE", textTransform: "uppercase", letterSpacing: ".05em" }}>Merge fields</span>
                {MERGE_FIELDS.map((f) => (
                  <button key={f} onClick={() => insertMerge(f)} style={{ height: 26, borderRadius: 8, border: "1px solid #EDEEF3", background: "#fff", padding: "0 9px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 700, color: AC, cursor: "pointer" }}>{f}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button onClick={() => setPreviewOpen(true)} style={{ height: 36, borderRadius: 11, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Preview rendered</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "notif" && (
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #EDEEF3" }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Notification matrix</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 80px 80px 80px", gap: 8, padding: "12px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #F6F7FA" }}>
            <span>Event</span><span>Who is notified</span><span style={{ textAlign: "center" }}>In-app</span><span style={{ textAlign: "center" }}>Email</span><span style={{ textAlign: "center" }}>Slack</span>
          </div>
          {notif.map((row, ri) => (
            <div key={row[0]} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 80px 80px 80px", gap: 8, alignItems: "center", padding: "0 22px", height: 48, borderBottom: "1px solid #F6F7FA" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{row[0]}</span>
              <input value={row[4]} onChange={(e) => { const v = e.target.value; setNotif((prev) => prev.map((r, i2) => i2 === ri ? [r[0], r[1], r[2], r[3], v] as NotifRow : r)); }} placeholder="Recipients…" style={{ height: 26, borderRadius: 8, border: "1px solid #EDEEF3", background: "#FAFBFD", padding: "0 8px", fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, color: "#14161F", boxSizing: "border-box", width: "100%" }} />
              {[row[1], row[2], row[3]].map((on, i) => (
                <span key={i} style={{ display: "flex", justifyContent: "center" }}>
                  {toggleSwitch(on, () => flipNotif(ri, i))}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === "integr" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {integrations.map((i) => (
            <div key={i.name} style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: i.ok ? "#34C08A" : "#DDE0E8" }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{i.name}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 500 }}>{i.note}</div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                {i.ok && <span style={{ fontSize: 10, fontWeight: 700, color: "#1F9D6B" }}>{i.status}</span>}
                <button onClick={() => connectIntegration(i.name)} style={{ height: 32, borderRadius: 10, border: "1px solid " + (i.ok ? "#EDEEF3" : AC), background: i.ok ? "#fff" : AC, color: i.ok ? "#4A5060" : "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{i.ok ? "Manage" : "Connect"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "data" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 4 }}>Retention policy</div>
            <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginBottom: 10 }}>Records are archived after the period, then scheduled for deletion by class.</div>
            {retention.map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{label}</span>
                <input value={val} onChange={(e) => setRetentionVal(label, e.target.value)} style={{ height: 32, borderRadius: 9, border: "1px solid #E4E6EE", padding: "0 10px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: "#fff", width: 110, boxSizing: "border-box", textAlign: "right" }} />
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 14 }}>PII handling</div>
            {pii.map((row, ri) => (
              <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, color: "#4A5060", fontWeight: 600 }}>{row[0]}</span>
                {toggleSwitch(row[1], () => flipPii(ri))}
              </div>
            ))}
          </div>
          <div style={{ gridColumn: "1 / -1", background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Backup &amp; transfer</div>
                <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 2 }}>Last full backup today \u00b7 03:00 GST \u00b7 encrypted + compressed \u00b7 1.8 GB</div>
              </div>
              <button onClick={() => banner("Backup started \u00b7 ETA 4 min \u00b7 you will be notified")} style={{ height: 36, borderRadius: 11, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Run backup now</button>
              <button onClick={exportJson} style={{ height: 36, borderRadius: 11, border: 0, background: AC, color: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", marginLeft: 10 }}>Export data (JSON)</button>
            </div>
            <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500 }}>Import from a previous backup is queued for review before it touches live rows. Manual DB-level import is available to Operators only.</div>
          </div>
        </div>
      )}

      {previewOpen && selTpl && (
        <div onMouseDown={() => setPreviewOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.42)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: "100%", background: "#fff", borderRadius: 20, padding: "24px 26px", boxShadow: "0 20px 60px rgba(20,22,31,.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: AC, borderRadius: 7, padding: "4px 9px", letterSpacing: ".05em" }}>{selTpl.type.toUpperCase()}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>{selTpl.name}</div>
                <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 500 }}>To: Hassan Al Rayes \u00b7 h.rayes@example.com \u00b7 EN</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: selTpl.status === "Active" ? "#1F9D6B" : "#6B7180", background: selTpl.status === "Active" ? "#E9F8F1" : "#EEF0F5", borderRadius: 8, padding: "4px 10px" }}>{selTpl.status}</span>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "#14161F", fontFamily: "inherit", background: "#FAFBFD", border: "1px solid #EDEEF3", borderRadius: 14, padding: "16px 18px" }}>{renderedBody}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setPreviewOpen(false)} style={{ height: 36, borderRadius: 11, background: AC, color: "#fff", border: 0, padding: "0 18px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Close preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}