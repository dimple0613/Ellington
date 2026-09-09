import { useMemo, useState } from "react";
import { AC, compact } from "../../lib/format";

type Tower = { name: string; floors: number };
type UnitType = { name: string; beds: number; area: number; count: number };
type Milestone = { name: string; pct: number };

const STEP_KEYS = ["identity", "legal", "towers", "types", "plan", "team"] as const;
type StepKey = (typeof STEP_KEYS)[number];

const STEP_META: Record<StepKey, { t: string; sub: string }> = {
  identity: { t: "Name & scope", sub: "Code, location, GDV" },
  legal: { t: "Legal & escrow", sub: "DLD, RERA, escrow IBAN" },
  towers: { t: "Towers & floors", sub: "Structure" },
  types: { t: "Unit types", sub: "Mix & pricing basis" },
  plan: { t: "Payment schedule", sub: "Milestones to 100%" },
  team: { t: "Team & commission", sub: "Agents + broker rate" },
};

const COMPLIANCE_FIELDS: { key: string; label: string; field: "dld_no" | "rera_permit" | "escrow_iban" }[] = [
  { key: "dld", label: "DLD number", field: "dld_no" },
  { key: "rera", label: "RERA permit No.", field: "rera_permit" },
  { key: "iban", label: "Escrow IBAN", field: "escrow_iban" },
];

const STYLE = {
  fieldBox: { width: "100%", boxSizing: "border-box" as const, height: 38, borderRadius: 11, border: "1px solid #EDEEF3", background: "#FAFBFD", padding: "0 12px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, outline: "none" },
  label: { fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" as const },
  ghost: { height: 34, borderRadius: 10, border: "1px solid #EDEEF3", background: "#fff", padding: "0 12px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" },
  primary: { height: 34, borderRadius: 10, border: 0, background: AC, color: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer" },
};

export type CreatedProject = {
  id: number;
  code: string;
  name: string;
  location: string;
  units: number;
  gdv: number;
};

export default function ProjectWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: CreatedProject) => void;
}) {
  if (!open) return null;

  return <WizardInner onClose={onClose} onCreated={onCreated} />;
}

