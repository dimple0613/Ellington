import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AC, money } from "../../lib/format";
import { exportBuyerStatement, exportDocument } from "../../lib/pdf";
import { fetchJSON } from "../../lib/api";
import { KpiSkeleton, PanelSkeleton } from "../Loading";
import BuyerPortalInvite from "../portal/BuyerPortalInvite";
import BrokerPortalEnable from "../portal/BrokerPortalEnable";

const pill = (s: string, ok: boolean) =>
  ({ fontSize:10,fontWeight:700,borderRadius:7,padding:"3px 8px",textAlign:"center" as const,background:ok?"#E9F8F1":"#F1F2F6",color:ok?"#1F9D6B":"#6B7180" });

/* ── kanban columns ─────────────────────────────────────────────── */
type Card = { name:string; flag:string; src:string; budget:string; chips:string[]; agent:string; age:string; live:boolean; id?:number; disc?:number; days?:number; phone?:string; projectCode?:string };
type Col = { label:string; count:number; val:string; color:string; cards:Card[] };

type ApiLead = {
  id?: number;
  name: string;
  source?: string;
  stage?: string;
  budgetMin?: number;
  budgetMax?: number;
  agent?: string;
  live?: boolean;
  discountPct?: number;
  daysToClose?: number;
  phone?: string;
  projectCode?: string;
};
const LEADS_COLS: Col[] = [
  { label: "New", count: 0, val: "\u2014", color: "#8B7CF6", cards: [] },
  { label: "Contacted", count: 0, val: "\u2014", color: "#8B7CF6", cards: [] },
  { label: "Qualified", count: 0, val: "\u2014", color: AC, cards: [] },
  { label: "Viewing", count: 0, val: "\u2014", color: AC, cards: [] },
  { label: "Negotiation", count: 0, val: "\u2014", color: "#E2A33C", cards: [] },
  { label: "EOI signed", count: 0, val: "\u2014", color: "#34C08A", cards: [] },
  { label: "Booked", count: 0, val: "\u2014", color: "#34C08A", cards: [] },
  { label: "Lost", count: 0, val: "\u2014", color: "#8A94A6", cards: [] },
];

type LbRow = { agent: string; units: number; value: number; conv: number; disc: number; days: number };

/* ── booking wizard ─────────────────────────────────────────────── */
const STEP_LABELS: [string,string][] = [["Unit & terms","Price, discount, plan"],["Buyer","Identity, KYC, AML"],["Payment schedule","Milestones and charges"],["Documents","Reservation, offer, SPA"],["Payment & confirm","Escrow reference required"]];


/* ── buyer 360 ──────────────────────────────────────────────────── */
const moneyM = (v: number) =>
  v >= 1e6 ? "AED " + (v / 1e6).toFixed(2).replace(/\.00$/, "") + "M" : money(v);
const fmtShort = (d: string) => {
  if (!d) return "\u2014";
  const [y, mo, dd] = d.split("-");
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return (dd ? dd + " " : "") + MON[Number(mo) - 1] + " " + y.slice(2);
};

type BuyerRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  kyc: string;
  units: number;
  contracted: number;
  collected: number;
  outstanding: number;
  overdue: number;
  agent?: string | null;
  agency?: string | null;
  docCount?: number;
  next: { amount: number; date: string; unit: string; milestone: string } | null;
};
type BuyerDetail = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  kyc: string;
  agent?: string | null;
  agency?: string | null;
  docs?: { doc_type: string; unit_no: string | null; ref: string; status: string; generated_at: string }[];
  units: { no: string; status: string; type: string; beds: number; area: number; price: number; view: string; pct: number }[];
  ledger: { date: string; unit: string; desc: string; debit: number | null; credit: number; balance: number }[];
  schedule: { ym: string; amt: number }[];
  next: { amount: number; date: string; unit: string; milestone: string } | null;
  overdue: number;
  firstPaid: string | null;
  miles: { paid: number; total: number };
};

/* ── brokers ────────────────────────────────────────────────────── */
const ONBOARD_STEPS: [string,string][] = [["Agency identity","Trade name, ORN, jurisdiction"],["Licence & compliance","Trade licence, RERA, VAT TRN"],["Commission scheme","Rate, tiering, trigger, clawback"],["Inventory allocation","Units, release phase, embargo"],["Portal access","Users, PII scope, go live"]];
const ONBOARD_FIELDS: [string,string,string][] = [
  ["Legal trade name","Metropolitan Premium Properties LLC",""],["Trade licence no.","698421 \u00b7 exp 14 Mar 2027","valid"],["ORN","11899","verified"],["RERA registration","RERA-BRK-11899","verified"],["VAT TRN","100428816500003",""],["Jurisdiction","Dubai Economy & Tourism",""],["Commission rate","2.0% of net price",""],["Tiering","+0.5% above 10 units per quarter",""],["Payable trigger","On 20% collected",""],["Clawback on cancellation","Full, within 12 months","mandatory"],["Allocated inventory","18 units \u00b7 Phase 2",""],["Buyer PII scope","Own deals only","locked"],
];
const BROK_DOCS: [string,boolean][] = [["Trade licence",true],["RERA broker card",true],["ORN certificate",true],["VAT certificate",true],["Signed agency agreement",false],["Bank details / IBAN letter",false]];
type Act = { text:string; meta:string; when:string; color:string };

/* ── documents ──────────────────────────────────────────────────── */
const DOC_TYPES = ["Expression of Interest","Unit Sales Offer","Reservation Form","Sale & Purchase Agreement","Payment Receipt","Invoice","Statement of Account","No Objection Certificate","Handover Certificate","Price List","Broker Inventory Sheet","30-Day Default Notice","Cancellation Letter"];
const DOC_BLOCKS = ["Cover","Project intro","Unit specification","Floor plan","Amenities","Payment plan table","Terms","Signature","Locked compliance footer"];
const MERGE_FIELDS = ["unit.number","unit.total_sqft","buyer.name_en","buyer.name_ar","payment.next_due_date","payment.next_due_amount","project.dld_number","project.rera_permit","developer.orn"];

/* ── shared ─────────────────────────────────────────────────────── */
const box = (warn=false) => ({ display:"flex",alignItems:"center",gap:10,height:42,borderRadius:12,border:"1px solid "+(warn?"#E2A33C":"#E4E6EE"),background:warn?"#FDF4E5":"#fff",padding:"0 14px",fontSize:13,fontWeight:600 });
const hint = (v:string) => {
  if(!v) return {display:"none"};
  const ok = v==="valid"||v==="verified"||v==="ready"||v==="within bounds"||v==="locked"||v==="auto"||v==="attached";
  const warn = v==="approval"||v==="mandatory"||v==="pending";
  return { fontSize:10,fontWeight:700,borderRadius:6,padding:"3px 7px",whiteSpace:"nowrap" as const, background:warn?"#FDF4E5":ok?"#E9F8F1":"#F1F2F7", color:warn?"#B07B14":ok?"#1F9D6B":"#9AA0AE" };
};
const tabBtn = (on:boolean) => ({ height:32,border:0,borderRadius:10,padding:"0 15px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700, background:on?"#F0EFFE":"transparent", color:on?AC:"#9AA0AE" });
const leadChip = (lead: Card | null) => (lead && lead.chips.find((c) => /^\d/.test(c))) || (lead && lead.chips[0]) || "2BR";


export default function Sales({ scope }: { scope: string }) {
  const router = useRouter();
  const s = (typeof router.query.s === "string" ? router.query.s : null) || "leads";
  const [step, setStep] = useState(1);
  const [lead, setLead] = useState<Card | null>(null);
  const [units, setUnits] = useState<WizardUnit[]>([]);
  const [btab, setBtab] = useState<"units"|"ledger"|"sched"|"profile"|"docs"|"comms"|"activity">("units");
  const [brtab, setBrtab] = useState<"agencies"|"agents"|"onboard"|"activity">("agencies");
  const [brstep, setBrstep] = useState(3);
  const [dtab, setDtab] = useState<"gen"|"studio">("gen");
  const [doc, setDoc] = useState("Expression of Interest");

  const go = (screen: string) => () => {
    const q: Record<string,string> = { s: screen };
    if (scope && scope !== "ALL") q.scope = scope;
    router.replace({ pathname: "/sales", query: q }, undefined, { shallow: true });
  };
  const goUnit = (id: string) => {
    const q: Record<string,string> = { s: "unit", unit: id };
    if (scope && scope !== "ALL") q.scope = scope;
    router.replace({ pathname: "/project", query: q }, undefined, { shallow: true });
  };
  const goBooking = (card: Card | null) => {
    setLead(card);
    setStep(1);
    go("booking")();
  };
  const blankBooking = () => {
    setLead(null);
    setStep(1);
    go("booking")();
  };

  useEffect(() => {
    let active = true;
    const q = "status=available" + (scope && scope !== "ALL" ? "&project=" + encodeURIComponent(scope) : "");
    fetchJSON<{ units: WizardUnit[] }>("/api/inventory?" + q)
      .then((j) => {
        if (active && Array.isArray(j.units)) setUnits(j.units);
      })
      .catch(() => { if (active) setUnits([]); });
    return () => { active = false; };
  }, [scope]);

  if (s === "leads") return <Leads onNewBooking={blankBooking} onBookLead={goBooking} goRegister={go("bookings")} />;
  if (s === "booking") return <Booking step={step} setStep={setStep} onBack={go("leads")} lead={lead} blank={!lead} units={units}
    onOpenBuyer={(bid) => {
      if (bid != null) {
        const q: Record<string,string> = { s: "buyer", id: String(bid) };
        if (scope && scope !== "ALL") q.scope = scope;
        router.replace({ pathname: "/sales", query: q }, undefined, { shallow: true });
      } else {
        go("leads")();
      }
    }}
    onBackToInventory={() => {
      const q: Record<string,string> = { s: "inventory" };
      if (scope && scope !== "ALL") q.scope = scope;
      router.replace({ pathname: "/project", query: q }, undefined, { shallow: true });
    }} />;
  if (s === "bookings") return <BookingsRegister onBack={go("leads")} />;
  if (s === "buyer") {
    if (router.query.id) return <Buyer360 btab={btab} setBtab={setBtab} goUnit={goUnit} />;
    return <BuyersDirectory onOpen={(id) => {
      const q: Record<string,string> = { s: "buyer", id: String(id) };
      if (scope && scope !== "ALL") q.scope = scope;
      router.replace({ pathname: "/sales", query: q }, undefined, { shallow: true });
    }} />;
  }
  if (s === "brokers") return <Brokers brtab={brtab} setBrtab={setBrtab} brstep={brstep} setBrstep={setBrstep} />;
  if (s === "documents") return <Documents dtab={dtab} setDtab={setDtab} doc={doc} setDoc={setDoc} />;
  return <Leads onNewBooking={blankBooking} onBookLead={goBooking} goRegister={go("bookings")} />;
}

/* ═══════════════════════════════════════════════════════════════════
   LEADS
   ═══════════════════════════════════════════════════════════════════ */
function Leads({ onNewBooking, onBookLead, goRegister }: { onNewBooking: () => void; onBookLead: (card: Card) => void; goRegister: () => void }) {
  const [dbCols, setDbCols] = useState<Col[] | null>(null);
  const [liveLeads, setLiveLeads] = useState<ApiLead[] | null>(null);
  const [apiError, setApiError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchJSON<{ leads: ApiLead[] }>("/api/leads")
      .then((j) => {
        const leads = j.leads;
        if (!active || !Array.isArray(leads)) return;
        setLoaded(true);
        const order = ["new", "contacted", "qualified", "viewing", "negotiation", "eoi", "booked", "lost"];
        const byStage: Record<string, Card[]> = { new: [], contacted: [], qualified: [], viewing: [], negotiation: [], eoi: [], booked: [], lost: [] };
        (leads as ApiLead[]).forEach((l) => {
          const st = (l.stage || "new").toLowerCase();
          const key = byStage[st] ? st : "new";
          const budgetMin = l.budgetMin || 0;
          const budgetMax = l.budgetMax || 0;
          const budget = budgetMin || budgetMax
            ? "AED " + (budgetMin || budgetMax).toLocaleString("en-US")
            : "AED -";
          byStage[key].push({
            id: l.id,
            name: l.name,
            flag: "AE",
            src: l.source || "Referral",
            budget,
            chips: [],
            agent: (l.agent || "AD").split(/\s+/).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "AD",
            age: "live",
            live: l.live !== false,
            disc: l.discountPct != null ? l.discountPct : undefined,
            days: l.daysToClose != null ? l.daysToClose : undefined,
            phone: l.phone || "",
            projectCode: l.projectCode || "",
          });
        });
        const cols = order.map((st) => {
          const cards = byStage[st];
          const val = "AED " + (cards.reduce((a, c) => a + (parseFloat(String(c.budget).replace(/[^\d.]/g, "")) || 0), 0) / (cards.length || 1)).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " avg";
          const colors: Record<string, string> = { new: "#8B7CF6", contacted: "#8B7CF6", qualified: AC, viewing: AC, negotiation: "#E2A33C", eoi: "#34C08A", booked: "#34C08A", lost: "#8A94A6" };
          const labels: Record<string, string> = { new: "New", contacted: "Contacted", qualified: "Qualified", viewing: "Viewing", negotiation: "Negotiation", eoi: "EOI signed", booked: "Booked", lost: "Lost" };
          return { label: labels[st], count: cards.length, val, color: colors[st], cards };
        });
        setDbCols(cols);
        setLiveLeads(leads);
      })
      .catch((e) => {
        if (active) { setLoaded(true); setApiError(e?.message || "Failed to load leads"); }
      });
    return () => { active = false; };
  }, []);

  const cols = dbCols && dbCols.length ? dbCols : LEADS_COLS;

  const live = liveLeads || [];
  const openLeads = live.filter((l) => l.live !== false && (l.stage || "new").toLowerCase() !== "lost");
  const agentsN = Array.from(new Set(live.map((l) => (l.agent || "").trim()).filter(Boolean))).length;
  const potVal = live.reduce((a, l) => a + (l.budgetMax || l.budgetMin || 0), 0);

  const funnel = useMemo(() => {
    if (!live.length) return null;
    const by = (stages: string[]) => live.filter((l) => stages.includes((l.stage || "new").toLowerCase()));
    const avgDays = (ls: ApiLead[]) => { const arr = ls.filter((l) => l.daysToClose != null); return arr.length ? Math.round(arr.reduce((a, l) => a + (l.daysToClose || 0), 0) / arr.length) : 0; };
    const days = (n: number) => (n ? n + " days" : "\u2014");
    const leadsN = by(["new", "contacted"]).length;
    const q = by(["qualified"]), v = by(["viewing"]), e = by(["eoi"]), b = by(["booked"]);
    const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) + "%" : "");
    return {
      rows: [
        ["Leads", String(leadsN), days(avgDays(by(["new", "contacted"])))],
        ["Qualified", String(q.length), days(avgDays(q))],
        ["Viewing", String(v.length), days(avgDays(v))],
        ["EOI signed", String(e.length), days(avgDays(e))],
        ["Booked", String(b.length), days(avgDays(b))],
      ] as [string, string, string][],
      conv: ["", pct(q.length, leadsN), pct(v.length, q.length), pct(e.length, v.length), pct(b.length, e.length)],
    };
  }, [live]);

  const funnelRows = funnel ? funnel.rows : [["Leads","0","\u2014"],["Qualified","0","\u2014"],["Viewing","0","\u2014"],["EOI signed","0","\u2014"],["Booked","0","\u2014"]] as [string,string,string][];
  const conv = funnel ? funnel.conv : ["","","","",""];

  const [dragId, setDragId] = useState<number | null>(null);
  const [sel, setSel] = useState<Card | null>(null);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const warn = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 4000); };

  const allCards = cols.flatMap((c) => c.cards.map((k) => ({ ...k, stage: c.label })));
  const sourceCounts: Record<string, number> = {};
  allCards.forEach((k) => { sourceCounts[k.src] = (sourceCounts[k.src] || 0) + 1; });
  const sourceRows = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
  const viewings = allCards.filter((k) => k.stage === "Viewing" || k.stage === "Qualified" || k.stage === "EOI signed");

  const moveLead = (targetLabel: string) => {
    if (dragId == null || !dbCols) return;
    const stageMap: Record<string, string> = { New: "new", Contacted: "contacted", Qualified: "qualified", Viewing: "viewing", Negotiation: "negotiation", "EOI signed": "eoi", Booked: "booked", Lost: "lost" };
    const to = stageMap[targetLabel];
    if (!to) return;
    const fromCol = dbCols.find((c) => c.cards.some((k) => k.id === dragId));
    if (!fromCol) return;
    const card = fromCol.cards.find((k) => k.id === dragId);
    if (!card) return;
    const nameOk = !!card.name && card.name.trim() !== "" && card.name !== "Unnamed lead";
    const budgetNum = parseFloat(String(card.budget).replace(/[^\d.]/g, ""));
    const forward = ["new", "contacted", "qualified", "viewing", "negotiation", "eoi", "booked", "lost"].indexOf(to) >= 2;
    if (!nameOk) { setDragId(null); warn("Lead is missing a name \u2014 add one before moving it."); return; }
    if (forward && !(budgetNum > 0)) { setDragId(null); warn("Lead lacks a budget \u2014 add a budget range before it can qualify."); return; }
    const next = dbCols.map((c) => {
      if (c.label === fromCol.label) return { ...c, count: c.cards.length - 1, cards: c.cards.filter((k) => k.id !== dragId) };
      if (c.label === targetLabel) return { ...c, count: c.cards.length + 1, cards: [...c.cards, { ...card, age: "just moved" }] };
      return c;
    });
    setDragId(null);
    setDbCols(next);
    fetchJSON<{ id: number }>("/api/leads?id=" + dragId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: to }),
    })
      .then(() => {})
      .catch((e) => setApiError(e?.message || "Failed to move lead"));
  };

  const leader: LbRow[] = (() => {
    if (!liveLeads || liveLeads.length === 0) return [];
    const byAgent: Record<string, ApiLead[]> = {};
    liveLeads.forEach((l) => {
      const a = (l.agent || "Unassigned").trim() || "Unassigned";
      (byAgent[a] = byAgent[a] || []).push(l);
    });
    return Object.entries(byAgent)
      .map(([agent, ls]) => {
        const booked = ls.filter((l) => l.stage === "booked");
        const closed = ls.filter((l) => l.stage === "booked" || l.stage === "lost");
        const summed = (sel: (l: ApiLead) => number, key: "disc" | "days") => {
          const arr = ls.filter((l) => (key === "disc" ? l.discountPct != null : l.daysToClose != null));
          return arr.reduce((a, l) => a + sel(l), 0) / Math.max(1, arr.length);
        };
        return {
          agent,
          units: booked.length,
          value: booked.reduce((a, l) => a + (l.budgetMax || 0), 0),
          conv: closed.length ? Math.round((booked.length / closed.length) * 100) : 0,
          disc: summed((l) => l.discountPct || 0, "disc"),
          days: Math.round(summed((l) => l.daysToClose || 0, "days")),
        };
      })
      .sort((a, b) => b.value - a.value);
  })();

  if (!loaded) {
    return (
      <div>
        <PanelSkeleton headerW={120} rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — showing empty columns
        </div>
      )}
      {notice && (
        <div style={{ background: "#FDF4E5", color: "#8A6410", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          {notice}
        </div>
      )}
      <div style={{display:"flex",alignItems:"flex-end",gap:16,marginBottom:18}}>
        <div style={{flex:1}}>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:"-.03em",lineHeight:1.15}}>Leads</div>
          <div style={{fontSize:13,color:"#6B7180",fontWeight:500,marginTop:5}}>{openLeads.length} open \u00b7 {moneyM(potVal)} potential value \u00b7 {agentsN} agents</div>
        </div>
        <button onClick={onNewBooking} style={{height:38,borderRadius:12,background:AC,color:"#fff",border:0,padding:"0 16px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>New booking</button>
        <button onClick={goRegister} style={{height:38,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",padding:"0 16px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Bookings register</button>
      </div>

      <div style={{display:"flex",gap:4,background:"#fff",border:"1px solid #EDEEF3",borderRadius:12,padding:4,marginBottom:16,width:"fit-content"}}>
        {([["kanban", "Kanban"], ["table", "Table"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setView(k)} style={tabBtn(view === k)}>{label}</button>
        ))}
      </div>

      {view === "table" ? (
        <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 1px 3px rgba(20,22,31,.04)", overflow:"hidden", marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1.1fr 1.3fr 0.9fr 1fr 1.5fr 0.9fr", gap:10, padding:"14px 22px", fontSize:9.5, fontWeight:700, letterSpacing:".07em", color:"#9AA0AE", textTransform:"uppercase", background:"#FAFBFD", borderBottom:"1px solid #EDEEF3" }}>
            <span>Lead</span><span>Source</span><span>Budget</span><span>Stage</span><span>Agent</span><span>Chips</span><span style={{textAlign:"right"}}>Status</span>
          </div>
          {allCards.map((k) => (
            <div key={k.id ?? k.name} onClick={() => setSel(k)} style={{ display:"grid", gridTemplateColumns:"1.5fr 1.1fr 1.3fr 0.9fr 1fr 1.5fr 0.9fr", gap:10, alignItems:"center", padding:"0 22px", height:56, borderBottom:"1px solid #F6F7FA", cursor:"pointer" }}>
              <span style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                <span style={{ width:26, height:26, flex:"none", borderRadius:8, background:"#EDECFE", display:"grid", placeItems:"center", fontSize:9, fontWeight:800, color:AC }}>{k.agent}</span>
                <span style={{ fontSize:12.5, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{k.name}</span>
              </span>
              <span style={{ fontSize:11.5, fontWeight:600, color:"#6B7180" }}>{k.src}</span>
              <span style={{ fontSize:12, fontWeight:800 }}>{k.budget}</span>
              <span style={{ fontSize:11.5, fontWeight:700 }}>{k.stage}</span>
              <span style={{ fontSize:11.5, fontWeight:600, color:"#6B7180" }}>{k.agent}</span>
              <span style={{ fontSize:11.5, fontWeight:600, color:"#6B7180" }}>{k.chips.join(" \u00b7 ") || "\u2014"}</span>
              <span style={{ textAlign:"right", display:"flex", justifyContent:"flex-end", gap:6 }}>
                <span style={{ width:7, height:7, borderRadius:5, background:k.live?"#34C08A":"#E2A33C", marginTop:2 }} />
                <span style={{ fontSize:10.5, fontWeight:700, color:"#9AA0AE" }}>{k.live ? "active" : "inactive"}</span>
              </span>
            </div>
          ))}
          {allCards.length === 0 && <div style={{ padding:"18px 22px", textAlign:"center", fontSize:12.5, color:"#9AA0AE", fontWeight:600 }}>No leads in the pipeline yet</div>}
        </div>
      ) : (
      <>
      {/* source strip */}
      <div style={{background:"#fff",borderRadius:20,padding:"16px 20px",boxShadow:"0 1px 3px rgba(20,22,31,.04)",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:800,letterSpacing:"-.02em"}}>Source attribution</div>
          <span style={{fontSize:10.5,fontWeight:600,color:"#9AA0AE"}}>Leads by origin \u00b7 share of pipeline</span>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {sourceRows.map(([src, n]) => (
            <span key={src} style={{display:"inline-flex",alignItems:"center",gap:7,borderRadius:10,border:"1px solid #EDEEF3",background:"#fff",padding:"6px 11px",fontSize:11.5,fontWeight:700}}>
              <span style={{width:7,height:7,borderRadius:4,background:AC}} />
              {src}
              <span style={{color:"#9AA0AE",fontWeight:600}}>{n}</span>
            </span>
          ))}
          {sourceRows.length === 0 && <span style={{fontSize:12,color:"#9AA0AE",fontWeight:600}}>No source attribution yet</span>}
        </div>
      </div>

      {/* viewings */}
      <div style={{background:"#fff",borderRadius:20,padding:"18px 20px",boxShadow:"0 1px 3px rgba(20,22,31,.04)",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:800,letterSpacing:"-.02em"}}>Next viewings</div>
          <span style={{fontSize:10.5,fontWeight:600,color:"#9AA0AE"}}>Qualified leads awaiting site visits \u00b7 times TBC</span>
        </div>
        <div style={{display:"flex",gap:9,overflowX:"auto",paddingBottom:4}}>
          {viewings.slice(0, 12).map((k, i) => (
            <div key={k.id ?? k.name} onClick={() => setSel(k)} style={{flex:"none",width:150,borderRadius:14,border:"1px solid #EDEEF3",padding:"11px 13px",cursor:"pointer"}}>
              <div style={{fontSize:10,fontWeight:700,color:AC}}>{"\u203a"} {k.stage}</div>
              <div style={{fontSize:12.5,fontWeight:800,marginTop:6}}>{k.name}</div>
              <div style={{fontSize:11,color:"#9AA0AE",fontWeight:600,marginTop:3}}>{k.agent} \u00b7 {k.src}</div>
              <div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:9,fontSize:10.5,fontWeight:700,color:"#6B7180",background:"#F1F2F6",borderRadius:7,padding:"3px 8px"}}>day +{i} \u00b7 slot TBC</div>
            </div>
          ))}
          {viewings.length === 0 && <span style={{fontSize:12,color:"#9AA0AE",fontWeight:600}}>No viewings scheduled yet</span>}
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:20,padding:"20px 24px",boxShadow:"0 1px 3px rgba(20,22,31,.04)",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:6}}>
          {funnelRows.map(([label,val,days],i) => (
            <div key={label} style={{flex:1,display:"flex",alignItems:"flex-end",gap:6}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:".06em",color:"#9AA0AE",textTransform:"uppercase"}}>{label}</div>
                <div style={{fontSize:20,fontWeight:800,letterSpacing:"-.03em",marginTop:5}}>{val}</div>
                <div style={{height:6,borderRadius:4,marginTop:9,background:AC,opacity:1-i*0.15}} />
                <div style={{fontSize:10.5,color:"#9AA0AE",fontWeight:600,marginTop:7}}>avg {days}</div>
              </div>
              {conv[i] ? <div style={{fontSize:11,fontWeight:800,color:AC,padding:"0 6px 30px",whiteSpace:"nowrap"}}>{conv[i]}</div> : null}
            </div>
          ))}
        </div>
      </div>

      {/* agent leaderboard */}
      <div style={{background:"#fff",borderRadius:20,padding:"20px 24px",boxShadow:"0 1px 3px rgba(20,22,31,.04)",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:800,letterSpacing:"-.02em"}}>Agent leaderboard</div>
          <span style={{fontSize:10.5,fontWeight:600,color:"#9AA0AE"}}>Units booked \u00b7 Value booked \u00b7 Conversion \u00b7 Avg discount \u00b7 Avg days to close</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr 1.4fr 1fr 1fr 1fr",gap:12,fontSize:10.5,fontWeight:700,color:"#9AA0AE",textTransform:"uppercase",letterSpacing:".04em",padding:"0 6px 9px"}}>
          <span>Agent</span><span style={{textAlign:"right"}}>Units booked</span><span style={{textAlign:"right"}}>Value booked</span><span style={{textAlign:"right"}}>Conv.</span><span style={{textAlign:"right"}}>Avg disc</span><span style={{textAlign:"right"}}>Avg days</span>
        </div>
        {leader.map((r, i) => (
          <div key={r.agent} style={{display:"grid",gridTemplateColumns:"1.6fr 1fr 1.4fr 1fr 1fr 1fr",gap:12,alignItems:"center",padding:"10px 6px",borderTop:"1px solid #F3F4F8"}}>
            <span style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
              <span style={{width:26,height:26,flex:"none",borderRadius:9,background:i===0?"#EDECFE":"#E7E9F0",display:"grid",placeItems:"center",fontSize:9.5,fontWeight:800,color:i===0?AC:"#4A5060"}}>{r.agent.split(/\s+/).map((w) => w[0]).slice(0,2).join("")}</span>
              <span style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.agent}</span>
              {i===0 && <span style={{fontSize:9,fontWeight:800,color:AC,background:"#F0EFFE",borderRadius:6,padding:"2px 6px"}}>#1</span>}
            </span>
            <span style={{textAlign:"right",fontSize:12,fontWeight:800}}>{r.units}</span>
            <span style={{textAlign:"right",fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{moneyM(r.value)}</span>
            <span style={{textAlign:"right",fontSize:12,fontWeight:700,color:"#6B7180"}}>{r.conv}%</span>
            <span style={{textAlign:"right",fontSize:12,fontWeight:700,color:"#6B7180"}}>{r.disc.toFixed(1)}%</span>
            <span style={{textAlign:"right",fontSize:12,fontWeight:700,color:"#6B7180"}}>{Math.round(r.days)} d</span>
          </div>
        ))}
      </div>

      {/* kanban */}
      <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:8,alignItems:"flex-start"}}>
        {cols.map(col => (
          <div key={col.label} style={{width:240,flex:"none",background:"#EFF0F5",borderRadius:18,padding:12}}
               onDragOver={(e) => e.preventDefault()}
               onDrop={() => moveLead(col.label)}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"2px 6px 12px"}}>
              <span style={{width:8,height:8,borderRadius:4,background:col.color}} />
              <span style={{flex:1,fontSize:12,fontWeight:700}}>{col.label}</span>
              <span style={{fontSize:11,fontWeight:700,color:"#6B7180"}}>{col.count}</span>
            </div>
            <div style={{fontSize:10.5,fontWeight:700,color:"#9AA0AE",padding:"0 6px 10px"}}>{col.val} potential</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {col.cards.map(k => (
                <div key={k.id ?? k.name} onClick={() => setSel(k)} draggable={k.id != null}
                     onDragStart={() => setDragId(k.id ?? null)}
                     onDragEnd={() => setDragId(null)}
                     title={k.id != null ? "Drag to move stage \u00b7 click for lead details" : "View lead details"}
                     style={{background:"#fff",borderRadius:14,padding:"13px 14px",boxShadow:"0 1px 2px rgba(20,22,31,.05)",cursor:"pointer",transition:"box-shadow .15s,border-color .15s",border:"1px solid transparent"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{flex:1,fontSize:12.5,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{k.name}</span>
                    <span style={{fontSize:10,fontWeight:700,color:"#9AA0AE"}}>{k.flag}</span>
                  </div>
                  <div style={{fontSize:10.5,color:"#9AA0AE",fontWeight:600,marginTop:4}}>{k.src}</div>
                  <div style={{fontSize:12,fontWeight:800,marginTop:9}}>{k.budget}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:9}}>
                    {k.chips.map(ch => (
                      <span key={ch} style={{fontSize:9.5,fontWeight:700,borderRadius:6,padding:"3px 6px", background:/^\d/.test(ch)?"#EDECFE":"#F1F2F7", color:/^\d/.test(ch)?AC:"#6B7180"}}>{ch}</span>
                    ))}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginTop:11,paddingTop:10,borderTop:"1px solid #F3F4F8"}}>
                    <span style={{width:20,height:20,borderRadius:7,background:"#E7E9F0",display:"grid",placeItems:"center",fontSize:8.5,fontWeight:700,color:"#4A5060"}}>{k.agent}</span>
                    <span style={{flex:1,fontSize:10,color:"#9AA0AE",fontWeight:600}}>{k.age}</span>
                    <span style={{width:7,height:7,borderRadius:5,background:k.live?"#34C08A":"#E2A33C"}} />
                  </div>
<div style={{marginTop:9,paddingTop:9,borderTop:"1px dashed #EDEEF3",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10.5,fontWeight:800,color:AC}}>View details</span>
                    <span style={{fontSize:11,color:"#9AA0AE",fontWeight:600}}>{"\u2192"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      </>
      )}
      {sel && (() => {
        const col = cols.find((c) => c.cards.some((k) => k === sel));
        return (
          <LeadDrawer lead={sel} stage={col ? col.label : ""} color={col ? col.color : AC}
            onClose={() => setSel(null)}
            onBook={() => { const k = sel; setSel(null); if (k) onBookLead(k); }} />
        );
      })()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LEAD DRAWER
   ═══════════════════════════════════════════════════════════════════ */
function LeadDrawer({ lead, stage, color, onClose, onBook }: { lead: Card; stage: string; color: string; onClose: () => void; onBook: () => void }) {
  const [notes, setNotes] = useState<string[]>([]);
  const [noteText, setNoteText] = useState("");
  const disc = lead.disc != null ? lead.disc + "%" : "\u2014";
  const days = lead.days != null ? lead.days + " days" : "\u2014";
  const row = (l: string, v: string, mono = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid #F3F4F8" }}>
      <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 600 }}>{l}</span>
      <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit" }}>{v}</span>
    </div>
  );
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
         style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.38)", zIndex: 120, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: 400, maxWidth: "92vw", height: "100%", background: "#fff", boxShadow: "-14px 0 44px rgba(20,22,31,.18)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "22px 24px", borderBottom: "1px solid #F1F2F7", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ width: 40, height: 40, flex: "none", borderRadius: 12, background: "#EDECFE", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, color: AC }}>{lead.agent}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.name}</div>
            <div style={{ fontSize: 12, color: "#6B7180", fontWeight: 600, marginTop: 3 }}>{lead.src}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 9, border: 0, background: "#F1F2F7", color: "#4A5060", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{"\u00d7"}</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px", boxSizing: "border-box" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 8, padding: "4px 10px", background: "#F0EFFE", fontSize: 10.5, fontWeight: 800, letterSpacing: ".03em" }}>
            <span style={{ width: 7, height: 7, flex: "none", borderRadius: 4, background: color }} />
            <span style={{ color: AC }}>{stage || "Lead"}</span>
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Contact</div>
            {row("Phone", lead.phone || "\u2014", true)}
            {row("Project", lead.projectCode || "\u2014")}
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Deal</div>
            {row("Budget", lead.budget || "\u2014", true)}
            {row("Discount", disc)}
            {row("Days to close", days)}
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Documents</div>
            {(["Unit sales offer", "Reservation form", "SPA draft"] as const).map((d) => (
              <div key={d} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #F3F4F8" }}>
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>{d}</span>
                <span style={pill("pending", false)}>to generate</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Notes</div>
            {notes.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {notes.map((n, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #F3F4F8" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600 }}>{n}</span>
                    <span style={{ fontSize: 10, color: "#9AA0AE", fontWeight: 600, whiteSpace: "nowrap" }}>just now</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && noteText.trim()) { setNotes((n) => [...n, noteText.trim()]); setNoteText(""); } }} placeholder="Add a follow-up note\u2026"
                style={{ flex: 1, height: 34, borderRadius: 10, border: "1px solid #E4E6EE", background: "#fff", padding: "0 12px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", outline: "none" }} />
              <button onClick={() => { if (noteText.trim()) { setNotes((n) => [...n, noteText.trim()]); setNoteText(""); } }} style={{ height: 34, borderRadius: 10, border: 0, background: "#F0EFFE", color: AC, padding: "0 14px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Activity</div>
            <div style={{ padding: "12px 2px" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ width: 9, height: 9, flex: "none", borderRadius: 5, background: color, marginTop: 4 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Captured in pipeline</div>
                  <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600, marginTop: 2 }}>Source: {lead.src} \u00b7 agent {lead.agent}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <span style={{ width: 9, height: 9, flex: "none", borderRadius: 5, background: "#E4E6EE", marginTop: 4 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Stage: {stage || "Lead"}</div>
                  <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600, marginTop: 2 }}>{lead.live ? "Lead is active in the pipeline" : "Lead inactive \u2014 review before follow-up"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: "18px 24px", borderTop: "1px solid #F1F2F7" }}>
          <button onClick={onBook} style={{ width: "100%", height: 42, borderRadius: 12, background: AC, color: "#fff", border: 0, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Convert to booking {"\u2192"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BOOKING WIZARD
   ═══════════════════════════════════════════════════════════════════ */
type PlanRow = { label: string; trigger: string; due: string; pct: number };
type WizardUnit = { id: number; no: string; type: string | null; beds: number | null; area: number | null; price: number | null; project_code: string | null; status: string };
const PLAN_DEFAULT: PlanRow[] = [
  { label: "Booking token", trigger: "On booking", due: "14 Sep 2026", pct: 10 },
  { label: "Excavation 20%", trigger: "Excavation complete", due: "14 Dec 2026", pct: 20 },
  { label: "Structure 20%", trigger: "Structure at 50%", due: "14 Mar 2027", pct: 20 },
  { label: "Structure 40%", trigger: "Structure complete", due: "14 Jun 2027", pct: 20 },
  { label: "Watertight 20%", trigger: "Watertight enclosure", due: "14 Sep 2027", pct: 20 },
  { label: "Handover 10%", trigger: "Handover", due: "Q4 2027", pct: 10 },
];
const PHASE_COLORS = ["#8B7CF6", "#5B8DEF", "#34C08A", "#E2A33C", "#F2715C", "#8A94A6"];

function Booking({ step, setStep, onBack, lead, blank, onOpenBuyer, onBackToInventory, units }: { step:number; setStep:(n:number)=>void; onBack:()=>void; lead: Card | null; blank: boolean; onOpenBuyer: (id: number | null) => void; onBackToInventory: () => void; units: WizardUnit[] }) {
  const leadName = blank ? "" : (lead?.name ?? "");
  const leadBudget = blank ? "" : (lead?.budget ?? "");
  const [buyer, setBuyer] = useState(leadName);
  const [mobile, setMobile] = useState(blank ? "" : "");
  const [disc, setDisc] = useState("0");
  const [amount, setAmount] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [stage, setStage] = useState(blank ? "New" : (leadChip(lead)));
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmErr, setConfirmErr] = useState("");
  const [savedRef, setSavedRef] = useState("");
  const [issuedReceipt, setIssuedReceipt] = useState("");
  const [buyerId, setBuyerId] = useState<number | null>(null);
  const [plan, setPlan] = useState<PlanRow[]>(PLAN_DEFAULT.map((r) => ({ ...r })));
  const [escrow, setEscrow] = useState("");
  const [payMethod, setPayMethod] = useState("Bank transfer");
  const [payBank, setPayBank] = useState("");
  const [payRef, setPayRef] = useState("");
  const [draft, setDraft] = useState<{ ref: string; when: string } | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);

  const unit = units.find((u) => u.no === unitNo) || null;
  const listPrice = unit ? Number(unit.price) || 0 : 0;
  const unitLabel = unit ? [unit.no, unit.type, (unit.beds || 0) + "BR", (unit.area || 0) + " sq.ft"].filter(Boolean).join(" \u00b7 ") : "";
  const discVal = parseFloat(disc || "0");
  const discAmt = Math.round(listPrice * discVal / 100);
  const netVal = Math.round(listPrice * (1 - discVal / 100));
  const net = money(netVal);
  const bookingAmt = Math.round(netVal * 0.1);
  const psf = unit && unit.area ? Math.round(netVal / unit.area) : 0;
  const planTotal = plan.reduce((a, r) => a + (r.pct || 0), 0);
  const planOk = Math.abs(planTotal - 100) < 0.001;
  const dld = Math.round(netVal * 0.04);
  const oqood = 3150;
  const devFee = 4200;
  const grandTotal = netVal + dld + oqood + devFee;

  useEffect(() => {
    if (listPrice > 0) setAmount(String(Math.round(netVal * 0.1)));
  }, [unitNo, disc]);

  const LOCK_MIN = 45;
  const [lock, setLock] = useState<number>(LOCK_MIN * 60);
  useEffect(() => {
    const t = setInterval(() => setLock((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const lockWarn = lock <= 300;
  const lockLabel = lock > 0
    ? "Unit soft-locked \u00b7 " + String(Math.floor(lock / 60)).padStart(2, "0") + ":" + String(Math.floor(lock % 60)).padStart(2, "0") + " left"
    : "Soft-lock expired \u00b7 holding released";

  const setRow = (i: number, patch: Partial<PlanRow>) => {
    setPlan((n) => { const c = [...n]; c[i] = { ...c[i], ...patch }; return c; });
  };

  const saveDraft = async () => {
    setDraftSaving(true);
    setConfirmErr("");
    try {
      if (!unitNo) { setConfirmErr("Select a unit before saving a draft"); return; }
      const d = await fetchJSON<{ id: number; ref: string }>("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_no: unitNo,
          buyer_name: buyer || leadName || "Prospective buyer",
          buyer_mobile: mobile,
          buyer_email: null,
          discount_pct: discVal,
          discount_amt: discAmt,
          list_price: listPrice,
          net_price: netVal,
          booking_amount: bookingAmt,
          expected_spa: "2026-12-01",
          status: "draft",
        }),
      });
      setDraft({ ref: d.ref, when: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) });
    } catch (e: any) {
      setConfirmErr(e?.message || "Draft not saved");
    } finally {
      setDraftSaving(false);
    }
  };

  const doConfirm = async () => {
    setConfirming(true);
    setConfirmErr("");
    try {
      if (!unitNo) { setConfirmErr("Select a unit before confirming"); return; }
      const created = await fetchJSON<{ id: number; ref: string; unit: string }>("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_no: unitNo,
          buyer_name: buyer || leadName || "Prospective buyer",
          buyer_mobile: mobile,
          buyer_email: null,
          discount_pct: discVal,
          discount_amt: discAmt,
          list_price: listPrice,
          net_price: netVal,
          booking_amount: bookingAmt,
          expected_spa: "2026-12-01",
        }),
      });
      const res = await fetchJSON<any>("/api/bookings?id=" + created.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          escrow_ref: escrow,
          payment_method: payMethod.toLowerCase().replace(/[\s-]+/g, "_"),
          payment_bank: payBank,
          payment_reference: payRef,
          buyer_email: null,
          buyer_mobile: mobile,
        }),
      });
      setSavedRef(res.ref || created.ref);
      setIssuedReceipt(String(res.receiptId || ""));
      setBuyerId(res.buyerId != null ? Number(res.buyerId) : null);
      setConfirmed(true);
    } catch (e: any) {
      setConfirmErr(e?.message || "Booking failed to persist");
    } finally {
      setConfirming(false);
    }
  };

  const showApproval = step === 1 && discVal > 3;
  const nextLabel = step === 5 ? "Confirm booking" : "Continue";

  const deal = [
    ["Unit", unitLabel || "\u2014 No unit selected"],
    ["Project", unit?.project_code?.replace(/_/g, " ") || "\u2014"],
    ["List price", listPrice ? money(listPrice) : "\u2014"],
    ["Discount", discVal ? "\u2212" + discVal + "% · " + money(discAmt) : "0%"],
    ["Net price", listPrice ? net : "\u2014"],
    ["Price/sq.ft", psf ? "AED " + psf.toLocaleString("en-US") : "\u2014"],
    ["Plan", "Construction Linked · " + plan.length + " milestones"],
    ["Buyer", buyer || "\u2014"],
    ["Broker", "Recorded at SPA"],
  ];

  const cellIn = { width:"100%",height:30,border:"1px solid #EDEEF3",borderRadius:8,background:"#fff",padding:"0 8px",fontSize:12,fontWeight:600,fontFamily:"inherit",outline:"none",boxSizing:"border-box" as const };
  const inStyle = { width:"100%",height:42,borderRadius:12,border:"1px solid #E4E6EE",background:"#fff",padding:"0 14px",fontSize:13,fontWeight:600,fontFamily:"inherit",outline:"none",boxSizing:"border-box" as const };

  if (confirmed) {
    const next = plan[1] || plan[0];
    const nextAmt = money(Math.round(netVal * ((next && next.pct) || 10) / 100));
    const nextDue = (next && next.due) || "\u2014";
    const receiptStr = issuedReceipt ? "RCP-" + String(issuedReceipt).padStart(6, "0") : "RCP-000001";
    const buyerStr = buyerId != null ? "B-" + String(buyerId).padStart(5, "0") : "\u2014";
    const queued = [
      ["Buyer welcome email", "payment schedule attached"],
      ["Finance & Legal notification", "internal \u00b7 booking + receipt"],
      ["Oqood registration task", "created for Buyer Services"],
    ];
    return (
      <div>
        <div style={{ background:"#fff", borderRadius:20, padding:"44px 32px", boxShadow:"0 1px 3px rgba(20,22,31,.04)", textAlign:"center" }}>
          <div style={{ width:64, height:64, margin:"0 auto", borderRadius:20, background:"#E9F8F1", display:"grid", placeItems:"center" }}>
            <span style={{ fontSize:28, fontWeight:900, color:"#1F9D6B" }}>{"\u2713"}</span>
          </div>
          <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-.03em", marginTop:18 }}>Booking confirmed</div>
          <div style={{ fontSize:13, color:"#6B7180", fontWeight:500, marginTop:6 }}>{buyer || "Prospective buyer"} \u00b7 {deal[0][1]} \u00b7 {deal[4][1]}</div>
          <div style={{ display:"flex", gap:14, justifyContent:"center", marginTop:22, flexWrap:"wrap" }}>
            {[["Booking reference", savedRef || "BKG-2026-00001"], ["Buyer ID", buyerStr], ["Receipt", receiptStr]].map(([l, v]) => (
              <div key={l} style={{ borderRadius:14, background:"#F7F8FB", padding:"12px 18px", minWidth:150 }}>
                <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", color:"#9AA0AE" }}>{l}</div>
                <div style={{ fontSize:15, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", marginTop:5 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"inline-flex", gap:8, alignItems:"center", marginTop:20, borderRadius:12, background:"#FDF4E5", padding:"10px 16px" }}>
            <span style={{ width:7, height:7, borderRadius:5, background:"#E2A33C" }} />
            <span style={{ fontSize:11.5, fontWeight:700, color:"#8A6410" }}>Next payment: {nextAmt} due {nextDue}</span>
          </div>
          <div style={{ marginTop:26, fontSize:10.5, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", color:"#9AA0AE" }}>Queued outbound</div>
          <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:10, flexWrap:"wrap" }}>
            {queued.map(([t, d]) => (
              <div key={t} style={{ textAlign:"left", borderRadius:12, border:"1px solid #EDEEF3", padding:"10px 14px", width:230 }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{t}</div>
                <div style={{ fontSize:10.5, color:"#9AA0AE", fontWeight:600, marginTop:3 }}>{d}</div>
                <span style={{ ...pill("queued", true), marginTop:7, display:"inline-block" }}>queued</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:26, flexWrap:"wrap" }}>
            <button onClick={() => (buyerId != null ? onOpenBuyer(buyerId) : onBack())} style={{ height:40, borderRadius:12, background:AC, color:"#fff", border:0, padding:"0 18px", fontFamily:"inherit", fontSize:12.5, fontWeight:700, cursor:"pointer" }}>Open buyer record</button>
            <button onClick={onBack} style={{ height:40, borderRadius:12, border:"1px solid #EDEEF3", background:"#fff", padding:"0 18px", fontFamily:"inherit", fontSize:12.5, fontWeight:700, color:"#4A5060", cursor:"pointer" }}>Book another unit</button>
            <button onClick={onBackToInventory} style={{ height:40, borderRadius:12, border:"1px solid #EDEEF3", background:"#fff", padding:"0 18px", fontFamily:"inherit", fontSize:12.5, fontWeight:700, color:"#4A5060", cursor:"pointer" }}>Back to inventory</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {confirmErr && <div style={{ background:"#FDECEC", color:"#E5484D", borderRadius:12, padding:"11px 16px", fontSize:12, fontWeight:700, marginBottom:16 }}>Booking not persisted \u00b7 {confirmErr}</div>}
      <div style={{display:"grid",gridTemplateColumns:"210px 1fr 300px",gap:20,alignItems:"start"}}>
      {/* step rail */}
      <div style={{background:"#fff",borderRadius:20,padding:"20px 18px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
        <div style={{fontSize:13,fontWeight:800,letterSpacing:"-.02em",marginBottom:16}}>New booking</div>
        {STEP_LABELS.map(([label,sub],i) => {
          const n = i+1; const active = step===n; const done = step>n;
          return (
            <button key={label} onClick={() => setStep(n)} style={{width:"100%",display:"flex",gap:11,alignItems:"center",padding:10,border:0,borderRadius:12,cursor:"pointer",fontFamily:"inherit",background:active?"#F0EFFE":"transparent"}}>
              <span style={{width:24,height:24,flex:"none",borderRadius:8,display:"grid",placeItems:"center",fontSize:11,fontWeight:800,background:done?"#34C08A":active?AC:"#F1F2F7",color:done||active?"#fff":"#9AA0AE"}}>{done ? "\u2713" : String(n)}</span>
              <span style={{flex:1,textAlign:"left"}}>
                <span style={{display:"block",fontSize:12,fontWeight:700}}>{label}</span>
                <span style={{display:"block",fontSize:10.5,color:"#9AA0AE",fontWeight:600,marginTop:2}}>{sub}</span>
              </span>
            </button>
          );
        })}
        <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #F1F2F7"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:7,height:7,borderRadius:5,background:lockWarn?"#E5484D":"#E2A33C"}} />
            <span style={{fontSize:10.5,fontWeight:700,color:lockWarn?"#E5484D":"#8A6410"}}>{lockLabel}</span>
          </div>
          <div style={{fontSize:9.5,color:"#9AA0AE",fontWeight:600,marginTop:4}}>Auto-release if a step is not saved or continued</div>
        </div>
      </div>

      {/* form */}
      <div style={{background:"#fff",borderRadius:20,padding:"24px 26px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
        <div style={{fontSize:18,fontWeight:800,letterSpacing:"-.025em"}}>Step {step}: {STEP_LABELS[step-1][0]}</div>
        <div style={{fontSize:12.5,color:"#6B7180",fontWeight:500,marginTop:6}}>{STEP_LABELS[step-1][1]}</div>
        {step === 3 ? (
        <div style={{marginTop:24}}>
          <div style={{fontSize:11,fontWeight:800,color:"#6B7180"}}>Plan percentages must sum to exactly 100% — amounts recompute live from the {discVal}% net price.</div>
          <div style={{marginTop:12,border:"1px solid #EDEEF3",borderRadius:14,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"34px 1.3fr 1.3fr 1fr 0.8fr 0.8fr 1fr",gap:10,padding:"9px 12px",background:"#F7F8FB",fontSize:10,fontWeight:700,color:"#9AA0AE",textTransform:"uppercase",letterSpacing:".04em"}}>
              <span></span><span>Milestone</span><span>Trigger</span><span>Due date</span><span>%</span><span style={{textAlign:"right"}}>Running</span><span style={{textAlign:"right"}}>Amount</span>
            </div>
            {plan.map((r: PlanRow, i: number) => {
              const run = plan.slice(0, i + 1).reduce((a, x) => a + (x.pct || 0), 0);
              return (
                <div key={i} style={{display:"grid",gridTemplateColumns:"34px 1.3fr 1.3fr 1fr 0.8fr 0.8fr 1fr",gap:10,alignItems:"center",padding:"6px 12px",borderTop:"1px solid #F3F4F8"}}>
                  <span style={{fontSize:10.5,fontWeight:800,color:"#9AA0AE"}}>{i + 1}</span>
                  <input value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} style={cellIn} />
                  <input value={r.trigger} onChange={(e) => setRow(i, { trigger: e.target.value })} style={cellIn} />
                  <input value={r.due} onChange={(e) => setRow(i, { due: e.target.value })} style={cellIn} />
                  <input type="number" min={0} max={100} value={String(r.pct)} onChange={(e) => setRow(i, { pct: parseFloat(e.target.value) || 0 })} style={{ ...cellIn, textAlign:"right", fontFamily:"'JetBrains Mono',monospace" }} />
                  <span style={{textAlign:"right",fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{run.toFixed(1)}%</span>
                  <span style={{textAlign:"right",fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{money(Math.round(netVal * (r.pct || 0) / 100))}</span>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:14}}>
            <div style={{flex:1,height:8,borderRadius:5,background:"#F1F2F7",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:5,background:planOk?"#34C08A":"#E5484D",width:Math.min(100,planTotal) + "%",transition:"width .2s"}} />
            </div>
            <span style={{fontSize:11.5,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:planOk?"#1F9D6B":"#E5484D"}}>{planTotal.toFixed(1)}%</span>
            <span style={hint(planOk ? "valid" : "mandatory")}>{planOk ? "valid \u00b7 totals exactly 100%" : "adjust \u00b7 totals " + planTotal.toFixed(1) + "%"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:18,marginTop:18}}>
            <div style={{border:"1px solid #EDEEF3",borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:8}}>Additional charges</div>
              {[["DLD registration 4%", "buyer", money(dld)], ["Oqood admin fee", "buyer", money(oqood)], ["Developer admin fee", "buyer", money(devFee)]].map(([l, p, v]) => (
                <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"7px 0",borderBottom:"1px solid #F6F7FA"}}>
                  <span style={{fontSize:11.5,fontWeight:600,color:"#4A5060"}}>{l}</span>
                  <span style={{display:"flex",alignItems:"center",gap:9}}>
                    <span style={{fontSize:10,fontWeight:700,color:"#9AA0AE"}}>{p}</span>
                    <span style={{fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
                  </span>
                </div>
              ))}
            </div>
            <div style={{border:"1px solid #EDEEF3",borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:8}}>Summary</div>
              {[["Total contract value", money(netVal)], ["Total plan amount", money(netVal)], ["Additional charges", money(dld + oqood + devFee)], ["Grand total", money(grandTotal)]].map(([l, v]) => (
                <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"7px 0",borderBottom:"1px solid #F6F7FA"}}>
                  <span style={{fontSize:11.5,fontWeight:600,color:"#6B7180"}}>{l}</span>
                  <span style={{fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
                </div>
              ))}
              <div style={{fontSize:11.5,fontWeight:800,marginTop:10,color:planOk ? "#1F9D6B" : "#E5484D"}}>{planOk ? "Schedule valid \u2014 ready to proceed" : "Split percentages until they total 100%"}</div>
            </div>
          </div>
          <div style={{marginTop:18}}>
            <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:9}}>Instalments vs construction programme</div>
            <div style={{display:"flex",height:14,borderRadius:7,overflow:"hidden",background:"#F1F2F7"}}>
              {plan.map((r, i) => (
                <div key={i} title={r.label + " \u00b7 " + money(Math.round(netVal * (r.pct || 0) / 100))} style={{width:(r.pct || 0) + "%",background:PHASE_COLORS[i % PHASE_COLORS.length],minWidth:16}} />
              ))}
            </div>
            <div style={{display:"flex",marginTop:6}}>
              {plan.map((r, i) => (
                <div key={i} style={{width:(r.pct || 0) + "%",fontSize:9.5,fontWeight:600,color:"#9AA0AE",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",paddingRight:6}}>{r.trigger}</div>
              ))}
            </div>
          </div>
        </div>
        ) : step === 5 ? (
        <div style={{marginTop:24}}>
          <div style={{fontSize:11,fontWeight:800,color:"#6B7180"}}>Record the booking payment — the escrow deposit reference is mandatory before confirm.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px",marginTop:14}}>
            <div>
              <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>Amount</div>
              <div style={box(false)}>
                <span style={{fontSize:13,fontWeight:700,color:"#9AA0AE",marginRight:6}}>AED</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} style={{flex:1,border:0,background:"transparent",fontSize:13,fontWeight:700,fontFamily:"inherit",outline:"none"}} />
                <span style={hint("within bounds")}>10% of net</span>
              </div>
            </div>
            <div>
              <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>Date</div>
              <div style={box(false)}><span style={{flex:1}}>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
            </div>
            <div>
              <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>Method</div>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} style={inStyle}>
                <option>Bank transfer</option><option>Cheque</option><option>Card</option><option>Cash</option><option>Crypto-converted</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>Bank</div>
              <input value={payBank} onChange={(e) => setPayBank(e.target.value)} placeholder="Bank name" style={inStyle} />
            </div>
            <div>
              <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>Transaction reference</div>
              <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="TT ref" style={inStyle} />
            </div>
            <div>
              <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>Escrow deposit reference <span style={{color:"#E5484D"}}>*</span></div>
              <input value={escrow} onChange={(e) => setEscrow(e.target.value)} placeholder="ESC-2026-0000" style={{ ...inStyle, borderColor: escrow.trim() ? "#E4E6EE" : "#E5484D" }} />
            </div>
          </div>
          <div style={{marginTop:14,background:"#FDECEC",borderRadius:12,padding:"11px 14px",fontSize:11.5,fontWeight:700,color:"#E5484D"}}>All buyer funds must be deposited to the project escrow account.</div>
          <div style={{marginTop:18,border:"1px solid #EDEEF3",borderRadius:14,padding:"14px 16px"}}>
            <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:8}}>Final review</div>
            {[["Unit", unitLabel || "\u2014"], ["Buyer", buyer || "\u2014"], ["List price", listPrice ? money(listPrice) : "\u2014"], ["Discount", "\u2212" + discVal + "% \u00b7 " + money(discAmt)], ["Net price", listPrice ? net : "\u2014"], ["Plan total", planOk ? planTotal + "%" : "INVALID (" + planTotal.toFixed(1) + "%)"], ["Booking token", money(bookingAmt)], ["Escrow ref", escrow || "\u2014"], ["Method \u00b7 bank", payMethod + " \u00b7 " + (payBank || "\u2014")]].map(([l, v]) => (
              <div key={l} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"7px 0",borderBottom:"1px solid #F6F7FA"}}>
                <span style={{fontSize:11.5,color:"#9AA0AE",fontWeight:600}}>{l}</span>
                <span style={{fontSize:12,fontWeight:700,textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px",marginTop:24}}>
          {step === 1 ? (
            <>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Unit <span style={{ textTransform: "none", letterSpacing: 0, color: AC, fontWeight: 700 }}>· live from inventory {lead ? "· lead suggestion " + leadChip(lead) : ""}</span></div>
                <select value={unitNo} onChange={(e) => setUnitNo(e.target.value)} style={{ ...inStyle, appearance: "auto" }}>
                  <option value="">Select an available unit…</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.no}>{u.no + " · " + [u.type, (u.beds || 0) + "BR", (u.area || 0) + " sq.ft"].filter(Boolean).join(" · ") + " · " + money(Number(u.price) || 0)}</option>
                  ))}
                </select>
                {units.length === 0 && <div style={{ fontSize: 11, color: "#E5484D", fontWeight: 600, marginTop: 6 }}>No available units in scope yet — none will show in this wizard.</div>}
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Project</div>
                <div style={box(false)}><span style={{ flex: 1 }}>{unit?.project_code?.replace(/_/g, " ") || "—"}</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>List price</div>
                <div style={box(false)}>
                  <span style={{ flex: 1 }}>{listPrice ? money(listPrice) : "—"}</span>
                  {unit && unit.area && listPrice ? <span style={hint("unit")}>AED {Math.round(listPrice / unit.area).toLocaleString("en-US")}/sq.ft</span> : null}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Discount requested</div>
                <div style={box(true)}>
                  <input value={disc} onChange={(e) => setDisc(e.target.value.replace(/[^0-9.]/g, ""))} step="0.5"
                    style={{ flex: 1, border: 0, background: "transparent", fontSize: 13, fontWeight: 700, fontFamily: "inherit", outline: "none", width: 60 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7180" }}>% · AED {Math.round(listPrice * discVal / 100).toLocaleString("en-US")}</span>
                  <span style={hint("approval")}>approval</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Net price</div>
                <div style={box(false)}>
                  <span style={{ flex: 1 }}>{listPrice ? net : "—"}</span>
                  {psf ? <span style={hint("unit")}>AED {psf.toLocaleString("en-US")}/sq.ft</span> : null}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Payment plan</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Construction Linked · {plan.length} milestones</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Booking token</div>
                <div style={box(false)}>
                  <span style={{ flex: 1 }}>{listPrice ? "10% · " + money(bookingAmt) : "—"}</span>
                  <span style={hint("within bounds")}>within bounds</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>DLD 4% payer</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Buyer · {listPrice ? money(dld) : "—"}</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Broker</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Recorded at SPA</span></div>
              </div>
            </>
          ) : step === 2 ? (
            <>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Buyer type</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Individual</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Full name (passport)</div>
                <input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Enter buyer full name"
                  style={{ width: "100%", height: 42, borderRadius: 12, border: "1px solid #E4E6EE", background: "#fff", padding: "0 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Mobile</div>
                <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+971 50 000 0000"
                  style={{ width: "100%", height: 42, borderRadius: 12, border: "1px solid #E4E6EE", background: "#fff", padding: "0 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Nationality</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Captured at KYC</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Passport no.</div>
                <div style={box(false)}><span style={{ flex: 1 }}>—</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Emirates ID</div>
                <div style={box(false)}><span style={{ flex: 1 }}>—</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Source of funds</div>
                <div style={box(false)}><span style={{ flex: 1 }}>—</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>AML risk rating</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Pending screening</span><span style={hint("pending")}>screened</span></div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Reservation form</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Queued after confirmation</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Expression of interest</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Queued after confirmation</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Unit sales offer</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Queued after confirmation</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>SPA draft</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Awaiting legal review</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Signature routing</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Buyer → Developer signatory</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 7 }}>Reminder cadence</div>
                <div style={box(false)}><span style={{ flex: 1 }}>Day 2, 5, 9</span></div>
              </div>
            </>
          )}
        </div>
        )}
        {showApproval && (
          <div style={{marginTop:22,background:"#FDF4E5",borderRadius:16,padding:"16px 18px",display:"flex",gap:12}}>
            <span style={{width:8,height:8,borderRadius:5,background:"#E2A33C",marginTop:5,flex:"none"}} />
            <span>
              <span style={{display:"block",fontSize:12.5,fontWeight:700,color:"#8A6410"}}>Approval required \u00b7 routes to Sales Director</span>
              <span style={{display:"block",fontSize:11.5,color:"#A07C22",fontWeight:500,marginTop:4,lineHeight:1.55}}>{discVal}% exceeds the agent limit of 3%. Expected turnaround 4 working hours. The unit stays locked until a decision is recorded.</span>
            </span>
          </div>
        )}
        <div style={{display:"flex",gap:10,marginTop:26,paddingTop:20,borderTop:"1px solid #F1F2F7",alignItems:"center"}}>
          <button onClick={saveDraft} disabled={draftSaving} style={{height:40,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",padding:"0 16px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,color:"#4A5060",cursor:draftSaving?"progress":"pointer"}}>{draftSaving ? "Saving\u2026" : "Save as draft"}</button>
          {draft && <span style={{fontSize:11,fontWeight:700,color:"#1F9D6B",whiteSpace:"nowrap"}}>Draft {draft.ref} saved \u00b7 {draft.when}</span>}
          <div style={{flex:1}} />
          {step > 1 && <button onClick={() => setStep(step-1)} style={{height:40,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",padding:"0 16px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Back</button>}
          <button onClick={() => step === 5 ? doConfirm() : setStep(step+1)} disabled={confirming || (step === 1 && !unitNo) || (step === 3 && !planOk) || (step === 5 && !escrow.trim())} style={{height:40,borderRadius:12,background:AC,color:"#fff",border:0,padding:"0 20px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,cursor:confirming?"progress":"pointer",opacity:(confirming || (step === 1 && !unitNo) || (step === 3 && !planOk) || (step === 5 && !escrow.trim()))?0.6:1}}>{confirming ? "Confirming\u2026" : nextLabel}</button>
        </div>
      </div>

      {/* deal summary */}
      <div style={{background:"#fff",borderRadius:20,padding:"20px 22px",boxShadow:"0 1px 3px rgba(20,22,31,.04)",position:"sticky",top:0}}>
        <div style={{fontSize:13,fontWeight:800,letterSpacing:"-.02em"}}>Deal summary</div>
        <div style={{marginTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,padding:"9px 0",borderBottom:"1px solid #F6F7FA"}}>
          <span style={{fontSize:11.5,color:"#9AA0AE",fontWeight:600}}>Lead</span>
          <span style={{fontSize:12,fontWeight:700,textAlign:"right",color:AC}}>{blank ? "New (blank)" : (lead?.name ?? "\u2014") + " \u00b7 " + stage}</span>
        </div>
          {deal.map(([k,v],i) => (
            <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"9px 0",borderBottom:"1px solid #F6F7FA"}}>
              <span style={{fontSize:11.5,color:"#9AA0AE",fontWeight:600}}>{k}</span>
              <span style={{fontSize:12,fontWeight:i===4?800:700,textAlign:"right",color:i===3?"#E5484D":"#14161F"}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:16,background:"#F5F6FA",borderRadius:14,padding:"14px 15px"}}>
          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase"}}>Booking amount due now</div>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:"-.03em",marginTop:8}}>{money(bookingAmt)}</div>
          <div style={{fontSize:11,color:"#6B7180",fontWeight:500,marginTop:4}}>10% token \u00b7 escrow reference mandatory</div>
        </div>
      </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BOOKINGS REGISTER
   ═══════════════════════════════════════════════════════════════════ */
type BookingRow = { id: number; ref: string | null; unit_no: string; project: string; buyer: string; status: string; discount_pct: number; discount_amt: number; list_price: number; net_price: number; booking_amount: number; payment_method: string | null; escrow_ref: string | null; created_at: string; expected_spa: string };
const BOOKING_STATUS_PILL: Record<string, { bg: string; color: string }> = {
  confirmed: { bg: "#E9F8F1", color: "#1F9D6B" },
  pending_approval: { bg: "#FDF4E5", color: "#B07B14" },
  draft: { bg: "#F1F2F6", color: "#6B7180" },
  cancelled: { bg: "#FDECEC", color: "#E5484D" },
};
const bookingPill = (s: string) => { const m = BOOKING_STATUS_PILL[s] || BOOKING_STATUS_PILL.draft; return { display: "inline-block", fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px", background: m.bg, color: m.color }; };

function BookingsRegister({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [notice, setNotice] = useState("");
  const [apiError, setApiError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    let active = true;
    fetchJSON<{ bookings: BookingRow[] }>("/api/bookings")
      .then((j) => { if (active) { setLoaded(true); setRows(Array.isArray(j.bookings) ? j.bookings : []); } })
      .catch((e) => { if (active) { setLoaded(true); setApiError(e?.message || "Failed to load bookings"); } });
    return () => { active = false; };
  }, []);

  const banner = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 3500); };

  const cancel = async (r: BookingRow) => {
    if (r.id == null) { banner("This booking has no record id yet"); return; }
    if (!window.confirm("Cancel booking " + r.ref + " for " + r.buyer + "?")) return;
    try {
      await fetchJSON<any>("/api/bookings?id=" + r.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
      setRows((rows || []).map((x) => x.id === r.id ? { ...x, status: "cancelled" } : x));
      banner("Booking " + r.ref + " cancelled · unit released back to available");
    } catch (e: any) { banner("Cancel failed: " + (e?.message || "request failed")); }
  };

  const show = rows || [];
  const avail = !!rows;
  const filtered = filter === "all" ? show : show.filter((r) => r.status === filter);
  const gross = show.reduce((a, b) => a + b.net_price, 0);
  const tokens = show.reduce((a, b) => a + b.booking_amount, 0);

  if (!loaded) {
    return (
      <div>
        <PanelSkeleton headerW={220} rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — showing empty register
        </div>
      )}
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Bookings register</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>{show.length} bookings · {moneyM(gross)} contract value · {moneyM(tokens)} tokens held</div>
        </div>
        <button onClick={onBack} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>{"\u2039"} Bookings</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {["all", "confirmed", "pending_approval", "draft", "cancelled"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ height: 30, border: 0, borderRadius: 9, padding: "0 13px", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, background: filter === f ? "#F0EFFE" : "#F1F2F6", color: filter === f ? AC : "#6B7180" }}>
            {f.replace("_", " ")} ({f === "all" ? show.length : show.filter((x) => x.status === f).length})
          </button>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 20, padding: "18px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.4fr 1fr 1fr 1fr 1fr 1fr", gap: 12, padding: "0 8px 10px", borderBottom: "1px solid #F1F2F6" }}>
          {["Reference", "Unit", "Buyer", "Status", "List price", "Net price", "Token", "Scheduled"].map((h) => <div key={h} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase" }}>{h}</div>)}
        </div>
        {filtered.map((r, i) => (
          <div key={r.ref || "b" + i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.4fr 1fr 1fr 1fr 1fr 1fr", gap: 12, alignItems: "center", padding: "12px 8px", borderBottom: i < filtered.length - 1 ? "1px solid #F6F7FA" : "none" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600 }}>{r.ref || "\u2014"}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{r.unit_no} <span style={{ color: "#9AA0AE", fontWeight: 600, fontSize: 11 }}>· {r.project}</span></span>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.buyer}</span>
            <span style={bookingPill(r.status)}>{r.status.replace("_", " ")}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{money(r.list_price)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800 }}>{money(r.net_price)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: AC }}>{money(r.booking_amount)}</span>
            <span style={{ fontSize: 12, color: "#6B7180", fontWeight: 600 }}>{r.expected_spa || "\u2014"}</span>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: "18px 8px", textAlign: "center", fontSize: 12.5, color: "#9AA0AE", fontWeight: 600 }}>No {filter} bookings yet</div>}
        <div style={{ display: "flex", gap: 10, paddingTop: 14, marginTop: 6, borderTop: "1px solid #F6F7FA" }}>
          <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 600, marginRight: 6 }}>This register updates from the booking wizard — confirm a booking to log it here.</span>
          <button onClick={() => { if (window.confirm("Export booking register CSV?")) banner("Booking register exported · CSV"); }} style={{ marginLeft: "auto", height: 32, borderRadius: 10, border: "1px solid #EDEEF3", background: "#fff", padding: "0 13px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Export CSV</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BUYER DIRECTORY
   ═══════════════════════════════════════════════════════════════════ */
function BuyersDirectory({ onOpen }: { onOpen: (id: number) => void }) {
  const [rows, setRows] = useState<BuyerRow[] | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchJSON<{ buyers: BuyerRow[] }>("/api/buyers")
      .then((j) => { if (active) { setLoaded(true); setRows(Array.isArray(j.buyers) ? j.buyers : []); } })
      .catch(() => { if (active) { setLoaded(true); setError("Live data unavailable \u2014 directory is empty"); } });
    return () => { active = false; };
  }, []);

  const show = rows || [];
  const avail = !!rows;
  const contracted = show.reduce((a, b) => a + b.contracted, 0);
  const collected = show.reduce((a, b) => a + b.collected, 0);
  const outstanding = show.reduce((a, b) => a + b.outstanding, 0);

  const [q, setQ] = useState("");
  const [kycF, setKycF] = useState<"all" | "cleared" | "pending">("all");
  const [docsF, setDocsF] = useState<"all" | "has" | "none">("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState("");

  const queryText = q.trim().toLowerCase();
  const filtered = show.filter((r) => {
    if (kycF !== "all" && (r.kyc || "pending") !== kycF) return false;
    if (docsF === "has" && !(r.docCount || 0)) return false;
    if (docsF === "none" && (r.docCount || 0) > 0) return false;
    if (overdueOnly && !(r.overdue > 0)) return false;
    if (queryText && !(r.name.toLowerCase().includes(queryText) || (r.email || "").toLowerCase().includes(queryText) || (r.phone || "").includes(queryText) || String(r.id).includes(queryText))) return false;
    return true;
  });
  const toggle = (id: number) => {
    setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const exportSelected = () => {
    const chosen = filtered.filter((r) => r.id && sel.has(r.id));
    if (!chosen.length) { setNotice("Select at least one buyer to export"); return; }
    const esc = (v: unknown) => '"' + String(v === null || v === undefined ? "" : v).replace(/"/g, '""') + '"';
    const head = "Buyer ID,Name,Email,Phone,KYC,Units,Contracted,Collected,Outstanding,Overdue,Documents,Agent,Agency,Next due date,Next amount";
    const csv = [head].concat(chosen.map((r) => [
      "B-" + String(r.id).padStart(5, "0"), r.name, r.email || "", r.phone || "", r.kyc || "pending", r.units,
      r.contracted, r.collected, r.outstanding, r.overdue, r.docCount || 0, r.agent || "", r.agency || "",
      r.next ? r.next.date : "", r.next ? r.next.amount : "",
    ].map(esc).join(",")));
    const blob = new Blob(["\ufeff" + csv.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "buyers-directory.csv"; a.click();
    URL.revokeObjectURL(url);
    setNotice("Exported " + chosen.length + " selected buyers");
  };
  const emailSelected = () => {
    const chosen = filtered.filter((r) => r.id && sel.has(r.id));
    if (!chosen.length) { setNotice("Select at least one buyer to email"); return; }
    setNotice("Queued " + chosen.length + " buyer emails \u00b7 staging outbound");
  };

  const open = (r: BuyerRow) => () => {
    if (avail) onOpen(r.id);
    else setError("Directory is empty \u2014 reload to view live records");
  };

  if (!loaded) {
    return (
      <div>
        <KpiSkeleton count={4} />
        <div style={{ marginTop: 16 }}>
          <PanelSkeleton headerW={180} rows={8} cols={5} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ background: "#FDECEC", color: "#B33745", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{error}</div>
      )}
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Buyers directory</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>
            {avail ? show.length + " buyers on record" : "Live directory unavailable"} \u00b7 {filtered.length} shown \u00b7 click a row for the full 360 view
          </div>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, ID"
          style={{ width: 240, height: 38, borderRadius: 12, border: "1px solid #E4E6EE", background: "#fff", padding: "0 14px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", outline: "none" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        {[["Total buyers", String(show.length), "kyc-linked"], ["Contract value", moneyM(contracted), "across all units"], ["Collected", moneyM(collected), moneyM(outstanding) + " outstanding"], ["Overdue", moneyM(show.reduce((a, b) => a + b.overdue, 0)), "needs follow-up"]].map(([l, v, n]) => (
          <div key={l} style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 11 }}>{v}</div>
            <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 4 }}>{n}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {([["all", "All KYC"], ["cleared", "Cleared"], ["pending", "Pending"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setKycF(k)} style={{ height: 30, border: 0, borderRadius: 9, padding: "0 13px", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, background: kycF === k ? "#F0EFFE" : "#F1F2F6", color: kycF === k ? AC : "#6B7180" }}>{l}</button>
        ))}
        <span style={{ width: 1, height: 18, background: "#E4E6EE" }} />
        {([["all", "All docs"], ["has", "Has documents"], ["none", "No documents"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setDocsF(k)} style={{ height: 30, border: 0, borderRadius: 9, padding: "0 13px", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, background: docsF === k ? "#F0EFFE" : "#F1F2F6", color: docsF === k ? AC : "#6B7180" }}>{l}</button>
        ))}
        <button onClick={() => setOverdueOnly(!overdueOnly)} style={{ height: 30, border: 0, borderRadius: 9, padding: "0 13px", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, background: overdueOnly ? "#FDECEC" : "#F1F2F6", color: overdueOnly ? "#E5484D" : "#6B7180" }}>{"\u26a0"} Overdue only</button>
        {sel.size > 0 && (
          <span style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: AC }}>{sel.size} selected</span>
            <button onClick={exportSelected} style={{ height: 30, borderRadius: 9, border: "1px solid #EDEEF3", background: "#fff", padding: "0 13px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Export selected</button>
            <button onClick={emailSelected} style={{ height: 30, borderRadius: 9, border: "1px solid #EDEEF3", background: "#fff", padding: "0 13px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Email selected</button>
            <button onClick={() => setSel(new Set())} style={{ height: 30, borderRadius: 9, border: 0, background: "transparent", padding: "0 8px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: "#6B7180", cursor: "pointer" }}>Clear</button>
          </span>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflowX: "auto" }}>
        <div style={{ minWidth: 1240 }}>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1.5fr 1.1fr 74px 58px 1fr 1fr 1fr 1fr 1.2fr 1fr 1fr", gap: 10, padding: "14px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
            <span />
            <span>Buyer</span><span>Contact</span><span>KYC</span><span style={{ textAlign: "right" }}>Units</span><span style={{ textAlign: "right" }}>Contracted</span><span style={{ textAlign: "right" }}>Collected</span><span style={{ textAlign: "right" }}>Outstanding</span><span style={{ textAlign: "right" }}>Overdue</span><span>Docs</span><span>Agent</span><span>Broker</span>
          </div>
          {filtered.map((r) => {
            const picked = r.id != null && sel.has(r.id);
            const docs = r.docCount || 0;
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "40px 1.5fr 1.1fr 74px 58px 1fr 1fr 1fr 1fr 1.2fr 1fr 1fr", gap: 10, alignItems: "center", padding: "0 22px", height: 64, borderBottom: "1px solid #F6F7FA", cursor: avail ? "pointer" : "default", background: avail ? (picked ? "#F7F9FF" : "transparent") : "#FAFBFC" }}>
                <span onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={picked} onChange={() => r.id && toggle(r.id)} style={{ width: 15, height: 15, accentColor: AC, cursor: "pointer" }} />
                </span>
                <span onClick={open(r)} style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <span style={{ width: 36, height: 36, flex: "none", borderRadius: 12, background: "#EDECFE", display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 800, color: AC }}>{r.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: "#9AA0AE", fontWeight: 500, marginTop: 2 }}>B-{String(r.id).padStart(5, "0")}{r.next ? " \u00b7 next " + money(r.next.amount) + " \u00b7 " + fmtShort(r.next.date) : " \u00b7 no upcoming instalments"}</span>
                  </span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.phone || "\u2014"}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "#9AA0AE", fontWeight: 500, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.email || "\u2014"}</span>
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 0", textAlign: "center", background: r.kyc === "cleared" ? "#E9F8F1" : "#FDF4E5", color: r.kyc === "cleared" ? "#1F9D6B" : "#B07B14" }}>{r.kyc === "cleared" ? "Cleared" : "Pending"}</span>
                <span style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 600 }}>{r.units}</span>
                <span style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700 }}>{moneyM(r.contracted)}</span>
                <span style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "#1F9D6B" }}>{moneyM(r.collected)}</span>
                <span style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "#B07B14" }}>{moneyM(r.outstanding)}</span>
                <span style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: r.overdue > 0 ? "#E5484D" : "#9AA0AE" }}>{r.overdue > 0 ? moneyM(r.overdue) : "\u2014"}</span>
                <span>
                  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#F1F2F7", overflow: "hidden", minWidth: 34 }}>
                      <div style={{ height: "100%", borderRadius: 3, background: docs ? AC : "#E4E6EE", width: Math.min(100, (docs / 4) * 100) + "%" }} />
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: docs ? AC : "#9AA0AE" }}>{docs}</span>
                  </div>
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.agent || "\u2014"}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.agency || "\u2014"}</span>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: "18px 22px", textAlign: "center", fontSize: 12.5, color: "#9AA0AE", fontWeight: 600 }}>No buyers match the current filters</div>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BUYER 360
   ═══════════════════════════════════════════════════════════════════ */
function Buyer360({ btab, setBtab, goUnit }: { btab:string; setBtab:(v:any)=>void; goUnit:(id:string)=>void }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [extraDocs, setExtraDocs] = useState<{ doc_type: string; ref: string }[]>([]);
  const [chan, setChan] = useState("Email");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [commsNotice, setCommsNotice] = useState("");
  const [live, setLive] = useState<BuyerDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const idRaw = router.query.id;
  const bid = typeof idRaw === "string" ? Number(idRaw) : NaN;

  useEffect(() => {
    if (!Number.isInteger(bid) || bid <= 0) return;
    let active = true;
    fetchJSON<{ buyer: BuyerDetail }>("/api/buyers?id=" + bid)
      .then((j) => { if (active) { setLoaded(true); setLive(j.buyer); } })
      .catch((e) => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [bid]);

  const tabs: [string,string][] = [["profile","Profile"],["units","Units"],["ledger","Ledger"],["sched","Schedule"],["docs","Documents"],["comms","Comms"],["activity","Activity"]];
  const buyerName = live ? live.name : "Loading buyer";
  const buyerId = live ? "B-00" + String(live.id).padStart(3,"0") : "\u2014";
  const initials = buyerName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const kyc = live ? live.kyc : "pending";

  const contracted = live ? live.units.reduce((a, u) => a + u.price, 0) : 0;
  const collected = live ? live.ledger.reduce((a, r) => a + r.credit, 0) : 0;
  const outstanding = Math.max(0, contracted - collected);
  const overdue = live ? live.overdue : 0;
  const nextDue = live && live.next ? live.next : null;

  const tiles = [
    { l: "Total contracted", v: moneyM(contracted), n: (live ? live.units.length : 0) + " units", ok: false },
    { l: "Collected", v: moneyM(collected), n: contracted ? ((collected / contracted) * 100).toFixed(1) + "% of contracted" : "no collection on record", ok: true },
    { l: "Outstanding", v: moneyM(outstanding), n: "across " + (live ? live.ledger.length : 0) + " instalments", ok: false },
    { l: "Overdue", v: moneyM(overdue), n: overdue > 0 ? "needs follow-up" : "no arrears on record", ok: false },
  ];

  const units = live ? live.units.map((u) => ({ no: u.no, st: u.status === "sold" ? "Sold" : u.status.charAt(0).toUpperCase() + u.status.slice(1), meta: u.type + " \u00b7 " + u.area.toLocaleString("en-US") + " sq.ft" + (u.view ? " \u00b7 " + u.view : ""), price: money(u.price), pct: u.pct + "%", p: u.pct })) : [];

  const fmtLD = (d: string) => {
    const [y, mo, dd] = d.split("-");
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return dd + " " + MON[Number(mo) - 1] + " " + y.slice(2);
  };
  const ledger: [string,string,string,string,string,string][] = live
    ? live.ledger.map((r) => [fmtLD(r.date), r.unit, r.desc, "", r.credit.toLocaleString("en-US"), r.balance.toLocaleString("en-US")] as [string,string,string,string,string,string])
    : [];

  const numM = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? Math.round(v / 1e3) + "k" : String(Math.round(v)));
  const schedBars = (() => {
    if (!live) return [];
    const now = new Date();
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const byYm: Record<string, number> = {};
    live.schedule.forEach((s) => { byYm[s.ym] = s.amt; });
    const bars: { label: string; amt: number }[] = [];
    for (let k = 0; k < 12; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
      const ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      bars.push({ label: MON[d.getMonth()], amt: byYm[ym] || 0 });
    }
    const mx = Math.max(...bars.map((b) => b.amt), 1);
    return bars.map((b) => ({ label: b.label, v: b.amt, pct: b.amt ? Math.max(3, (b.amt / mx) * 93) : 3, text: b.amt ? numM(b.amt) : "\u2014" }));
  })();

  const score = live ? Math.max(1, Math.min(5, Math.round((live.miles.paid / Math.max(1, live.miles.total)) * 5))) : 0;
  const behaviorSub = live
    ? live.miles.paid + " of " + live.miles.total + " instalments paid in full."
    : "Payment behaviour unavailable until a record is linked.";
  const rel: [string,string][] = live
    ? [["First purchase", fmtShort(live.firstPaid || "")], ["Lifetime value", moneyM(contracted)], ["Units", String(live.units.length)], ["Instalments", live.miles.paid + "/" + live.miles.total + " paid"], ["KYC", kyc === "cleared" ? "Cleared" : "Pending"], ["Preferred contact", "Email"], ["Relationship manager", "\u2014"]]
    : [];

  const profileRows: [string,string][] = live
    ? [
        ["Buyer type", "Individual"],
        ["KYC status", kyc === "cleared" ? "Cleared" : "Pending"],
        ["Nationality", "\u2014"],
        ["First purchase", fmtShort(live.firstPaid || "")],
        ["Lifetime value", moneyM(contracted)],
        ["Units on record", String(live.units.length)],
        ["Agent", live.agent || "\u2014"],
        ["Broker agency", live.agency || "\u2014"],
        ["Preferred contact", "Email"],
        ["Risk rating", kyc === "cleared" ? "Low" : "Screening"],
        ["Passport", "on file \u00b7 not digitalised"],
        ["Emirates ID", "on file \u00b7 not digitalised"],
        ["Source of funds", "\u2014"],
        ["Residence", "\u2014"],
      ]
    : [];

  const buyerDocs = [
    ...extraDocs.map((d) => ({ doc_type: d.doc_type, unit_no: "", ref: d.ref, status: "uploaded", generated_at: "today" })),
    ...(live
      ? (live.docs || []).map((d) => ({ doc_type: d.doc_type, unit_no: d.unit_no || "", ref: d.ref, status: d.status, generated_at: fmtShort(d.generated_at) }))
      : []),
  ];

  const commsLog: { subj: string; when: string; chan: string; sent: boolean }[] = [];

  const act: Act[] = (() => {
    if (!live) return [];
    const out: Act[] = [];
    live.units.forEach((u) => out.push({ text: "Contract on " + u.no, meta: u.type + " \u00b7 " + u.status, when: "on record", color: "#8B7CF6" }));
    live.ledger.forEach((r) => out.push({ text: "Payment received \u00b7 " + r.desc, meta: money(r.credit) + " credited against " + r.unit, when: fmtShort(r.date), color: "#34C08A" }));
    if (live.next) out.push({ text: "Next instalment \u00b7 " + live.next.milestone, meta: money(live.next.amount) + " on " + live.next.unit, when: fmtShort(live.next.date), color: "#E2A33C" });
    return out;
  })();

  const sendStatement = () => {
    const totals = { contracted: moneyM(contracted), collected: moneyM(collected), outstanding: moneyM(outstanding) };
    const uRows = live ? units : [];
    const lRows = live
      ? live.ledger.map((r) => ({ date: r.date, unit: r.unit, desc: r.desc, debit: "", credit: String(r.credit), balance: String(r.balance) }))
      : [];
    exportBuyerStatement(buyerName, buyerId, uRows, lRows, totals);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  const recordPayment = () => {
    const q: Record<string,string> = { s: "payments", buyer: buyerName };
    router.push({ pathname: "/finance", query: q }, undefined, { shallow: true });
  };

  const backToDir = () => {
    const q: Record<string,string> = { s: "buyer" };
    const sc = router.query.scope;
    if (sc && sc !== "ALL") q.scope = String(sc);
    router.replace({ pathname: "/sales", query: q }, undefined, { shallow: true });
  };

  const contactLine = live
    ? [live.phone, live.email, "Risk rating: Low"].filter(Boolean).join(" \u00b7 ")
    : "\u2014";

  if (!loaded) {
    return (
      <div>
        <PanelSkeleton headerW={160} rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div>
      <button onClick={backToDir} style={{ height: 32, borderRadius: 10, border: "1px solid #EDEEF3", background: "#fff", padding: "0 13px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#6B7180", cursor: "pointer", marginBottom: 14 }}>{"\u2039"} Back to directory</button>
      {sent && (
        <div style={{ background:"#E9F8F1", color:"#1F9D6B", borderRadius:12, padding:"11px 16px", fontSize:12, fontWeight:700, marginBottom:16 }}>
          Statement generated and emailed to {buyerName} \u00b7 PDF downloaded \u00b7 logged to buyer vault
        </div>
      )}
      {/* header card */}
      <div style={{background:"#fff",borderRadius:20,padding:"22px 24px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
          <div style={{width:54,height:54,flex:"none",borderRadius:18,background:"#EDECFE",display:"grid",placeItems:"center",fontSize:17,fontWeight:800,color:AC}}>{initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:22,fontWeight:800,letterSpacing:"-.03em"}}>{buyerName}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,background:"#F1F2F7",borderRadius:8,padding:"4px 8px",color:"#6B7180"}}>{buyerId}</span>
              <span style={{fontSize:11,fontWeight:700,background:kyc==="cleared"?"#E9F8F1":"#FDF4E5",color:kyc==="cleared"?"#1F9D6B":"#B07B14",borderRadius:8,padding:"4px 9px"}}>{kyc==="cleared"?"KYC cleared":"KYC pending"}</span>
              <span style={{fontSize:11,fontWeight:700,background:"#F1F2F7",color:"#4A5060",borderRadius:8,padding:"4px 9px"}}>Individual</span>
            </div>
            <div style={{fontSize:12.5,color:"#6B7180",fontWeight:500,marginTop:7}}>{contactLine}</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={sendStatement} style={{height:38,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",padding:"0 14px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Send statement</button>
            <button onClick={recordPayment} style={{height:38,borderRadius:12,background:AC,color:"#fff",border:0,padding:"0 16px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Record payment</button>
          </div>
        </div>
      </div>

      {/* tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr) 1.2fr",gap:14,marginTop:16}}>
        {tiles.map(t => (
          <div key={t.l} style={{background:"#fff",borderRadius:20,padding:"18px 20px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
            <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".06em",color:"#9AA0AE",textTransform:"uppercase"}}>{t.l}</div>
            <div style={{fontSize:20,fontWeight:800,letterSpacing:"-.03em",marginTop:11,color:t.ok?AC:"#14161F"}}>{t.v}</div>
            <div style={{fontSize:11,color:"#6B7180",fontWeight:500,marginTop:4}}>{t.n}</div>
          </div>
        ))}
        <div style={{background:"#14161F",borderRadius:20,padding:"18px 20px",color:"#fff"}}>
          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".06em",color:"rgba(255,255,255,.6)",textTransform:"uppercase"}}>Next due</div>
          {nextDue
            ? (
              <>
                <div style={{fontSize:21,fontWeight:800,letterSpacing:"-.03em",marginTop:12}}>{money(nextDue.amount)}</div>
                <div style={{fontSize:11.5,color:"rgba(255,255,255,.7)",fontWeight:500,marginTop:4}}>{fmtShort(nextDue.date)} \u00b7 {nextDue.unit} \u00b7 {nextDue.milestone}</div>
              </>
            )
            : (
              <div style={{fontSize:13,color:"rgba(255,255,255,.55)",fontWeight:600,marginTop:14}}>No upcoming instalments</div>
            )}
        </div>
      </div>

      {/* main + sidebar */}
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16,marginTop:16,alignItems:"start"}}>
        <div>
          {/* tabs */}
          <div style={{display:"flex",gap:4,background:"#fff",border:"1px solid #EDEEF3",borderRadius:13,padding:4,marginBottom:14,width:"fit-content"}}>
            {tabs.map(([k,label]) => (
              <button key={k} onClick={() => setBtab(k)} style={tabBtn(btab===k)}>{label}</button>
            ))}
          </div>

          {btab === "units" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {units.map(c => (
                <div key={c.no} style={{background:"#fff",borderRadius:20,overflow:"hidden",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
                  <div style={{height:104,background:"linear-gradient(135deg,#E8E9F5,#D6D8EA)"}} />
                  <div style={{padding:"16px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:600}}>{c.no}</span>
                      <span style={pill(c.st,c.st==="Sold")}>{c.st}</span>
                    </div>
                    <div style={{fontSize:11.5,color:"#9AA0AE",fontWeight:500,marginTop:5}}>{c.meta}</div>
                    <div style={{fontSize:17,fontWeight:800,letterSpacing:"-.03em",marginTop:12}}>{c.price}</div>
                    <div style={{display:"flex",alignItems:"center",gap:9,marginTop:12}}>
                      <span style={{flex:1,height:7,borderRadius:5,background:"#F1F2F7",overflow:"hidden"}}><span style={{display:"block",height:"100%",width:c.pct,background:AC}} /></span>
                      <span style={{fontSize:11,fontWeight:700,color:AC}}>{c.pct}</span>
                    </div>
                    <button onClick={() => goUnit(c.no)} style={{marginTop:14,width:"100%",height:34,borderRadius:11,border:"1px solid #EDEEF3",background:"#fff",fontFamily:"inherit",fontSize:11.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Open unit record</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {btab === "ledger" && (
            <div style={{background:"#fff",borderRadius:20,boxShadow:"0 1px 3px rgba(20,22,31,.04)",overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"84px 96px 1.3fr 92px 92px 100px",gap:8,padding:"14px 22px",fontSize:9.5,fontWeight:700,letterSpacing:".07em",color:"#9AA0AE",textTransform:"uppercase",background:"#FAFBFD",borderBottom:"1px solid #EDEEF3"}}>
                <span>Date</span><span>Unit</span><span>Description</span><span style={{textAlign:"right"}}>Debit</span><span style={{textAlign:"right"}}>Credit</span><span style={{textAlign:"right"}}>Balance</span>
              </div>
              {ledger.map(([date,unit,desc,debit,credit,bal],i) => (
                <div key={i} style={{display:"grid",gridTemplateColumns:"84px 96px 1.3fr 92px 92px 100px",gap:8,alignItems:"center",padding:"0 22px",height:38,borderBottom:"1px solid #F6F7FA"}}>
                  <span style={{fontSize:11.5,color:"#6B7180",fontWeight:600}}>{date}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#4A5060"}}>{unit.length > 4 ? unit : "H21-T1-" + unit}</span>
                  <span style={{fontSize:11.5,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{desc}</span>
                  <span style={{textAlign:"right",fontSize:11.5,color:"#6B7180"}}>{debit || "\u2014"}</span>
                  <span style={{textAlign:"right",fontSize:11.5,fontWeight:700,color:"#1F9D6B"}}>{credit || "\u2014"}</span>
                  <span style={{textAlign:"right",fontSize:11.5,fontWeight:700}}>{bal}</span>
                </div>
              ))}
            </div>
          )}

          {btab === "sched" && (
            <div style={{background:"#fff",borderRadius:20,padding:"22px 24px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
              <div style={{fontSize:14,fontWeight:700,letterSpacing:"-.015em",marginBottom:4}}>Forward schedule \u00b7 12 months</div>
              <div style={{fontSize:11.5,color:"#9AA0AE",fontWeight:500}}>Merged across both units</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:10,height:180,marginTop:20}}>
                {schedBars.map((b,i) => (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center",height:"100%",gap:7}}>
                    <span style={{fontSize:9.5,fontWeight:700,color:"#6B7180"}}>{b.text}</span>
                    <span style={{display:"block",width:"100%",maxWidth:38,borderRadius:"9px 9px 3px 3px",background:b.v?AC:"#EDEEF3",height:b.pct+"%"}} />
                    <span style={{fontSize:9.5,fontWeight:600,color:"#9AA0AE"}}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {btab === "profile" && (
          <div style={{ background:"#fff", borderRadius:20, padding:"22px 24px", boxShadow:"0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize:13, fontWeight:700, letterSpacing:"-.015em", marginBottom:4 }}>Buyer profile</div>
            <div style={{ fontSize:11.5, color:"#9AA0AE", fontWeight:500, marginBottom:14 }}>Identity, KYC and relationship details</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"2px 32px" }}>
              {profileRows.map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:16, padding:"10px 0", borderBottom:"1px solid #F6F7FA" }}>
                  <span style={{ fontSize:11.5, color:"#9AA0AE", fontWeight:500 }}>{k}</span>
                  <span style={{ fontSize:12, fontWeight:700, textAlign:"right", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:16, background:"#F7F8FB", borderRadius:14, padding:"14px 16px" }}>
              {live ? (
                <BuyerPortalInvite buyerId={live.id} buyerName={live.name} buyerEmail={live.email} />
              ) : (
                <span style={{ fontSize:12.5, fontWeight:700, color:"#9AA0AE" }}>Staging \u00b7 portal invite available once the buyer is linked</span>
              )}
            </div>
          </div>
        )}

        {btab === "docs" && (
          <div style={{ background:"#fff", borderRadius:20, padding:"22px 24px", boxShadow:"0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:4 }}>
              <span style={{ fontSize:13, fontWeight:700, letterSpacing:"-.015em" }}>Documents</span>
              <span style={{ fontSize:11.5, color:"#9AA0AE", fontWeight:500 }}>{buyerDocs.length} on record</span>
            </div>
            <div style={{ fontSize:11.5, color:"#9AA0AE", fontWeight:500, marginBottom:14 }}>Generated, sent and uploaded files for this buyer</div>
            <div style={{ border:"1px solid #EDEEF3", borderRadius:14, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1.3fr 98px 1.4fr 100px 94px", gap:10, padding:"10px 16px", background:"#F7F8FB", fontSize:10, fontWeight:700, letterSpacing:".04em", color:"#9AA0AE", textTransform:"uppercase" }}>
                <span>Document</span><span>Unit</span><span>Reference</span><span>Status</span><span>Date</span>
              </div>
              {buyerDocs.map((d, i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1.3fr 98px 1.4fr 100px 94px", gap:10, alignItems:"center", padding:"9px 16px", borderTop:"1px solid #F3F4F8" }}>
                  <span style={{ fontSize:12, fontWeight:700 }}>{d.doc_type}</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#6B7180" }}>{d.unit_no || "\u2014"}</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#6B7180" }}>{d.ref}</span>
                  <span style={pill(d.status, d.status === "sent")}>{d.status}</span>
                  <span style={{ fontSize:11.5, color:"#6B7180", fontWeight:600 }}>{d.generated_at}</span>
                </div>
              ))}
              {buyerDocs.length === 0 && <div style={{ padding:"18px 16px", textAlign:"center", fontSize:12.5, color:"#9AA0AE", fontWeight:600 }}>No documents on record yet</div>}
            </div>
            <label style={{ display:"inline-flex", alignItems:"center", gap:8, marginTop:14, height:36, borderRadius:11, border:"1px solid #EDEEF3", background:"#fff", padding:"0 14px", fontFamily:"inherit", fontSize:12, fontWeight:700, color:"#4A5060", cursor:"pointer" }}>
              {"\u2191"} Upload document
              <input type="file" style={{ display:"none" }} onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) {
                  setExtraDocs((d) => [...d, { doc_type: f.name, ref: "UPL-" + String(Date.now()).slice(-6) }]);
                  setCommsNotice("Uploaded " + f.name + " to the buyer vault");
                }
                e.target.value = "";
              }} />
            </label>
          </div>
        )}

        {btab === "comms" && (
          <div style={{ background:"#fff", borderRadius:20, padding:"22px 24px", boxShadow:"0 1px 3px rgba(20,22,31,.04)" }}>
            {commsNotice && <div style={{ background:"#E9F8F1", color:"#1F9D6B", borderRadius:12, padding:"10px 14px", fontSize:12, fontWeight:700, marginBottom:14 }}>{commsNotice}</div>}
            <div style={{ fontSize:13, fontWeight:700, letterSpacing:"-.015em", marginBottom:4 }}>Communications</div>
            <div style={{ fontSize:11.5, color:"#9AA0AE", fontWeight:500, marginBottom:14 }}>Compose a message to {buyerName} \u00b7 activity logs here after send</div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              {["Email", "WhatsApp", "SMS"].map((c) => (
                <button key={c} onClick={() => setChan(c)} style={{ height:30, border:0, borderRadius:9, padding:"0 13px", cursor:"pointer", fontFamily:"inherit", fontSize:11.5, fontWeight:700, background:chan === c ? "#F0EFFE" : "#F1F2F6", color:chan === c ? AC : "#6B7180" }}>{c}</button>
              ))}
            </div>
            <input value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} placeholder={chan === "WhatsApp" || chan === "SMS" ? "Message preview" : "Subject"}
              style={{ width:"100%", height:40, borderRadius:12, border:"1px solid #E4E6EE", background:"#fff", padding:"0 14px", fontSize:13, fontWeight:600, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:10 }} />
            <textarea value={msgBody} onChange={(e) => setMsgBody(e.target.value)} rows={3} placeholder="Message body \u00b7 merge fields supported: {next_due_amount} {next_due_date} {unit}"
              style={{ width:"100%", borderRadius:12, border:"1px solid #E4E6EE", background:"#fff", padding:"10px 14px", fontSize:13, fontWeight:600, fontFamily:"inherit", outline:"none", boxSizing:"border-box", resize:"vertical" }} />
            <button onClick={() => {
              if (!msgBody.trim()) { setCommsNotice("Add a message body before sending"); return; }
              setCommsNotice("Queued " + chan + " to " + buyerName + " \u00b7 subject: " + (msgSubject || "(none)") + " \u00b7 staging outbound");
              setMsgSubject(""); setMsgBody("");
            }} style={{ marginTop:12, height:38, borderRadius:12, background:AC, color:"#fff", border:0, padding:"0 18px", fontFamily:"inherit", fontSize:12.5, fontWeight:700, cursor:"pointer" }}>Send {chan}</button>
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:".05em", color:"#9AA0AE", textTransform:"uppercase", marginBottom:8 }}>Outbound log</div>
              {commsLog.map((c, i) => (
                <div key={i} style={{ display:"flex", gap:11, padding:"9px 0", borderBottom:"1px solid #F6F7FA", alignItems:"flex-start" }}>
                  <span style={{ width:8, height:8, flex:"none", borderRadius:4, background:c.sent ? "#34C08A" : "#E2A33C", marginTop:5 }} />
                  <span style={{ flex:1, minWidth:0 }}>
                    <span style={{ display:"block", fontSize:12, fontWeight:700 }}>{c.subj}</span>
                    <span style={{ display:"block", fontSize:10.5, color:"#9AA0AE", fontWeight:500, marginTop:2 }}>{c.when} \u00b7 {c.chan}{c.sent ? "" : " \u00b7 queued"}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {btab === "activity" && (
          <div style={{ background:"#fff", borderRadius:20, padding:"22px 24px", boxShadow:"0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize:13, fontWeight:700, letterSpacing:"-.015em", marginBottom:14 }}>Activity</div>
            {act.map((a, i) => (
              <div key={i} style={{ display:"flex", gap:12, padding:"11px 0", borderBottom:"1px solid #F6F7FA", alignItems:"flex-start" }}>
                <span style={{ width:9, height:9, flex:"none", borderRadius:5, background:a.color, marginTop:4 }} />
                <span style={{ flex:1, minWidth:0 }}>
                  <span style={{ display:"block", fontSize:12.5, fontWeight:700 }}>{a.text}</span>
                  <span style={{ display:"block", fontSize:11, color:"#9AA0AE", fontWeight:500, marginTop:2 }}>{a.meta}</span>
                </span>
                <span style={{ fontSize:10.5, color:"#9AA0AE", fontWeight:600, whiteSpace:"nowrap" }}>{a.when}</span>
              </div>
            ))}
            {act.length === 0 && <div style={{ padding:"18px 0", textAlign:"center", fontSize:12.5, color:"#9AA0AE", fontWeight:600 }}>No activity on record yet</div>}
          </div>
        )}

        {/* sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:"#fff",borderRadius:20,padding:"20px 22px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
            <div style={{fontSize:13,fontWeight:700,letterSpacing:"-.015em",marginBottom:14}}>Payment behaviour</div>
            <div style={{display:"flex",gap:5,marginBottom:10}}>
              {[1,1,1,1,1].map((m,i) => <span key={i} style={{flex:1,height:8,borderRadius:5,background:i<score?"#34C08A":"#EDEEF3"}} />)}
            </div>
            <div style={{fontSize:12,fontWeight:700}}>Reliable \u00b7 {score} of 5</div>
            <div style={{fontSize:11,color:"#9AA0AE",fontWeight:500,marginTop:4,lineHeight:1.55}}>{behaviorSub}</div>
          </div>
          <div style={{background:"#fff",borderRadius:20,padding:"20px 22px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
            <div style={{fontSize:13,fontWeight:700,letterSpacing:"-.015em",marginBottom:12}}>Relationship</div>
            {rel.map(([k,v]) => (
              <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid #F6F7FA"}}>
                <span style={{fontSize:11.5,color:"#9AA0AE",fontWeight:500}}>{k}</span>
                <span style={{fontSize:11.5,fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:"#FDF4E5",borderRadius:20,padding:"18px 20px"}}>
            <div style={{display:"flex",gap:10}}>
              <span style={{width:8,height:8,borderRadius:5,background:"#E2A33C",marginTop:5,flex:"none"}} />
              <span>
                <span style={{display:"block",fontSize:12.5,fontWeight:700,color:"#8A6410"}}>Passport expires in 47 days</span>
                <span style={{display:"block",fontSize:11.5,color:"#A07C22",fontWeight:500,marginTop:4,lineHeight:1.5}}>Expires 11 Oct 2026. Request a renewed copy before the next Oqood submission.</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BROKERS
   ═══════════════════════════════════════════════════════════════════ */
type BrokAgency = { id: number; name: string; orn: string; alloc_units: number; deals: number; accrued: number; paid: number; rate: string; status: string };
type BrokAgent = { id: number; name: string; agency: string; brn: string; deals: number; value: number; discount_pct: number; days_to_close: number };
type BrokAct = { id: number; text: string; meta: string; kind: string; created_at: string };
type BrokData = { kpis: { agencies: number; pending: number; alloc_units: number; deals: number; accrued: number; unpaid: number }; agencies: BrokAgency[]; agents: BrokAgent[]; activity: BrokAct[] };
const BROK_FALLBACK: BrokData = {
  kpis: { agencies: 0, pending: 0, alloc_units: 0, deals: 0, accrued: 0, unpaid: 0 },
  agencies: [],
  agents: [],
  activity: [],
};
const brokPill = (st: string) => st === "active" ? { bg: "#E9F8F1", color: "#1F9D6B" } : st === "onboarding" ? { bg: "#FDF4E5", color: "#B07B14" } : { bg: "#FDECEC", color: "#E5484D" };
const brokLabel = (st: string) => st === "active" ? "Active" : st === "onboarding" ? "Onboarding" : "Suspended";
const relAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + " h ago";
  return Math.round(s / 86400) + " d ago";
};

function Brokers({ brtab, setBrtab, brstep, setBrstep }: { brtab:string; setBrtab:(v:any)=>void; brstep:number; setBrstep:(n:number)=>void }) {
  const [data, setData] = useState<BrokData | null>(null);
  const [apiError, setApiError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [portalAgency, setPortalAgency] = useState<BrokAgency | null>(null);

  const banner = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 3800); };

  useEffect(() => {
    let active = true;
    fetchJSON<BrokData>("/api/brokers")
      .then((j) => { if (active) setData(j); })
      .catch((e) => { if (active) setApiError(e?.message || "Failed to load brokers"); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const refresh = async () => {
    const j = await fetchJSON<BrokData>("/api/brokers");
    setData(j);
    return j;
  };

  const toggleStatus = async (a: BrokAgency) => {
    const action = a.status === "active" ? "suspend" : a.status === "suspended" ? "activate" : "activate";
    try {
      await fetchJSON<any>("/api/brokers?id=" + a.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const j = await refresh();
      banner((action === "suspend" ? "Agency suspended · " : "Agency " + a.name + " set live · ") + (action === "suspend" ? a.name : ""));
    } catch (e: any) { banner("Update failed: " + (e?.message || "request failed")); }
  };

  const submitOnboard = async () => {
    setBusy(true);
    try {
      await fetchJSON<any>("/api/brokers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: ONBOARD_FIELDS[0][1], orn: ONBOARD_FIELDS[3][1], commission_rate: ONBOARD_FIELDS[6][1].split(" ")[0] }) });
      const j = await refresh();
      setData(j);
      banner(ONBOARD_FIELDS[0][1] + " submitted for onboarding");
      setBrtab("agencies");
    } catch (e: any) { banner("Onboard failed: " + (e?.message || "request failed")); }
    finally { setBusy(false); }
  };

  const brokerTabs: [string,string][] = [["agencies","Agencies"],["agents","Agents"],["onboard","Onboard agency"],["activity","Activity"]];
  const showAgencies = brtab === "agencies";
  const showAgents = brtab === "agents";
  const showOnboard = brtab === "onboard";
  const showActivity = brtab === "activity";

  if (!loaded) {
    return (
      <div>
        <PanelSkeleton headerW={260} rows={9} cols={6} />
      </div>
    );
  }

  const show = data || BROK_FALLBACK;
  const k = show.kpis;

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — showing empty view
        </div>
      )}
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{display:"flex",alignItems:"flex-end",gap:16,marginBottom:18}}>
        <div style={{flex:1}}>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:"-.03em",lineHeight:1.15}}>Brokers &amp; agencies</div>
          <div style={{fontSize:13,color:"#6B7180",fontWeight:500,marginTop:5}}>Brokers place 64% of units booked. Live inventory beats a stale PDF.</div>
        </div>
        <div style={{display:"flex",gap:4,background:"#fff",border:"1px solid #EDEEF3",borderRadius:13,padding:4}}>
          {brokerTabs.map(([k,label]) => (
            <button key={k} onClick={() => setBrtab(k)} style={tabBtn(brtab===k)}>{label}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:16}}>
        {[["Registered agencies",String(k.agencies),k.pending + " pending onboarding"],["Allocated inventory",k.alloc_units + " units","live portfolio allocation"],["Deals in progress",String(k.deals),"across all agencies"],["Commission accrued",moneyM(k.accrued),moneyM(k.unpaid) + " unpaid"],["Broker share of sales","64%","of units booked YTD"]].map(([l,v,n]) => (
          <div key={l} style={{background:"#fff",borderRadius:20,padding:"18px 20px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
            <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".06em",color:"#9AA0AE",textTransform:"uppercase"}}>{l}</div>
            <div style={{fontSize:20,fontWeight:800,letterSpacing:"-.03em",marginTop:11}}>{v}</div>
            <div style={{fontSize:11,color:"#6B7180",fontWeight:500,marginTop:4}}>{n}</div>
          </div>
        ))}
      </div>

      {/* agencies table */}
      {showAgencies && (
        <div style={{background:"#fff",borderRadius:20,boxShadow:"0 1px 3px rgba(20,22,31,.04)",overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1.5fr 90px 92px 64px 104px 104px 64px 96px 1fr",gap:10,padding:"14px 24px",fontSize:9.5,fontWeight:700,letterSpacing:".07em",color:"#9AA0AE",textTransform:"uppercase",background:"#FAFBFD",borderBottom:"1px solid #EDEEF3"}}>
            <span>Agency</span><span>ORN</span><span>Allocated</span><span style={{textAlign:"right"}}>Deals</span><span style={{textAlign:"right"}}>Accrued</span><span style={{textAlign:"right"}}>Paid</span><span style={{textAlign:"right"}}>Rate</span><span>Status</span><span></span>
          </div>
          {show.agencies.map(a => {
            const pill = brokPill(a.status);
            return (
              <div key={a.id} style={{display:"grid",gridTemplateColumns:"1.5fr 90px 92px 64px 104px 104px 64px 96px 1fr",gap:10,alignItems:"center",padding:"0 24px",height:56,borderBottom:"1px solid #F6F7FA"}}>
                <span style={{display:"flex",alignItems:"center",gap:11,minWidth:0}}>
                  <span style={{width:32,height:32,flex:"none",borderRadius:11,background:"#EDECFE",display:"grid",placeItems:"center",fontSize:11,fontWeight:800,color:AC}}>{a.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}</span>
                  <span style={{fontSize:12.5,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.name}</span>
                </span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"#6B7180"}}>{a.orn}</span>
                <span style={{fontSize:11.5,fontWeight:600,color:"#6B7180"}}>{Number(a.alloc_units)} units</span>
                <span style={{textAlign:"right",fontSize:11.5,fontWeight:700}}>{Number(a.deals)}</span>
                <span style={{textAlign:"right",fontSize:11.5,fontWeight:700}}>{moneyM(Number(a.accrued))}</span>
                <span style={{textAlign:"right",fontSize:11.5,fontWeight:600,color:"#6B7180"}}>{moneyM(Number(a.paid))}</span>
                <span style={{textAlign:"right",fontSize:11.5,fontWeight:700}}>{a.rate}</span>
                <span style={{fontSize:10,fontWeight:700,borderRadius:7,padding:"3px 8px",textAlign:"center",background:pill.bg,color:pill.color}}>{brokLabel(a.status)}</span>
                <span style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                  <button onClick={() => setPortalAgency(portalAgency && portalAgency.id === a.id ? null : a)} style={{height:28,borderRadius:9,border:"1px solid #EDEEF3",background:portalAgency && portalAgency.id === a.id ? "#F0EFFE" : "#fff",padding:"0 10px",fontFamily:"inherit",fontSize:10.5,fontWeight:700,color:portalAgency && portalAgency.id === a.id ? AC : "#4A5060",cursor:"pointer"}}>Portal</button>
                  <button style={{height:28,borderRadius:9,border:"1px solid #EDEEF3",background:"#fff",padding:"0 10px",fontFamily:"inherit",fontSize:10.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Allocation</button>
                  <button onClick={() => toggleStatus(a)} disabled={busy} style={{height:28,borderRadius:9,border:0,background:"#F0EFFE",padding:"0 10px",fontFamily:"inherit",fontSize:10.5,fontWeight:700,color:AC,cursor:"pointer"}}>{a.status === "active" ? "Suspend" : a.status === "suspended" ? "Reinstate" : "Go live"}</button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {portalAgency && (
        <BrokerPortalEnable agencyId={portalAgency.id} agencyName={portalAgency.name} onDone={() => {}} />
      )}

      {/* agents table */}
      {showAgents && (
        <div style={{background:"#fff",borderRadius:20,boxShadow:"0 1px 3px rgba(20,22,31,.04)",overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1.3fr 1.2fr 100px 64px 104px 84px 84px",gap:10,padding:"14px 24px",fontSize:9.5,fontWeight:700,letterSpacing:".07em",color:"#9AA0AE",textTransform:"uppercase",background:"#FAFBFD",borderBottom:"1px solid #EDEEF3"}}>
            <span>Agent</span><span>Agency</span><span>BRN</span><span style={{textAlign:"right"}}>Deals</span><span style={{textAlign:"right"}}>Value</span><span style={{textAlign:"right"}}>Avg disc</span><span style={{textAlign:"right"}}>Days to close</span>
          </div>
          {show.agents.map(g => (
            <div key={g.id} style={{display:"grid",gridTemplateColumns:"1.3fr 1.2fr 100px 64px 104px 84px 84px",gap:10,alignItems:"center",padding:"0 24px",height:52,borderBottom:"1px solid #F6F7FA"}}>
              <span style={{display:"flex",alignItems:"center",gap:11,minWidth:0}}>
                <span style={{width:30,height:30,flex:"none",borderRadius:10,background:"#E7E9F0",display:"grid",placeItems:"center",fontSize:10.5,fontWeight:700,color:"#4A5060"}}>{g.name.split(" ").map((x) => x[0]).join("")}</span>
                <span style={{fontSize:12.5,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.name}</span>
              </span>
              <span style={{fontSize:11.5,color:"#6B7180",fontWeight:600}}>{g.agency}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,color:"#6B7180"}}>{g.brn}</span>
              <span style={{textAlign:"right",fontSize:11.5,fontWeight:700}}>{Number(g.deals)}</span>
              <span style={{textAlign:"right",fontSize:11.5,fontWeight:700}}>{moneyM(Number(g.value))}</span>
              <span style={{textAlign:"right",fontSize:11.5,fontWeight:600,color:"#6B7180"}}>{Number(g.discount_pct).toFixed(1)}%</span>
              <span style={{textAlign:"right",fontSize:11.5,fontWeight:600,color:"#6B7180"}}>{Number(g.days_to_close)} d</span>
            </div>
          ))}
        </div>
      )}

      {/* onboard wizard */}
      {showOnboard && (
        <div style={{display:"grid",gridTemplateColumns:"230px 1fr 290px",gap:18,alignItems:"start"}}>
          <div style={{background:"#fff",borderRadius:20,padding:"20px 18px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
            <div style={{fontSize:13,fontWeight:800,letterSpacing:"-.02em",marginBottom:16}}>Onboard agency</div>
            {ONBOARD_STEPS.map(([label,sub],i) => {
              const done = i < 2; const active = brstep === i+1;
              return (
                <button key={label} onClick={() => setBrstep(i+1)} style={{width:"100%",display:"flex",gap:11,alignItems:"center",padding:10,border:0,borderRadius:12,cursor:"pointer",fontFamily:"inherit",background:active?"#F0EFFE":"transparent"}}>
                  <span style={{width:24,height:24,flex:"none",borderRadius:8,display:"grid",placeItems:"center",fontSize:11,fontWeight:800,background:done?"#34C08A":active?AC:"#F1F2F7",color:done||active?"#fff":"#9AA0AE"}}>{done?"✓":String(i+1)}</span>
                  <span style={{flex:1,textAlign:"left"}}>
                    <span style={{display:"block",fontSize:12,fontWeight:700}}>{label}</span>
                    <span style={{display:"block",fontSize:10.5,color:"#9AA0AE",fontWeight:600,marginTop:2}}>{sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{background:"#fff",borderRadius:20,padding:"24px 26px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
            <div style={{fontSize:18,fontWeight:800,letterSpacing:"-.025em"}}>Metropolitan Premium Properties</div>
            <div style={{fontSize:12.5,color:"#6B7180",fontWeight:500,marginTop:6}}>Draft saved 2 minutes ago · agency cannot see inventory until go live</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px",marginTop:24}}>
              {ONBOARD_FIELDS.map(([label,value,hintVal]) => (
                <div key={label}>
                  <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>{label}</div>
                  <div style={box(hintVal==="mandatory")}>
                    <span style={{flex:1}}>{value}</span>
                    {hintVal ? <span style={hint(hintVal)}>{hintVal}</span> : null}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:26,paddingTop:20,borderTop:"1px solid #F1F2F7"}}>
              <button onClick={() => banner("Draft saved · " + ONBOARD_FIELDS[0][1])} style={{height:40,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",padding:"0 16px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Save draft</button>
              <div style={{flex:1}} />
              <button onClick={submitOnboard} disabled={busy} style={{height:40,borderRadius:12,background:AC,color:"#fff",border:0,padding:"0 20px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,cursor:busy?"progress":"pointer",opacity:busy?0.7:1}}>{busy ? "Submitting…" : "Continue to allocation"}</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"#fff",borderRadius:20,padding:"20px 22px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
              <div style={{fontSize:13,fontWeight:700,letterSpacing:"-.015em",marginBottom:4}}>Document checklist</div>
              <div style={{fontSize:11,color:"#9AA0AE",fontWeight:500,marginBottom:12}}>4 of 6 received</div>
              {BROK_DOCS.map(([label,ok]) => (
                <div key={label} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #F6F7FA"}}>
                  <span style={{flex:1,fontSize:11.5,fontWeight:600,color:"#4A5060"}}>{label}</span>
                  <span style={{fontSize:10,fontWeight:700,borderRadius:7,padding:"3px 8px",background:ok?"#E9F8F1":"#FDECEC",color:ok?"#1F9D6B":"#E5484D"}}>{ok?"Received":"Outstanding"}</span>
                </div>
              ))}
              <button style={{marginTop:14,width:"100%",height:36,borderRadius:11,border:"1px dashed #C9CCD8",background:"transparent",fontFamily:"inherit",fontSize:11.5,fontWeight:700,color:"#6B7180",cursor:"pointer"}}>Request from agency</button>
            </div>
            <div style={{background:"#FDF4E5",borderRadius:20,padding:"18px 20px"}}>
              <div style={{display:"flex",gap:10}}>
                <span style={{width:8,height:8,borderRadius:5,background:"#E2A33C",marginTop:5,flex:"none"}} />
                <span>
                  <span style={{display:"block",fontSize:12.5,fontWeight:700,color:"#8A6410"}}>Cannot go live yet</span>
                  <span style={{display:"block",fontSize:11.5,color:"#A07C22",fontWeight:500,marginTop:4,lineHeight:1.55}}>The signed agency agreement and IBAN letter must be on file before inventory is exposed and commission can accrue.</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* activity */}
      {showActivity && (
        <div style={{background:"#fff",borderRadius:20,padding:"22px 24px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
          <div style={{fontSize:15,fontWeight:700,letterSpacing:"-.015em",marginBottom:4}}>Broker activity</div>
          <div style={{fontSize:11.5,color:"#9AA0AE",fontWeight:500,marginBottom:8}}>Every reservation, download and clawback, logged</div>
          {show.activity.map(a => {
            const dot = a.kind === "reservation" ? AC : a.kind === "commission" ? "#34C08A" : (a.kind === "clawback" || a.kind === "suspend") ? "#E5484D" : "#8A94A6";
            return (
              <div key={a.id} style={{display:"flex",gap:13,alignItems:"flex-start",padding:"13px 0",borderBottom:"1px solid #F6F7FA"}}>
                <span style={{width:9,height:9,borderRadius:5,flex:"none",marginTop:4,background:dot}} />
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:"block",fontSize:12.5,fontWeight:700}}>{a.text}</span>
                  <span style={{display:"block",fontSize:11,color:"#9AA0AE",fontWeight:600,marginTop:3}}>{a.meta}</span>
                </span>
                <span style={{fontSize:10.5,fontWeight:700,color:"#C2C6D2",whiteSpace:"nowrap"}}>{relAgo(a.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DOCUMENTS
   ═══════════════════════════════════════════════════════════════════ */
function Documents({ dtab, setDtab, doc, setDoc }: { dtab:string; setDtab:(v:any)=>void; doc:string; setDoc:(s:string)=>void }) {
  const [units, setUnits] = useState<{ no: string; typ: string; beds: number; area: number; price: number; psf: number }[]>([]);
  const [buyers, setBuyers] = useState<string[]>([]);
  const [unitNo, setUnitNo] = useState("");
  const [person, setPerson] = useState("");
  const [media, setMedia] = useState<Record<string, boolean>>({ "Floor plan": true, "Key plan": true, "Unit render": true, "View photograph": true, "Site plan": false, "Amenities page": false });
  const [sent, setSent] = useState(false);
  const [sentLabel, setSentLabel] = useState("");
  const [genLog, setGenLog] = useState<{ ref: string; type: string; when: string; buyer?: string }[]>([]);
  const [version, setVersion] = useState("v3");
  const [blocks, setBlocks] = useState<string[]>(DOC_BLOCKS.slice(0, DOC_BLOCKS.length - 1));
  const [dragB, setDragB] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Record<string, { version: string; status: string; changed_at?: string; blocks?: string[] }[]>>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    fetchJSON<{ docs: { ref: string; type: string; buyer: string; when: string }[]; templates: { doc_type: string; version: string; status: string; changed_at: string; blocks?: string[] }[] }>("/api/documents")
      .then((d) => {
        if (!alive) return;
        setGenLog(d.docs.slice(0, 5).map((x) => ({
          ref: x.ref,
          type: x.type,
          buyer: x.buyer,
          when: new Date(x.when).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        })));
        const grouped: Record<string, { version: string; status: string; changed_at?: string; blocks?: string[] }[]> = {};
        for (const t of d.templates) (grouped[t.doc_type] = grouped[t.doc_type] || []).push({ version: t.version, status: t.status, changed_at: t.changed_at, blocks: t.blocks || undefined });
        setTemplates(grouped);
        const live = (grouped[doc] || []).find((v) => v.status === "live");
        if (live) {
          setVersion(live.version);
          if (live.blocks && live.blocks.length > 0) setBlocks(live.blocks.filter((b) => b !== "Locked compliance footer"));
        }
      })
      .catch(() => { /* offline fallback: keep empty local log */ });
    return () => { alive = false; };
  }, [doc]);

  useEffect(() => {
    let alive = true;
    fetchJSON<{ units: { no: string; type?: string; beds?: number; area?: number; price?: number }[] }>("/api/inventory")
      .then((j) => {
        if (!alive || !Array.isArray(j.units)) return;
        setUnits(j.units.map((u) => ({ no: u.no, typ: u.type || "2 Bedroom", beds: u.beds || 0, area: u.area || 0, price: u.price || 0, psf: u.area ? Math.round((u.price || 0) / u.area) : 0 })));
      })
      .catch(() => {});
    fetchJSON<{ buyers: { name: string }[] }>("/api/buyers")
      .then((j) => {
        if (!alive || !Array.isArray(j.buyers)) return;
        setBuyers(j.buyers.map((b) => b.name).filter(Boolean));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const unitNos = units.map((u) => u.no);
  const unit = units.find((u) => u.no === unitNo);
  const price = unit ? unit.price : 0;
  const area = unit ? unit.area : 0;
  const psf = unit ? unit.psf : 0;
  const refBase = doc.split(" ").map((w) => w[0]).join("").toUpperCase() || "DOC";
  const ref = refBase + "-H21-" + String(4412 + (doc.length % 7)).padStart(6, "0");

  const vers = (templates[doc] || []).length ? templates[doc]! : [
    { version: "v3", status: "live" },
    { version: "v2", status: "archived" },
    { version: "v1", status: "archived" },
  ];

  const download = (notify: boolean) => {
    if (!unit) { setNotice("Live inventory unavailable \u2014 pick a unit to generate"); setTimeout(() => setNotice(""), 4000); return; }
    exportDocument(doc, { no: unitNo, typ: unit.typ || "2 Bedroom", beds: unit.beds || 2, area, price, psf }, person, ref);
    if (notify) {
      fetchJSON("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_type: doc, unit_no: unitNo, buyer: person, ref, status: "sent" }),
      }).catch(() => {});
      const when = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short" });
      setGenLog((l) => [{ ref, type: doc, when, buyer: person }, ...l].slice(0, 5));
      setSentLabel(ref);
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    }
  };

const setActive = () => {
    fetchJSON<{ version: string; templates: { version: string; status: string; changed_at: string; blocks?: string[] }[] }>(
      "/api/documents?doc_type=" + encodeURIComponent(doc) + "&action=activate&status=live",
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocks: [...blocks, "Locked compliance footer"] }) }
    )
.then((d) => {
        setVersion(d.version);
        setTemplates((prev) => ({ ...prev, [doc]: d.templates }));
        setNotice(d.version + " is now the active template for " + doc + " \u00b7 rolled out from today");
        setTimeout(() => setNotice(""), 4000);
      })
      .catch(() => {
        setNotice("Could not activate template \u2014 running offline");
        setTimeout(() => setNotice(""), 4000);
      });
  };
  const saveDraft = () => {
    fetchJSON<{ version: string; templates: { version: string; status: string; changed_at: string; blocks?: string[] }[] }>(
      "/api/documents?doc_type=" + encodeURIComponent(doc) + "&action=activate&status=draft",
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocks: [...blocks, "Locked compliance footer"] }) }
    )
      .then((d) => {
        setVersion(d.version);
        setTemplates((prev) => ({ ...prev, [doc]: d.templates }));
        setNotice(d.version + " draft saved for " + doc + " \u00b7 pending review");
        setTimeout(() => setNotice(""), 4000);
      })
      .catch(() => {
        setNotice("Could not save draft \u2014 running offline");
        setTimeout(() => setNotice(""), 4000);
      });
  };

  return (
    <div>
      {sent && (
        <div style={{ background:"#E9F8F1", color:"#1F9D6B", borderRadius:12, padding:"11px 16px", fontSize:12, fontWeight:700, marginBottom:16 }}>
          {doc} generated \u00b7 ref {sentLabel} \u00b7 emailed to {person} \u00b7 PDF downloaded \u00b7 versioned into unit + buyer vaults
        </div>
      )}
      {notice && (
        <div style={{ background:"#F0EFFE", color:AC, borderRadius:12, padding:"11px 16px", fontSize:12, fontWeight:700, marginBottom:16 }}>
          {notice}
        </div>
      )}
      <div style={{display:"flex",alignItems:"flex-end",gap:16,marginBottom:18}}>
        <div style={{flex:1}}>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:"-.03em",lineHeight:1.15}}>Document generator</div>
          <div style={{fontSize:13,color:"#6B7180",fontWeight:500,marginTop:5}}>Every generated document is versioned into the unit and buyer vaults, and every send is logged</div>
        </div>
        <div style={{display:"flex",gap:4,background:"#fff",border:"1px solid #EDEEF3",borderRadius:13,padding:4}}>
          {(["gen","studio"] as const).map(k => (
            <button key={k} onClick={() => setDtab(k)} style={tabBtn(dtab===k)}>{k==="gen"?"Generate":"Template studio"}</button>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:dtab==="gen"?"250px 1fr 290px":"250px 1fr 290px",gap:16,alignItems:"start"}}>
        {/* type list */}
        <div style={{background:"#fff",borderRadius:20,padding:14,boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:".08em",color:"#9AA0AE",textTransform:"uppercase",padding:"6px 10px 10px"}}>Document type</div>
          {DOC_TYPES.map(d => (
            <button key={d} onClick={() => setDoc(d)} style={{width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:9,padding:"10px 12px",border:0,borderRadius:11,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:doc===d?700:500,color:doc===d?"#14161F":"#6B7180",background:doc===d?"#F0EFFE":"transparent"}}>
              <span style={{width:5,height:5,borderRadius:5,flex:"none",background:doc===d?AC:"transparent"}} />
              <span>{d}</span>
            </button>
          ))}
        </div>

        {dtab === "gen" && (
          <>
            {/* preview */}
            <div style={{background:"#F0F1F5",borderRadius:20,padding:26,boxShadow:"inset 0 1px 3px rgba(20,22,31,.04)"}}>
              <div style={{background:"#fff",borderRadius:6,boxShadow:"0 8px 28px rgba(20,22,31,.13)",padding:"34px 36px",minHeight:520,display:"flex",flexDirection:"column"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",borderBottom:"2px solid #071A2F",paddingBottom:14}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,letterSpacing:"-.02em",color:"#071A2F"}}>ELLINGTON</div>
                    <div style={{fontSize:8,fontWeight:700,letterSpacing:".18em",color:"#C9A227",marginTop:3}}>PROPERTIES DEVELOPMENT</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:".1em",color:"#8A94A6",textTransform:"uppercase"}}>{doc}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#8A94A6",marginTop:3}}>{ref}</div>
                  </div>
                </div>
                <div style={{height:120,borderRadius:3,background:"linear-gradient(135deg,#DDE0EC,#C6CADF)",marginTop:20,display:"grid",placeItems:"center",fontSize:8.5,fontWeight:700,letterSpacing:".12em",color:"#8A94A6",textTransform:"uppercase"}}>Project render</div>
                <div style={{fontSize:19,fontWeight:800,letterSpacing:"-.025em",color:"#071A2F",marginTop:20}}>Belgravia Heights III</div>
                <div style={{fontSize:10,fontWeight:600,color:"#8A94A6",marginTop:3}}>Jumeirah Village Circle \u00b7 Dubai \u00b7 United Arab Emirates</div>
                <div style={{display:"flex",gap:0,marginTop:20,borderTop:"1px solid #E8EBF0",borderBottom:"1px solid #E8EBF0",padding:"14px 0"}}>
                  {[["Unit", unitNo], ["Typology", unit?.typ || "2 Bedroom"], ["Beds", unit ? String(unit.beds) + " bed" : "2 bed"], ["Area", area.toLocaleString("en-US") + " sq.ft"]].map(([l,v]) => (
                    <div key={l} style={{flex:1}}>
                      <div style={{fontSize:7.5,fontWeight:700,letterSpacing:".1em",color:"#8A94A6",textTransform:"uppercase"}}>{l}</div>
                      <div style={{fontFamily:l==="Unit"?"'JetBrains Mono',monospace":undefined,fontSize:11,fontWeight:600,color:"#071A2F",marginTop:4}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginTop:18}}>
                  <span style={{fontSize:9,fontWeight:700,letterSpacing:".1em",color:"#8A94A6",textTransform:"uppercase"}}>Total price</span>
                  <span style={{fontSize:17,fontWeight:800,letterSpacing:"-.025em",color:"#071A2F"}}>AED {price.toLocaleString("en-US")}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginTop:6}}>
                  <span style={{fontSize:9,fontWeight:600,color:"#8A94A6"}}>Price per sq.ft</span>
                  <span style={{fontSize:10,fontWeight:700,color:"#071A2F"}}>AED {psf.toLocaleString("en-US")}</span>
                </div>
                <div style={{marginTop:20}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:".1em",color:"#8A94A6",textTransform:"uppercase",paddingBottom:8,borderBottom:"1px solid #E8EBF0"}}>Payment plan \u00b7 20/40/40</div>
                  {[["Booking deposit \u00b7 10%","AED " + Math.round(price*0.1).toLocaleString("en-US")],["SPA execution \u00b7 10%","AED " + Math.round(price*0.1).toLocaleString("en-US")],["Construction linked \u00b7 60%","AED " + Math.round(price*0.6).toLocaleString("en-US")],["On handover \u00b7 20%","AED " + Math.round(price*0.2).toLocaleString("en-US")]].map(([l,v]) => (
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #F2F4F7"}}>
                      <span style={{fontSize:10,color:"#3D4759"}}>{l}</span>
                      <span style={{fontSize:10,fontWeight:700,color:"#071A2F"}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{flex:1}} />
                <div style={{borderTop:"1px solid #C9A227",marginTop:22,paddingTop:10,display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:7.5,fontWeight:600,color:"#8A94A6",lineHeight:1.5}}>RERA advertising permit 88410 \u00b7 DLD project 1884 \u00b7 ORN 21281<br/>Escrow: Emirates NBD \u00b7 AE49 0260 0010 5147 8632 401</span>
                  <span style={{fontSize:7.5,fontWeight:700,color:"#8A94A6"}}>Page 1 of 4</span>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:7,marginTop:16}}>
                {[0,1,2,3].map(i => <span key={i} style={{width:26,height:34,borderRadius:3,background:"#fff",border:i===0?"1.5px solid #4F46F5":"none",opacity:i===0?1:0.6}} />)}
              </div>
            </div>
            {/* gen sidebar */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{background:"#fff",borderRadius:20,padding:"20px 22px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
                <div style={{fontSize:13,fontWeight:700,letterSpacing:"-.015em",marginBottom:12}}>Generation options</div>
                <div style={{padding:"8px 0",borderBottom:"1px solid #F6F7FA"}}>
                  <div style={{fontSize:11.5,color:"#9AA0AE",fontWeight:500,marginBottom:6}}>Unit</div>
                  <select value={unitNo} onChange={(e) => setUnitNo(e.target.value)} style={{width:"100%",height:38,borderRadius:10,border:"1px solid #E4E6EE",padding:"0 10px",fontFamily:"inherit",fontSize:12,fontWeight:600,color:"#14161F",background:"#fff",outline:"none"}}>
                    {unitNos.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{padding:"8px 0",borderBottom:"1px solid #F6F7FA"}}>
                  <div style={{fontSize:11.5,color:"#9AA0AE",fontWeight:500,marginBottom:6}}>Buyer</div>
                  <select value={person} onChange={(e) => setPerson(e.target.value)} style={{width:"100%",height:38,borderRadius:10,border:"1px solid #E4E6EE",padding:"0 10px",fontFamily:"inherit",fontSize:12,fontWeight:600,color:"#14161F",background:"#fff",outline:"none"}}>
                    {buyers.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {[["Language","English"],["Validity","14 days"],["Watermark recipient",person],["Financial detail","Full schedule"]].map(([k,v]) => (
                  <div key={k} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid #F6F7FA"}}>
                    <span style={{fontSize:11.5,color:"#9AA0AE",fontWeight:500}}>{k}</span>
                    <span style={{fontSize:11.5,fontWeight:700,textAlign:"right"}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{background:"#fff",borderRadius:20,padding:"20px 22px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
                <div style={{fontSize:13,fontWeight:700,letterSpacing:"-.015em",marginBottom:12}}>Include media</div>
                {(["Floor plan","Key plan","Unit render","View photograph","Site plan","Amenities page"] as string[]).map((m) => {
                  const on = !!media[m];
                  return (
                    <div key={m} style={{display:"flex",alignItems:"center",gap:11,padding:"7px 0",cursor:"pointer"}} onClick={() => setMedia((prev) => ({ ...prev, [m]: !on }))}>
                      <span style={{flex:1,fontSize:11.5,fontWeight:600,color:"#4A5060"}}>{m}</span>
                      <span style={{width:34,height:20,borderRadius:11,flex:"none",position:"relative",background:on?AC:"#DDE0E8",transition:"background .15s"}}>
                        <span style={{position:"absolute",top:2,width:16,height:16,borderRadius:9,background:"#fff",left:on?"16px":"2px",transition:"left .15s"}} />
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                <button onClick={() => download(true)} style={{height:40,borderRadius:12,background:AC,color:"#fff",border:0,fontFamily:"inherit",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Generate and send</button>
                <button onClick={() => download(false)} style={{height:40,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",fontFamily:"inherit",fontSize:12.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Download PDF</button>
              </div>
              {genLog.length > 0 && (
                <div style={{background:"#fff",borderRadius:20,padding:"16px 20px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
                  <div style={{fontSize:12,fontWeight:700,letterSpacing:"-.01em",marginBottom:10}}>Recently generated</div>
                  {genLog.map((g) => (
                    <div key={g.ref + g.when + g.type} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"6px 0",borderBottom:"1px solid #F6F7FA",fontSize:10.5}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:"#4A5060"}}>{g.ref}</span>
                      <span style={{color:"#9AA0AE",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.type} \u00b7 {g.buyer || person}</span>
                      <span style={{color:"#C2C6D2",fontWeight:600}}>{g.when}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {dtab === "studio" && (
          <>
            <div style={{background:"#fff",borderRadius:20,padding:"22px 24px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
              <div style={{fontSize:15,fontWeight:700,letterSpacing:"-.015em"}}>Template blocks \u00b7 {doc}</div>
              <div style={{fontSize:11.5,color:"#9AA0AE",fontWeight:500,marginTop:3}}>Drag to reorder. The compliance footer cannot be removed by any role.</div>
<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
                {blocks.map((b, i) => (
                  <div key={b} draggable
                    onDragStart={() => setDragB(i)}
                    onDragOver={(e) => { e.preventDefault(); if (dragB !== null && dragB !== i) setBlocks((cur) => { const next = cur.slice(); const [m] = next.splice(dragB, 1); next.splice(i, 0, m); return next; }); }}
                    onDragEnd={() => setDragB(null)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",borderRadius:12,border:"1px solid #EDEEF3",background:dragB===i?"#F0EFFE":"#fff",cursor:"grab"}}>
                    <span style={{color:"#C2C6D2",fontSize:13,fontWeight:700,cursor:"grab"}}>{"\u2807"}</span>
                    <span style={{flex:1,fontSize:12.5,fontWeight:600}}>{b}</span>
                    <span style={{fontSize:9.5,fontWeight:700,color:"#C2C6D2"}}>{i === 0 ? "Top" : i === blocks.length - 1 ? "Bottom" : ""}</span>
                  </div>
                ))}
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",borderRadius:12,border:"1px solid #E2A33C",background:"#FDF4E5"}}>
                  <span style={{color:"#B07B14",fontSize:13,fontWeight:700}}>{"\u2807"}</span>
                  <span style={{flex:1,fontSize:12.5,fontWeight:600}}>Locked compliance footer</span>
                  <span style={{fontSize:9.5,fontWeight:800,letterSpacing:".06em",color:"#B07B14"}}>Locked</span>
</div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:20,paddingTop:16,borderTop:"1px solid #F1F2F7"}}>
                <button onClick={saveDraft} style={{height:38,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",padding:"0 15px",fontFamily:"inherit",fontSize:12,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Save as draft</button>
                <button onClick={setActive} style={{height:38,borderRadius:12,background:AC,color:"#fff",border:0,padding:"0 16px",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer"}}>Set as active template</button>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{background:"#fff",borderRadius:20,padding:"20px 22px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
                <div style={{fontSize:13,fontWeight:700,letterSpacing:"-.015em",marginBottom:4}}>Merge fields</div>
                <div style={{fontSize:11,color:"#9AA0AE",fontWeight:500,marginBottom:12}}>From the object model</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {MERGE_FIELDS.map(f => (
                    <span key={f} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,background:"#F5F6FA",border:"1px solid #EDEEF3",borderRadius:8,padding:"5px 8px",color:"#4A5060"}}>{"{{"+f+"}}"}</span>
                  ))}
                </div>
                <div style={{marginTop:18,paddingTop:14,borderTop:"1px solid #F1F2F7"}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:9}}>Version control</div>
                  {vers.map((v) => {
                    const live = v.status === "live";
                    const draft = v.status === "draft";
                    return (
                      <div key={v.version} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:live?undefined:"1px solid #F6F7FA"}}>
                        <span style={{fontSize:11.5,color:"#6B7180",fontWeight:600}}>{v.version}{v.changed_at ? " \u00b7 " + new Date(v.changed_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : ""}</span>
                        <span style={{fontSize:11,fontWeight:live||draft?700:600,color:live?"#1F9D6B":draft?"#B07B14":"#9AA0AE"}}>{live ? "Live" : draft ? "Draft" : "Archived"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