function WizardInner({ onClose, onCreated }: { onClose: () => void; onCreated: (p: CreatedProject) => void }) {
  const [step, setStep] = useState<number>(0);
  const [form, setForm] = useState({
    name: "",
    code: "",
    location: "",
    gdv: "",
    dld_no: "",
    rera_permit: "",
    escrow_iban: "",
    escrow_bank: "",
  });
  const [towers, setTowers] = useState<Tower[]>([{ name: "Tower 1", floors: 24 }]);
  const [types, setTypes] = useState<UnitType[]>([{ name: "1BR", beds: 1, area: 720, count: 96 }]);
  const [plan, setPlan] = useState<Milestone[]>([{ name: "Booking 10%", pct: 10 }, { name: "Handover", pct: 90 }]);
  const [agents, setAgents] = useState("");
  const [brokerCommission, setBrokerCommission] = useState("2.0");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const codeOf = (name: string) =>
    name
      .replace(/\s+/g, "")
      .split(/(?=[A-Z])/)
      .map((c) => c[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() || "NEW";

  const compliance = {
    dld_no: form.dld_no.trim(),
    rera_permit: form.rera_permit.trim(),
    escrow_iban: form.escrow_iban.trim(),
  };
  const complianceOk = Boolean(compliance.dld_no && compliance.rera_permit && compliance.escrow_iban);
  const missingCompliance = COMPLIANCE_FIELDS.filter((c) => !compliance[c.field].trim());

  const planTotal = plan.reduce((a, m) => a + (Number(m.pct) || 0), 0);
  const plannedUnits = types.reduce((a, t) => a + (Number(t.count) || 0), 0);
  const towerCount = towers.reduce((a, t) => a + (Number(t.floors) || 0), 0);
  const gdv = parseFloat(form.gdv) || 0;

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const canNext = () => {
    if (step === 0) {
      if (!form.name.trim() || !form.location.trim()) return "Project name and location are required.";
      if (!gdv || gdv <= 0) return "Enter a valid GDV.";
      return null;
    }
    if (step === 1) {
      const missing = missingCompliance.map((c) => c.label).join(", ");
      if (missing) return "Sales-blocking compliance fields missing: " + missing;
      return null;
    }
    if (step === 2) {
      if (!towers.length) return "Add at least one tower.";
      if (towers.some((t) => !t.name.trim() || !t.floors || t.floors < 1)) return "Every tower needs a name and a floor count.";
      return null;
    }
    if (step === 3) {
      if (!types.length) return "Add at least one unit type.";
      if (types.some((t) => !t.name.trim() || !t.count || t.count < 1)) return "Every unit type needs a name and a count.";
      return null;
    }
    if (step === 4) {
      if (!plan.length) return "Add at least one payment milestone.";
      if (planTotal !== 100) return "Payment schedule must total exactly 100% (currently " + planTotal + "%).";
      return null;
    }
    return null;
  };

  const next = () => {
    const msg = canNext();
    if (msg) { setErr(msg); return; }
    setErr("");
    if (step < STEP_KEYS.length - 1) setStep(step + 1);
    else void create();
  };

  const back = () => {
    setErr("");
    setStep((s) => Math.max(0, s - 1));
  };

  const create = async () => {
    setBusy(true);
    setErr("");
    const payload = {
      code: form.code || codeOf(form.name),
      name: form.name.trim(),
      location: form.location.trim(),
      units_total: plannedUnits || towerCount,
      gdv: gdv * 1000000,
      dld_no: compliance.dld_no || null,
      rera_permit: compliance.rera_permit || null,
      escrow_iban: compliance.escrow_iban || null,
      escrow_bank: form.escrow_bank.trim() || null,
      setup: {
        towers,
        unit_types: types,
        payment_plan: plan,
        team: {
          agents: agents.split(",").map((a) => a.trim()).filter(Boolean),
          broker_commission: parseFloat(brokerCommission) || 0,
        },
        compliance,
      },
    };
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to create project");
      onCreated({
        id: json.data.id,
        code: payload.code,
        name: payload.name,
        location: payload.location,
        units: payload.units_total || 0,
        gdv: payload.gdv,
      });
    } catch (e: any) {
      setErr(e?.message || "Failed to create project");
      setBusy(false);
    }
  };

  const summary = useMemo(() => {
    if (!form.name.trim() && !towers.length && !types.length && plan.length <= 2 && !brokerCommission) return null;
    const unitCount = types.reduce((a, t) => a + (Number(t.count) || 0), 0) || towerCount;
    return [
      ["Project", form.name || "Untitled project"],
      ["Code", form.code || codeOf(form.name)],
      ["Location", form.location || "\u2014"],
      ["GDV", form.gdv ? compact(gdv * 1000000) : "\u2014"],
      ["Structure", towers.map((t) => t.name + " \u00b7 " + t.floors + "F").join(", ") || "\u2014"],
      ["Unit types", types.map((t) => t.name + " \u00d7" + t.count).join(", ") || "\u2014"],
      ["Units", String(unitCount || 0)],
      ["Payment plan", plan.map((m) => m.name + " " + m.pct + "%").join(" \u00b7 ") || "\u2014"],
      ["Team", agents.split(",").map((a) => a.trim()).filter(Boolean).length + " agents"],
    ] as [string, string][];
  }, [form, towers, types, plan, agents, gdv, towerCount, brokerCommission]);

  const steps = STEP_KEYS.map((k) => STEP_META[k]);

  return (
    <div onMouseDown={() => { if (!busy) { onClose(); setErr(""); } }} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.46)", display: "grid", placeItems: "center", zIndex: 85, padding: 24 }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ display: "flex", background: "#fff", borderRadius: 24, overflow: "hidden", width: "100%", maxWidth: 900, maxHeight: "92vh", boxShadow: "0 32px 80px rgba(20,22,31,.3)" }}>
        {/* rail */}
        <div style={{ width: 214, flex: "none", background: "#F7F8FB", borderRight: "1px solid #EDEEF3", padding: "22px 16px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>New project</div>
          <div style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 500, marginTop: 3 }}>Six steps to launch</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 18 }}>
            {steps.map((s, i) => {
              const done = i < step;
              const active = i === step;
              const locked = !done && !active;
              return (
                <button
                  key={s.t}
                  onClick={() => { if (!active) { setStep(i); setErr(""); } }}
                  style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 9px", border: 0, background: active ? "#F0EFFE" : "transparent", borderRadius: 11, cursor: locked && !active ? "not-allowed" : "pointer", fontFamily: "inherit", textAlign: "left", opacity: locked && !active ? 0.55 : 1 }}
                >
                  <span style={{ width: 23, height: 23, flex: "none", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 800, background: done ? "#34C08A" : active ? AC : "#E7E9F0", color: done || active ? "#fff" : "#9AA0AE" }}>{done ? "\u2713" : String(i + 1)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 11.5, fontWeight: active ? 800 : 700, color: active ? AC : "#4A5060" }}>{s.t}</span>
                    <span style={{ display: "block", fontSize: 10, color: "#9AA0AE", fontWeight: 500, marginTop: 1 }}>{s.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 18, border: "1px solid " + (complianceOk ? "#CBE9DD" : "#F2D7C3"), borderRadius: 13, padding: "11px 12px", background: complianceOk ? "#F2FBF6" : "#FEF6EF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, flex: "none", borderRadius: 5, background: complianceOk ? "#1F9D6B" : "#E5484D" }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: complianceOk ? "#1F9D6B" : "#C0392B" }}>{complianceOk ? "Sales enabled" : "Sales blocked"}</span>
            </div>
            <div style={{ fontSize: 10.5, color: "#6B7180", fontWeight: 500, marginTop: 5, lineHeight: 1.5 }}>
              {complianceOk
                ? "DLD, RERA & escrow IBAN on record. Units may go on sale."
                : "Enter " + COMPLIANCE_FIELDS.map((c) => c.label).join(", ") + " to unlock sales."}
            </div>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", maxHeight: "92vh" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 18px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>{steps[step].t}</div>
                <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 3 }}>{steps[step].sub}</div>
              </div>
              {step < 4 && <div style={{ fontSize: 10, fontWeight: 700, color: "#9AA0AE", letterSpacing: ".05em", textTransform: "uppercase" }}>Step {step + 1} of 6</div>}
            </div>

            {step === 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
                <Field label="Project name" value={form.name} onChange={set("name")} ph="e.g. Belgravia Heights IV" span />
                <Field label="Project code" value={form.code} onChange={(v) => set("code")(v.toUpperCase().slice(0, 3))} ph={codeOf(form.name) || "CRD"} mono />
                <div style={{ display: "flex", gap: 14 }}>
                  <Field label="Location" value={form.location} onChange={set("location")} ph="e.g. Dubai Hills Estate" />
                  <Field label="GDV (AED M)" value={form.gdv} onChange={set("gdv")} ph="e.g. 240" num width={120} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="DLD number" value={form.dld_no} onChange={set("dld_no")} ph="e.g. DLD-76142" ok={!!form.dld_no.trim()} />
                  <Field label="RERA permit No." value={form.rera_permit} onChange={set("rera_permit")} ph="e.g. RERA-12974" ok={!!form.rera_permit.trim()} />
                  <Field label="Escrow IBAN" value={form.escrow_iban} onChange={set("escrow_iban")} ph="AE07 0261 0000 1203 4567 890" ok={!!form.escrow_iban.trim()} />
                  <Field label="Escrow bank" value={form.escrow_bank} onChange={set("escrow_bank")} ph="e.g. Mashreq Bank" />
                </div>
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, background: complianceOk ? "#E9F8F1" : "#FDF4E5", borderRadius: 12, padding: "12px 14px" }}>
                  <span style={{ width: 9, height: 9, flex: "none", borderRadius: 5, background: complianceOk ? "#1F9D6B" : "#E2A33C" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: complianceOk ? "#1F9D6B" : "#8A6410", lineHeight: 1.5 }}>
                    {complianceOk
                      ? "Compliance complete \u2014 the project may be put on sale."
                      : "Sales stay blocked until " + missingCompliance.map((c) => c.label).join(", ") + (missingCompliance.length ? " are entered." : ".")}
                  </span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ marginTop: 18 }}>
                <ListEditor
                  hint="Tower name + floor count (ground = floor 1)"
                  onAdd={(values) => {
                    const name = (values[0] || "").trim() || "Tower " + (towers.length + 1);
                    const floors = parseInt(values[1] || "0", 10) || 24;
                    setTowers((t) => [...t, { name, floors }]);
                  }}
                  onRemove={(i) => setTowers((t) => t.filter((_, j) => j !== i))}
                  onPatch={(i, k, v) => setTowers((t) => t.map((r, j) => (j === i ? { ...r, [k]: k === "floors" ? (parseInt(v, 10) || 0) : v } : r)))}
                  columns={[
                    { key: "name", label: "Tower", ph: "Tower 2" },
                    { key: "floors", label: "Floors", ph: "30", num: true, w: 90 },
                  ]}
                  rows={towers}
                />
                <div style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600, marginTop: 12 }}>
                  {towers.length} tower{towers.length === 1 ? "" : "s"} \u00b7 {towerCount.toLocaleString("en-US")} floors total
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ marginTop: 18 }}>
                <ListEditor
                  hint="Unit type, beds, average area & count to generate"
                  onAdd={(values) => {
                    const name = (values[0] || "").trim() || "2BR";
                    const beds = parseInt(values[1] || "0", 10) || 1;
                    const area = parseFloat(values[2] || "0") || 700;
                    const count = parseInt(values[3] || "0", 10) || 1;
                    setTypes((t) => [...t, { name, beds, area, count }]);
                  }}
                  onRemove={(i) => setTypes((t) => t.filter((_, j) => j !== i))}
                  onPatch={(i, k, v) => setTypes((t) => t.map((r, j) => (j === i ? { ...r, [k]: k === "name" ? v : (k === "area" ? (parseFloat(v) || 0) : (parseInt(v, 10) || 0)) } : r)))}
                  columns={[
                    { key: "name", label: "Type", ph: "2BR-B" },
                    { key: "beds", label: "Beds", ph: "2", num: true, w: 70 },
                    { key: "area", label: "Area sq.ft", ph: "980", num: true, w: 100 },
                    { key: "count", label: "Count", ph: "48", num: true, w: 80 },
                  ]}
                  rows={types}
                />
                <div style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600, marginTop: 12 }}>
                  {plannedUnits.toLocaleString("en-US")} units planned across {types.length} type{types.length === 1 ? "" : "s"}
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ marginTop: 18 }}>
                <ListEditor
                  hint="Milestone name + percentage of contract value"
                  onAdd={(values) => {
                    const name = (values[0] || "").trim() || "Installment " + (plan.length + 1);
                    const pct = parseFloat(values[1] || "0") || 0;
                    setPlan((p) => [...p, { name, pct }]);
                  }}
                  onRemove={(i) => setPlan((p) => p.filter((_, j) => j !== i))}
                  onPatch={(i, k, v) => setPlan((p) => p.map((r, j) => (j === i ? { ...r, [k]: k === "pct" ? (parseFloat(v) || 0) : v } : r)))}
                  columns={[
                    { key: "name", label: "Milestone", ph: "Structure 40%" },
                    { key: "pct", label: "% of contract", ph: "20", num: true, w: 120 },
                  ]}
                  rows={plan}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7180" }}>Schedule total</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: planTotal === 100 ? "#1F9D6B" : "#E5484D" }}>{planTotal}%</span>
                  {planTotal === 100
                    ? <span style={{ fontSize: 10.5, fontWeight: 700, background: "#E9F8F1", color: "#1F9D6B", borderRadius: 7, padding: "3px 8px" }}>Balanced</span>
                    : <span style={{ fontSize: 10.5, fontWeight: 700, background: "#FDECEC", color: "#E5484D", borderRadius: 7, padding: "3px 8px" }}>{planTotal < 100 ? "Undersubscribed" : "Oversubscribed"}</span>}
                </div>
              </div>
            )}

            {step === 5 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 14 }}>
                  <Field label="Sales agents (comma-separated)" value={agents} onChange={setAgents} ph="Reema, John D, Sana, Yusuf" />
                  <Field label="Broker commission %" value={brokerCommission} onChange={setBrokerCommission} ph="2.0" num />
                </div>
                <div style={{ marginTop: 18, background: "#F7F8FB", borderRadius: 16, padding: "16px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "-.01em" }}>Live summary</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", marginTop: 10 }}>
                    {summary && summary.map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "5px 0", borderBottom: "1px solid #ECEEF5" }}>
                        <span style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 500 }}>{k}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "70%" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {err && <div style={{ fontSize: 12, fontWeight: 600, color: "#E5484D", background: "#FDECEC", borderRadius: 10, padding: "10px 13px", marginTop: 14 }}>{err}</div>}
          </div>

          <div style={{ flex: "none", borderTop: "1px solid #EDEEF3", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
            <button onClick={() => { onClose(); setErr(""); }} disabled={busy} style={{ ...STYLE.ghost, opacity: busy ? 0.6 : 1 }}>Cancel</button>
            <div style={{ display: "flex", gap: 10 }}>
              {step > 0 && step < 5 && <button onClick={back} style={STYLE.ghost}>Back</button>}
              {step < 5 && <button onClick={next} style={STYLE.primary}>Next</button>}
              {step === 5 && (
                <button onClick={next} disabled={busy} style={{ ...STYLE.primary, background: complianceOk ? AC : "#9AA0AE", opacity: busy ? 0.7 : 1 }}>
                  {busy ? "Creating\u2026" : complianceOk ? "Create project" : "Review compliance"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ph,
  num,
  mono,
  span,
  ok,
  width,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  ph?: string;
  num?: boolean;
  mono?: boolean;
  span?: boolean;
  ok?: boolean;
  width?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, gridColumn: span ? "1 / -1" : undefined, width }}>
      <span style={STYLE.label}>{label}</span>
      <div style={{ position: "relative" }}>
        <input
          type={num ? "number" : "text"}
          value={value}
          placeholder={ph}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...STYLE.fieldBox, border: "1px solid " + (ok === true ? "#CBE9DD" : ok === false ? "#F2C3C3" : "#EDEEF3"), paddingRight: ok != null ? 34 : 12, fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit" }}
        />
        {ok === true && <span style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: "#1F9D6B", fontSize: 13, fontWeight: 800 }}>\u2713</span>}
        {ok === false && <span style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: "#E5484D", fontSize: 13, fontWeight: 800 }}>!</span>}
      </div>
    </label>
  );
}

function ListEditor({
  rows,
  columns,
  hint,
  onAdd,
  onRemove,
  onPatch,
}: {
  rows: { [k: string]: string | number }[];
  columns: { key: string; label: string; ph?: string; num?: boolean; w?: number }[];
  hint: string;
  onAdd: (values: string[]) => void;
  onRemove: (i: number) => void;
  onPatch: (i: number, key: string, value: string) => void;
}) {
  const [draft, setDraft] = useState<string[]>([]);
  return (
    <div>
      <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 500, marginBottom: 10 }}>{hint}</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          {columns.map((c) => (
            <input
              key={c.key}
              value={String(r[c.key] ?? "")}
              onChange={(e) => onPatch(i, c.key, e.target.value)}
              placeholder={c.ph}
              type={c.num ? "number" : "text"}
              style={{ ...STYLE.fieldBox, width: c.w || "100%", flex: c.w ? "none" : 1, background: "#fff" }}
            />
          ))}
          <button onClick={() => onRemove(i)} style={{ width: 30, height: 30, flex: "none", borderRadius: 9, border: 0, background: "#FDECEC", color: "#E5484D", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>\u00d7</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {columns.map((c, idx) => (
          <input
            key={c.key}
            value={draft[idx] ?? ""}
            onChange={(e) => setDraft((d) => { const n = [...d]; n[idx] = e.target.value; return n; })}
            placeholder={c.ph}
            type={c.num ? "number" : "text"}
            style={{ ...STYLE.fieldBox, width: c.w || "100%", flex: c.w ? "none" : 1, background: "#fff", border: "1px dashed #D9DCE7" }}
          />
        ))}
      </div>
      <button
        onClick={() => { onAdd(draft); setDraft([]); }}
        style={{ ...STYLE.primary, marginTop: 10, background: "#14161F" }}
      >
        Add row
      </button>
    </div>
  );
}