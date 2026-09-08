import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AC, money } from "../../lib/format";
import { ALL_UNITS } from "../../lib/data";
import { exportBuyerStatement, exportDocument } from "../../lib/pdf";
import { fetchJSON } from "../../lib/api";
import { KpiSkeleton, PanelSkeleton } from "../Loading";

const BUYERS = ["Rajesh Menon","Aisha Al Marri","Hassan Al Rayes","Chen Liu","Daniel Whitfield","Elena Petrova","Marcus Lindqvist","Wei Chen","Priya Nair","Nadia Khoury","Sunil Rathore","Grace Okonkwo","Omar Al Suwaidi","Fatima Al Hashimi"];
const pill = (s: string, ok: boolean) =>
  ({ fontSize:10,fontWeight:700,borderRadius:7,padding:"3px 8px",textAlign:"center" as const,background:ok?"#E9F8F1":"#F1F2F6",color:ok?"#1F9D6B":"#6B7180" });

/* ── funnel ─────────────────────────────────────────────────────── */
const FUNNEL: [string,string,string][] = [
  ["Leads","284","31 days"],["Qualified","148","11 days"],["Viewing","96","8 days"],["EOI signed","58","5 days"],["Booked","41","3 days"],
];
const CONV = ["","52%","65%","60%","71%"];

/* ── kanban columns ─────────────────────────────────────────────── */
type Card = { name:string; flag:string; src:string; budget:string; chips:string[]; agent:string; age:string; live:boolean; id?:number; disc?:number; days?:number };
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
};
const LEADS_COLS: Col[] = [
  { label:"New",count:8,val:"AED 14.2M",color:"#8B7CF6",cards:[
    {name:"Hassan Al Rayes",flag:"UAE",src:"Property Finder",budget:"AED 2.0-2.6M",chips:["2BR","1204"],agent:"HA",age:"2 days",live:true},
    {name:"Julia Sorensen",flag:"DK",src:"Website",budget:"AED 1.4-1.8M",chips:["1BR"],agent:"RK",age:"1 day",live:true}]},
  { label:"Contacted",count:6,val:"AED 11.8M",color:"#8B7CF6",cards:[
    {name:"Vikram Shetty",flag:"IN",src:"Bayut",budget:"AED 2.4-3.0M",chips:["2BR","3BR"],agent:"SB",age:"4 days",live:true}]},
  { label:"Qualified",count:5,val:"AED 9.4M",color:AC,cards:[
    {name:"Amira Farouk",flag:"EG",src:"Referral",budget:"AED 1.8-2.2M",chips:["1BR","3302"],agent:"RK",age:"6 days",live:false},
    {name:"Tom Alderton",flag:"UK",src:"Exhibition",budget:"AED 3.0-3.8M",chips:["3BR"],agent:"HA",age:"3 days",live:true}]},
  { label:"Viewing",count:4,val:"AED 8.6M",color:AC,cards:[
    {name:"Chen Liu",flag:"CN",src:"Broker \u00b7 Allsopp",budget:"AED 2.2-2.8M",chips:["2BR"],agent:"SB",age:"2 days",live:true}]},
  { label:"Negotiation",count:5,val:"AED 12.1M",color:"#E2A33C",cards:[
    {name:"Yousef Al Nuaimi",flag:"UAE",src:"Walk-in",budget:"AED 4.0-4.6M",chips:["3BR","4102"],agent:"AH",age:"9 days",live:false},
    {name:"Marta Kowalski",flag:"PL",src:"Instagram",budget:"AED 1.6-2.0M",chips:["1BR"],agent:"RK",age:"5 days",live:true}]},
  { label:"EOI signed",count:3,val:"AED 6.4M",color:"#34C08A",cards:[
    {name:"Rohit Bansal",flag:"IN",src:"Referral",budget:"AED 2.2M",chips:["1905"],agent:"SB",age:"2 days",live:true}]},
  { label:"Booked",count:2,val:"AED 4.8M",color:"#34C08A",cards:[
    {name:"Aisha Al Marri",flag:"UAE",src:"Broker \u00b7 Betterhomes",budget:"AED 2.8M",chips:["2801"],agent:"AH",age:"closed",live:true}]},
  { label:"Lost",count:1,val:"AED 1.9M",color:"#8A94A6",cards:[
    {name:"Peter Nowak",flag:"DE",src:"Property Finder",budget:"AED 1.9M",chips:["\u2014"],agent:"RK",age:"price objection",live:false}]},
];

type LbRow = { agent:string; units:number; value:number; conv:number; disc:number; days:number };
const LB_FALLBACK: LbRow[] = [
  { agent:"Sarah Bennett", units:4, value:9800000, conv:57, disc:3.2, days:28 },
  { agent:"Ravi Khan", units:3, value:7100000, conv:43, disc:2.8, days:34 },
  { agent:"Hamza Ali", units:2, value:5400000, conv:33, disc:4.1, days:41 },
  { agent:"Dana Scott", units:2, value:4900000, conv:29, disc:2.1, days:22 },
  { agent:"Arvind Mehta", units:3, value:6600000, conv:38, disc:3.6, days:31 },
];

/* ── booking wizard ─────────────────────────────────────────────── */
const STEP_LABELS: [string,string][] = [["Unit & terms","Price, discount, plan"],["Buyer","Identity, KYC, AML"],["Payment schedule","Milestones and charges"],["Documents","Reservation, offer, SPA"],["Payment & confirm","Escrow reference required"]];
type Field = [string,string,string];
const SFIELDS: Record<number,Field[]> = {
  1:[["Unit","H21-T1-1204 \u00b7 2BR-B \u00b7 Level 12","locked"],["List price","AED 2,450,000","AED 1,972/sq.ft"],["Discount requested","7.5%  \u00b7  AED 183,750","approval"],["Net price","AED 2,266,250","AED 1,920/sq.ft"],["Payment plan","20/40/40 Construction Linked","7 milestones"],["Booking token","10%  \u00b7  AED 226,688","within bounds"],["DLD 4% payer","Buyer","AED 90,650"],["Broker","Betterhomes \u00b7 2.0% on SPA","external"]],
  2:[["Buyer type","Individual",""],["Full name (passport)","Hassan Al Rayes",""],["Nationality","United Arab Emirates",""],["Passport no.","A04128877 \u00b7 exp 12 Jun 2031","valid"],["Emirates ID","784-1988-4471203-6","valid"],["Mobile","+971 50 118 4472",""],["Source of funds","Salary and business income",""],["AML risk rating","Low","screened"]],
  3:[["Total contract value","AED 2,266,250",""],["Plan percentage total","100.0%","balanced"],["DLD registration 4%","AED 90,650","buyer"],["Oqood admin fee","AED 3,150","buyer"],["Developer admin fee","AED 4,200","buyer"],["Grand total","AED 2,364,250",""],["First instalment","14 Sep 2026",""],["Final instalment","Q4 2027 \u00b7 handover",""]],
  4:[["Reservation form","Generated \u00b7 v1","ready"],["Expression of interest","Generated \u00b7 4 pages","ready"],["Unit sales offer","Generated \u00b7 valid to 08 Sep 2026","ready"],["SPA draft","Awaiting legal review","pending"],["Signature routing","Buyer \u2192 Developer signatory",""],["Reminder cadence","Day 2, 5, 9",""]],
  5:[["Amount","AED 226,688",""],["Date","25 Aug 2026",""],["Method","Bank transfer",""],["Bank","Emirates NBD",""],["Transaction reference","TT-2026-441882",""],["Escrow deposit reference","ESC-2026-9021","mandatory"],["Receipt","RCP-H21-004713","auto"],["Upload","transfer-advice.pdf","attached"]],
};
const DEAL = [["Unit","H21-T1-1204"],["Typology","2BR-B \u00b7 1,180 sq.ft"],["List price","AED 2,450,000"],["Discount","\u22127.5%"],["Net price","AED 2,266,250"],["Price/sq.ft","AED 1,920"],["Plan","20/40/40"],["Buyer","Hassan Al Rayes"],["Broker","Betterhomes \u00b7 2.0%"]];

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
  next: { amount: number; date: string; unit: string; milestone: string } | null;
};
type BuyerDetail = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  kyc: string;
  units: { no: string; status: string; type: string; beds: number; area: number; price: number; view: string; pct: number }[];
  ledger: { date: string; unit: string; desc: string; debit: number | null; credit: number; balance: number }[];
  schedule: { ym: string; amt: number }[];
  next: { amount: number; date: string; unit: string; milestone: string } | null;
  overdue: number;
  firstPaid: string | null;
  miles: { paid: number; total: number };
};
const DIR_FALLBACK: BuyerRow[] = [
  { id: 1, name: "Rajesh Menon", email: "r.menon@arvexcapital.ae", phone: "+971 50 442 1187", kyc: "cleared", units: 2, contracted: 4780000, collected: 2870000, outstanding: 1910000, overdue: 0, next: { amount: 465500, date: "2026-09-14", unit: "H21-T1-1204", milestone: "Structure 40%" } },
  { id: 2, name: "Aisha Al Marri", email: "a.almarri@gmail.com", phone: "+971 50 221 8810", kyc: "cleared", units: 1, contracted: 2940000, collected: 1764000, outstanding: 1176000, overdue: 0, next: { amount: 512000, date: "2026-09-14", unit: "H21-T1-2801", milestone: "Excavation 20%" } },
  { id: 3, name: "Sunil Rathore", email: "sunil@rathore.co.in", phone: "+971 50 771 2219", kyc: "cleared", units: 1, contracted: 4120000, collected: 1296000, outstanding: 2824000, overdue: 1220000, next: null },
];

const B_TILES = [{l:"Total contracted",v:"AED 4.78M",n:"2 units \u00b7 Belgravia Heights III",ok:false},{l:"Collected",v:"AED 2.87M",n:"60.0% of contracted",ok:true},{l:"Outstanding",v:"AED 1.91M",n:"across 8 instalments",ok:false},{l:"Overdue",v:"AED 0",n:"no arrears on record",ok:false}];
const B_UNITS = [{no:"H21-T1-1204",st:"Sold",meta:"2BR-B \u00b7 1,180 sq.ft \u00b7 Level 12",price:"AED 2,327,500",pct:"62%",p:62},{no:"H21-T1-3302",st:"Booked",meta:"1BR-A \u00b7 748 sq.ft \u00b7 Level 33",price:"AED 2,452,500",pct:"58%",p:58}];
const B_LEDGER: [string,string,string,string,string,string][] = [
  ["14 Mar 26","1204","Booking deposit \u00b7 RCP-004102","","232,750","2,094,750"],
  ["13 Apr 26","1204","SPA execution \u00b7 RCP-004188","","232,750","1,862,000"],
  ["11 Apr 26","1204","DLD registration 4% \u00b7 INV-003112","93,100","","1,955,100"],
  ["12 Apr 26","1204","DLD registration \u00b7 RCP-004201","","93,100","1,862,000"],
  ["02 Jun 26","3302","Booking deposit \u00b7 RCP-004388","","245,250","1,616,750"],
  ["14 Jun 26","1204","Excavation 20% \u00b7 RCP-004521","","349,125","1,267,625"],
  ["20 Jul 26","3302","SPA execution \u00b7 RCP-004604","","245,250","1,022,375"],
  ["01 Aug 26","1204","NOC administration fee","2,100","","1,024,475"],
  ["12 Aug 26","3302","Construction 20% \u00b7 RCP-004712","","367,875","656,600"],
];
const B_SCHED = [0.47,0,0.62,0,0,0.39,0.71,0,0.24,0,0,0.93];
const B_SCHED_LABELS = ["S","O","N","D","J","F","M","A","M","J","J","A"];
const B_REL: [string,string][] = [["First purchase","14 Mar 2026"],["Lifetime value","AED 4.78M"],["Units","2"],["Referrals made","1 \u00b7 N. Khoury"],["Preferred contact","WhatsApp \u00b7 18:00\u201321:00"],["Relationship manager","S. Al Balushi"]];

/* ── brokers ────────────────────────────────────────────────────── */
type Agency = { name:string; orn:string; alloc:string; deals:number; accrued:string; paid:string; rate:string; status:string; init:string };
const AGENCIES: Agency[] = [
  {name:"Betterhomes",orn:"ORN 1470",alloc:"30 units",deals:9,accrued:"AED 8.42M",paid:"AED 6.10M",rate:"2.0%",status:"Active",init:"Be"},
  {name:"Allsopp & Allsopp",orn:"ORN 2058",alloc:"24 units",deals:7,accrued:"AED 6.18M",paid:"AED 6.18M",rate:"2.0%",status:"Active",init:"Al"},
  {name:"Haus & Haus",orn:"ORN 11498",alloc:"18 units",deals:4,accrued:"AED 4.02M",paid:"AED 2.40M",rate:"2.5%",status:"Active",init:"Ha"},
  {name:"Driven Properties",orn:"ORN 11917",alloc:"14 units",deals:3,accrued:"AED 3.12M",paid:"AED 1.80M",rate:"2.0%",status:"Active",init:"Dr"},
  {name:"Metropolitan Premium",orn:"ORN 11899",alloc:"0 units",deals:0,accrued:"AED 0",paid:"AED 0",rate:"2.0%",status:"Onboarding",init:"Me"},
  {name:"Espace Real Estate",orn:"ORN 1170",alloc:"0 units",deals:0,accrued:"AED 0",paid:"AED 0",rate:"2.0%",status:"Suspended",init:"Es"},
];
type Agent = { name:string; agency:string; brn:string; deals:number; value:string; disc:string; days:string };
const AGENTS: Agent[] = [
  {name:"Layla Haddad",agency:"Betterhomes",brn:"BRN 48812",deals:4,value:"AED 9.8M",disc:"3.2%",days:"28 d"},
  {name:"James Cartwright",agency:"Allsopp & Allsopp",brn:"BRN 51204",deals:3,value:"AED 7.1M",disc:"2.8%",days:"34 d"},
  {name:"Zainab Qureshi",agency:"Haus & Haus",brn:"BRN 44117",deals:2,value:"AED 5.4M",disc:"4.1%",days:"41 d"},
  {name:"Dmitri Volkov",agency:"Driven Properties",brn:"BRN 60288",deals:2,value:"AED 4.9M",disc:"2.1%",days:"22 d"},
  {name:"Sara El Amrani",agency:"Betterhomes",brn:"BRN 48910",deals:3,value:"AED 6.6M",disc:"3.6%",days:"31 d"},
];
const ONBOARD_STEPS: [string,string][] = [["Agency identity","Trade name, ORN, jurisdiction"],["Licence & compliance","Trade licence, RERA, VAT TRN"],["Commission scheme","Rate, tiering, trigger, clawback"],["Inventory allocation","Units, release phase, embargo"],["Portal access","Users, PII scope, go live"]];
const ONBOARD_FIELDS: [string,string,string][] = [
  ["Legal trade name","Metropolitan Premium Properties LLC",""],["Trade licence no.","698421 \u00b7 exp 14 Mar 2027","valid"],["ORN","11899","verified"],["RERA registration","RERA-BRK-11899","verified"],["VAT TRN","100428816500003",""],["Jurisdiction","Dubai Economy & Tourism",""],["Commission rate","2.0% of net price",""],["Tiering","+0.5% above 10 units per quarter",""],["Payable trigger","On 20% collected",""],["Clawback on cancellation","Full, within 12 months","mandatory"],["Allocated inventory","18 units \u00b7 Phase 2",""],["Buyer PII scope","Own deals only","locked"],
];
const BROK_DOCS: [string,boolean][] = [["Trade licence",true],["RERA broker card",true],["ORN certificate",true],["VAT certificate",true],["Signed agency agreement",false],["Bank details / IBAN letter",false]];
type Act = { text:string; meta:string; when:string; color:string };
const BROK_ACT: Act[] = [
  {text:"Betterhomes reserved H21-T1-2801",meta:"L. Haddad \u00b7 24h hold placed",when:"2 h ago",color:AC},
  {text:"Allsopp & Allsopp submitted reservation",meta:"J. Cartwright \u00b7 H21-T1-1905 \u00b7 under review",when:"5 h ago",color:AC},
  {text:"Commission invoice uploaded",meta:"Haus & Haus \u00b7 AED 1.62M \u00b7 INV-BRK-0088",when:"1 d ago",color:"#34C08A"},
  {text:"Clawback raised",meta:"Driven Properties \u00b7 cancelled H21-T1-4102 \u00b7 AED 98,400",when:"2 d ago",color:"#E5484D"},
  {text:"Price list downloaded",meta:"Betterhomes \u00b7 watermarked \u00b7 logged",when:"2 d ago",color:"#8A94A6"},
  {text:"Espace Real Estate suspended",meta:"Trade licence expired 30 Jun 2026",when:"4 d ago",color:"#E5484D"},
  {text:"Phase 2 allocation published",meta:"82 units across 4 agencies",when:"6 d ago",color:"#8A94A6"},
];

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
const refOf = (_step?: number) => "ESC-2026-9021";

export default function Sales({ scope }: { scope: string }) {
  const router = useRouter();
  const s = (typeof router.query.s === "string" ? router.query.s : null) || "leads";
  const [step, setStep] = useState(1);
  const [lead, setLead] = useState<Card | null>(null);
  const [btab, setBtab] = useState<"units"|"ledger"|"sched">("units");
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

  if (s === "leads") return <Leads onNewBooking={blankBooking} onBookLead={goBooking} goRegister={go("bookings")} />;
  if (s === "booking") return <Booking step={step} setStep={setStep} onBack={go("leads")} lead={lead} blank={!lead} />;
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

  const cols = dbCols && dbCols.some((c) => c.cards.length > 0) ? dbCols : LEADS_COLS;

  const [dragId, setDragId] = useState<number | null>(null);

  const moveLead = (targetLabel: string) => {
    if (dragId == null || !dbCols) return;
    const stageMap: Record<string, string> = { New: "new", Contacted: "contacted", Qualified: "qualified", Viewing: "viewing", Negotiation: "negotiation", "EOI signed": "eoi", Booked: "booked", Lost: "lost" };
    const to = stageMap[targetLabel];
    if (!to) return;
    const fromCol = dbCols.find((c) => c.cards.some((k) => k.id === dragId));
    if (!fromCol) return;
    const card = fromCol.cards.find((k) => k.id === dragId);
    if (!card) return;
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
    if (!liveLeads || liveLeads.length === 0) return LB_FALLBACK;
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
          Live data unavailable ({apiError}) — showing sample columns
        </div>
      )}
      <div style={{display:"flex",alignItems:"flex-end",gap:16,marginBottom:18}}>
        <div style={{flex:1}}>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:"-.03em",lineHeight:1.15}}>Leads</div>
          <div style={{fontSize:13,color:"#6B7180",fontWeight:500,marginTop:5}}>34 open \u00b7 AED 62.4M potential value \u00b7 8 agents</div>
        </div>
        <button onClick={onNewBooking} style={{height:38,borderRadius:12,background:AC,color:"#fff",border:0,padding:"0 16px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>New booking</button>
        <button onClick={goRegister} style={{height:38,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",padding:"0 16px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Bookings register</button>
      </div>

      {/* funnel */}
      <div style={{background:"#fff",borderRadius:20,padding:"20px 24px",boxShadow:"0 1px 3px rgba(20,22,31,.04)",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:6}}>
          {FUNNEL.map(([label,val,days],i) => (
            <div key={label} style={{flex:1,display:"flex",alignItems:"flex-end",gap:6}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:".06em",color:"#9AA0AE",textTransform:"uppercase"}}>{label}</div>
                <div style={{fontSize:20,fontWeight:800,letterSpacing:"-.03em",marginTop:5}}>{val}</div>
                <div style={{height:6,borderRadius:4,marginTop:9,background:AC,opacity:1-i*0.15}} />
                <div style={{fontSize:10.5,color:"#9AA0AE",fontWeight:600,marginTop:7}}>avg {days}</div>
              </div>
              {CONV[i] ? <div style={{fontSize:11,fontWeight:800,color:AC,padding:"0 6px 30px",whiteSpace:"nowrap"}}>{CONV[i]}</div> : null}
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
                <div key={k.id ?? k.name} onClick={() => onBookLead(k)} draggable={k.id != null}
                     onDragStart={() => setDragId(k.id ?? null)}
                     onDragEnd={() => setDragId(null)}
                     title={k.id != null ? "Drag to move stage \u00b7 click for new booking" : "New booking for this lead"}
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
                    <span style={{fontSize:10.5,fontWeight:800,color:AC}}>New booking</span>
                    <span style={{fontSize:11,color:"#9AA0AE",fontWeight:600}}>\u2192</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BOOKING WIZARD
   ═══════════════════════════════════════════════════════════════════ */
function Booking({ step, setStep, onBack, lead, blank }: { step:number; setStep:(n:number)=>void; onBack:()=>void; lead: Card | null; blank: boolean }) {
  const leadName = blank ? "" : (lead?.name ?? "");
  const leadBudget = blank ? "" : (lead?.budget ?? "");
  const [buyer, setBuyer] = useState(leadName);
  const [mobile, setMobile] = useState(blank ? "" : "+971 50 000 0000");
  const [disc, setDisc] = useState("7.5");
  const [amount, setAmount] = useState("226688");
  const [stage, setStage] = useState(blank ? "New" : (leadChip(lead)));
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmErr, setConfirmErr] = useState("");
  const [savedRef, setSavedRef] = useState("");
  const [issuedReceipt, setIssuedReceipt] = useState("");

  const listPrice = 2450000;
  const discVal = parseFloat(disc || "0");
  const netVal = Math.round(listPrice * (1 - discVal / 100));
  const net = money(netVal);
  const bookingAmt = Math.round(netVal * 0.1);
  const psf = Math.round(netVal / 1180);
  const escrowRef = SFIELDS[5].find((f) => f[0] === "Escrow deposit reference")?.[1] || "";

  const doConfirm = async () => {
    setConfirming(true);
    setConfirmErr("");
    try {
      const created = await fetchJSON<{ id: number; ref: string; unit: string }>("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_no: "BLG-026",
          buyer_name: buyer || leadName || "Prospective buyer",
          buyer_mobile: mobile,
          discount_pct: discVal,
          list_price: listPrice,
          net_price: netVal,
          booking_amount: bookingAmt,
        }),
      });
      const res = await fetchJSON<any>("/api/bookings?id=" + created.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", escrow_ref: escrowRef, payment_method: "bank_transfer", buyer_email: null, buyer_mobile: mobile }),
      });
      setSavedRef(res.ref || created.ref);
      setIssuedReceipt(String(res.receiptId || ""));
      setConfirmed(true);
    } catch (e: any) {
      setConfirmErr(e?.message || "Booking failed to persist");
    } finally {
      setConfirming(false);
    }
  };

  const fields = SFIELDS[step] || [];
  const showApproval = step === 1;
  const nextLabel = step === 5 ? "Confirm booking" : "Continue";

  const deal = [
    ["Unit", "H21-T1-1204"],
    ["Typology", "2BR-B \u00b7 1,180 sq.ft"],
    ["List price", money(listPrice)],
    ["Discount", "\u2212" + discVal + "%"],
    ["Net price", net],
    ["Price/sq.ft", "AED " + psf.toLocaleString("en-US")],
    ["Plan", "20/40/40"],
    ["Buyer", buyer || "\u2014"],
    ["Broker", "Betterhomes \u00b7 2.0%"],
  ];

  return (
    <div>
      {confirmed && (
        <div style={{ background:"#E9F8F1", color:"#1F9D6B", borderRadius:14, padding:"14px 18px", marginBottom:16, fontSize:12.5, fontWeight:700 }}>
          Booking confirmed \u00b7 {buyer || leadName || "Prospective buyer"} \u00b7 {deal[4][1]} \u00b7 {savedRef || ("escrow ref " + escrowRef)} \u00b7 {issuedReceipt ? ("receipt RCP-00" + String(issuedReceipt).padStart(4, "0") + " issued") : "receipt issued"}
          <span style={{ display:"block", fontSize:11, fontWeight:600, marginTop:4, color:"#2EBD8B" }}>{blank ? "Blank booking created from lead pipeline." : "Created from lead \u2014 " + (lead?.name ?? "") + " (" + stage + " stage)."} Registered in the bookings register \u00b7 unit marked Reserved.</span>
        </div>
      )}
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
        <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #F1F2F7",display:"flex",alignItems:"center",gap:8}}>
          <span style={{width:7,height:7,borderRadius:5,background:"#E2A33C"}} />
          <span style={{fontSize:10.5,fontWeight:700,color:"#8A6410"}}>Unit locked \u00b7 43:12</span>
        </div>
      </div>

      {/* form */}
      <div style={{background:"#fff",borderRadius:20,padding:"24px 26px",boxShadow:"0 1px 3px rgba(20,22,31,.04)"}}>
        <div style={{fontSize:18,fontWeight:800,letterSpacing:"-.025em"}}>Step {step}: {STEP_LABELS[step-1][0]}</div>
        <div style={{fontSize:12.5,color:"#6B7180",fontWeight:500,marginTop:6}}>{STEP_LABELS[step-1][1]}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 20px",marginTop:24}}>
          {fields.map(([label,value,hintVal]) => {
            const isBuyer = label === "Full name (passport)";
            const isMobile = label === "Mobile";
            const isUnit = label === "Unit";
            const isDisc = label === "Discount requested";
            const isAmt = label === "Amount";
            if (isUnit) return (
              <div key={label}>
                <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>{label} <span style={{textTransform:"none",letterSpacing:0,color:AC,fontWeight:700}}>\u00b7 lead suggestion {leadChip(lead)}</span></div>
                <div style={box(false)}>
                  <span style={{flex:1}}>{value}</span>
                  <span style={hint("locked")}>locked</span>
                </div>
              </div>
            );
            if (isBuyer) return (
              <div key={label}>
                <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>{label}</div>
                <input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Enter buyer full name"
                  style={{width:"100%",height:42,borderRadius:12,border:"1px solid #E4E6EE",background:"#fff",padding:"0 14px",fontSize:13,fontWeight:600,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} />
              </div>
            );
            if (isMobile) return (
              <div key={label}>
                <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>{label}</div>
                <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+971 50 000 0000"
                  style={{width:"100%",height:42,borderRadius:12,border:"1px solid #E4E6EE",background:"#fff",padding:"0 14px",fontSize:13,fontWeight:600,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} />
              </div>
            );
            if (isDisc) return (
              <div key={label}>
                <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>{label}</div>
                <div style={box(true)}>
                  <input value={disc} onChange={(e) => setDisc(e.target.value.replace(/[^0-9.]/g,""))} step="0.5"
                    style={{flex:1,border:0,background:"transparent",fontSize:13,fontWeight:700,fontFamily:"inherit",outline:"none",width:60}} />
                  <span style={{fontSize:12,fontWeight:700,color:"#6B7180"}}>% \u00b7 AED {Math.round(listPrice * discVal / 100).toLocaleString("en-US")}</span>
                  <span style={hint("approval")}>approval</span>
                </div>
              </div>
            );
            if (isAmt) return (
              <div key={label}>
                <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>{label}</div>
                <div style={box(false)}>
                  <span style={{fontSize:13,fontWeight:700,color:"#9AA0AE",marginRight:6}}>AED</span>
                  <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g,""))}
                    style={{flex:1,border:0,background:"transparent",fontSize:13,fontWeight:700,fontFamily:"inherit",outline:"none"}} />
                  <span style={hint("within bounds")}>10% of net</span>
                </div>
              </div>
            );
            return (
              <div key={label}>
                <div style={{fontSize:10.5,fontWeight:700,letterSpacing:".05em",color:"#9AA0AE",textTransform:"uppercase",marginBottom:7}}>{label}</div>
                <div style={box(hintVal==="approval"||hintVal==="mandatory")}>
                  <span style={{flex:1}}>{value}</span>
                  {hintVal ? <span style={hint(hintVal)}>{hintVal}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
        {showApproval && (
          <div style={{marginTop:22,background:"#FDF4E5",borderRadius:16,padding:"16px 18px",display:"flex",gap:12}}>
            <span style={{width:8,height:8,borderRadius:5,background:"#E2A33C",marginTop:5,flex:"none"}} />
            <span>
              <span style={{display:"block",fontSize:12.5,fontWeight:700,color:"#8A6410"}}>Approval required \u00b7 routes to Sales Director</span>
              <span style={{display:"block",fontSize:11.5,color:"#A07C22",fontWeight:500,marginTop:4,lineHeight:1.55}}>7.5% exceeds the agent limit of 3%. Expected turnaround 4 working hours. The unit stays locked until a decision is recorded.</span>
            </span>
          </div>
        )}
        <div style={{display:"flex",gap:10,marginTop:26,paddingTop:20,borderTop:"1px solid #F1F2F7"}}>
          <button style={{height:40,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",padding:"0 16px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Save as draft</button>
          <div style={{flex:1}} />
          {step > 1 && <button onClick={() => setStep(step-1)} style={{height:40,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",padding:"0 16px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Back</button>}
          <button onClick={() => step === 5 ? doConfirm() : setStep(step+1)} disabled={confirming} style={{height:40,borderRadius:12,background:AC,color:"#fff",border:0,padding:"0 20px",fontFamily:"inherit",fontSize:12.5,fontWeight:700,cursor:confirming?"progress":"pointer",opacity:confirming?0.7:1}}>{confirming ? "Confirming\u2026" : nextLabel}</button>
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
const BOOKINGS_FALLBACK: BookingRow[] = [
  { id: 0, ref: "BKG-2026-00891", unit_no: "H21-T1-1204", project: "H21", buyer: "Rajesh Menon", status: "confirmed", discount_pct: 7.5, discount_amt: 183750, list_price: 2450000, net_price: 2266250, booking_amount: 226625, payment_method: "Bank transfer", escrow_ref: "ESC-2026-9001", created_at: "31 Aug 2026", expected_spa: "30 Nov 2026" },
  { id: 0, ref: "BKG-2026-00890", unit_no: "H21-T1-2801", project: "H21", buyer: "Aisha Al Marri", status: "confirmed", discount_pct: 3, discount_amt: 61402, list_price: 2046750, net_price: 1985348, booking_amount: 198535, payment_method: "Cheque", escrow_ref: "ESC-2026-8996", created_at: "29 Aug 2026", expected_spa: "30 Nov 2026" },
  { id: 0, ref: "BKG-2026-00889", unit_no: "H21-T1-4102", project: "H21", buyer: "Elena Petrova", status: "pending_approval", discount_pct: 9, discount_amt: 0, list_price: 6020000, net_price: 5478200, booking_amount: 547820, payment_method: "Bank transfer", escrow_ref: null, created_at: "28 Aug 2026", expected_spa: "30 Nov 2026" },
];
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
    if (r.id == null) { banner("Sample booking — switching to live register required"); return; }
    if (!window.confirm("Cancel booking " + r.ref + " for " + r.buyer + "?")) return;
    try {
      await fetchJSON<any>("/api/bookings?id=" + r.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
      setRows((rows || []).map((x) => x.id === r.id ? { ...x, status: "cancelled" } : x));
      banner("Booking " + r.ref + " cancelled · unit released back to available");
    } catch (e: any) { banner("Cancel failed: " + (e?.message || "request failed")); }
  };

  const show = rows || BOOKINGS_FALLBACK;
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
          Live data unavailable ({apiError}) — showing sample rows
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
      .catch(() => { if (active) { setLoaded(true); setError("Live data unavailable \u2014 showing sample rows"); } });
    return () => { active = false; };
  }, []);

  const show = rows || DIR_FALLBACK;
  const avail = !!rows;
  const contracted = show.reduce((a, b) => a + b.contracted, 0);
  const collected = show.reduce((a, b) => a + b.collected, 0);
  const outstanding = show.reduce((a, b) => a + b.outstanding, 0);

  const open = (r: BuyerRow) => () => {
    if (avail) onOpen(r.id);
    else setError("Directory is in read-only sample mode \u2014 reload to view live records");
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
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Buyers directory</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>
            {avail ? show.length + " buyers on record" : "Sample of on-record buyers"} \u00b7 click a row for the full 360 view
          </div>
        </div>
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

      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 56px 1fr 1fr 1fr 1fr 32px", gap: 10, padding: "14px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
          <span>Buyer</span><span>Contact</span><span>KYC</span><span style={{ textAlign: "right" }}>Units</span><span style={{ textAlign: "right" }}>Contracted</span><span style={{ textAlign: "right" }}>Collected</span><span style={{ textAlign: "right" }}>Overdue</span><span />
        </div>
        {show.map((r) => (
          <div key={r.id} onClick={open(r)} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 56px 1fr 1fr 1fr 1fr 32px", gap: 10, alignItems: "center", padding: "0 22px", height: 64, borderBottom: "1px solid #F6F7FA", cursor: avail ? "pointer" : "default", background: avail ? "transparent" : "#FAFBFC" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <span style={{ width: 36, height: 36, flex: "none", borderRadius: 12, background: "#EDECFE", display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 800, color: AC }}>{r.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                <span style={{ display: "block", fontSize: 10.5, color: "#9AA0AE", fontWeight: 500, marginTop: 2 }}>{r.next ? "Next due " + money(r.next.amount) + " \u00b7 " + fmtShort(r.next.date) : "No upcoming instalments"}</span>
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
            <span style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: r.overdue > 0 ? "#E5484D" : "#9AA0AE" }}>{r.overdue > 0 ? moneyM(r.overdue) : "\u2014"}</span>
            <span style={{ fontSize: 13, color: "#B9BDC9", fontWeight: 700 }}>{"\u203A"}</span>
          </div>
        ))}
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

  const tabs: [string,string][] = [["units","Units"],["ledger","Ledger"],["sched","Schedule"]];
  const buyerName = live ? live.name : "Rajesh Menon";
  const buyerId = live ? "B-00" + String(live.id).padStart(3,"0") : "H21-B-00147";
  const initials = buyerName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const kyc = live ? live.kyc : "cleared";

  const contracted = live ? live.units.reduce((a, u) => a + u.price, 0) : 4780000;
  const collected = live ? live.ledger.reduce((a, r) => a + r.credit, 0) : 2870000;
  const outstanding = Math.max(0, contracted - collected);
  const overdue = live ? live.overdue : 0;
  const nextDue = live && live.next ? live.next : { amount: 465500, date: "2026-09-14", unit: "H21-T1-1204", milestone: "Structure 40%" };

  const tiles = [
    { l: "Total contracted", v: moneyM(contracted), n: (live ? live.units.length : 2) + " units", ok: false },
    { l: "Collected", v: moneyM(collected), n: ((collected / Math.max(1, contracted)) * 100).toFixed(1) + "% of contracted", ok: true },
    { l: "Outstanding", v: moneyM(outstanding), n: "across " + (live ? live.ledger.length : 8) + " instalments", ok: false },
    { l: "Overdue", v: moneyM(overdue), n: overdue > 0 ? "needs follow-up" : "no arrears on record", ok: false },
  ];

  const units = live
    ? live.units.map((u) => ({ no: u.no, st: u.status === "sold" ? "Sold" : u.status.charAt(0).toUpperCase() + u.status.slice(1), meta: u.type + " \u00b7 " + u.area.toLocaleString("en-US") + " sq.ft" + (u.view ? " \u00b7 " + u.view : ""), price: money(u.price), pct: u.pct + "%", p: u.pct }))
    : [{no:"H21-T1-1204", st:"Sold", meta:"2BR-B \u00b7 1,180 sq.ft \u00b7 Level 12", price:"AED 2,327,500", pct:"62%", p:62},{no:"H21-T1-3302", st:"Booked", meta:"1BR-A \u00b7 748 sq.ft \u00b7 Level 33", price:"AED 2,452,500", pct:"58%", p:58}];

  const fmtLD = (d: string) => {
    const [y, mo, dd] = d.split("-");
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return dd + " " + MON[Number(mo) - 1] + " " + y.slice(2);
  };
  const ledger: [string,string,string,string,string,string][] = live
    ? live.ledger.map((r) => [fmtLD(r.date), r.unit, r.desc, "", r.credit.toLocaleString("en-US"), r.balance.toLocaleString("en-US")] as [string,string,string,string,string,string])
    : B_LEDGER;

  const numM = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? Math.round(v / 1e3) + "k" : String(Math.round(v)));
  const schedBars = (() => {
    if (!live) return B_SCHED.map((v, i) => ({ label: B_SCHED_LABELS[i], v: Math.round(v * 1000), pct: Math.max(3, v / 0.93 * 100), text: v ? (v * 1000).toFixed(0) + "k" : "\u2014" }));
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

  const score = live ? Math.max(1, Math.min(5, Math.round((live.miles.paid / Math.max(1, live.miles.total)) * 5))) : 4;
  const behaviorSub = live
    ? live.miles.paid + " of " + live.miles.total + " instalments paid in full."
    : "11 of 12 instalments paid on or before the due date. One payment 6 days late (Mar 2026).";
  const rel: [string,string][] = live
    ? [["First purchase", fmtShort(live.firstPaid || "")], ["Lifetime value", moneyM(contracted)], ["Units", String(live.units.length)], ["Instalments", live.miles.paid + "/" + live.miles.total + " paid"], ["KYC", kyc === "cleared" ? "Cleared" : "Pending"], ["Preferred contact", "Email"], ["Relationship manager", "\u2014"]]
    : B_REL;

  const sendStatement = () => {
    const totals = { contracted: moneyM(contracted), collected: moneyM(collected), outstanding: moneyM(outstanding) };
    const uRows = live ? units : B_UNITS;
    const lRows = live
      ? live.ledger.map((r) => ({ date: r.date, unit: r.unit, desc: r.desc, debit: "", credit: String(r.credit), balance: String(r.balance) }))
      : B_LEDGER.map((r) => ({ date: r[0], unit: r[1], desc: r[2], debit: r[3], credit: r[4], balance: r[5] }));
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
    : "+971 50 442 1187 \u00b7 r.menon@arvexcapital.ae \u00b7 Dubai Marina, Dubai \u00b7 Risk rating: Low";

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
          <div style={{fontSize:21,fontWeight:800,letterSpacing:"-.03em",marginTop:12}}>{money(nextDue.amount)}</div>
          <div style={{fontSize:11.5,color:"rgba(255,255,255,.7)",fontWeight:500,marginTop:4}}>{fmtShort(nextDue.date)} \u00b7 {nextDue.unit} \u00b7 {nextDue.milestone}</div>
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
              {B_UNITS.map(c => (
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
              {B_LEDGER.map(([date,unit,desc,debit,credit,bal],i) => (
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
  kpis: { agencies: AGENCIES.length, pending: AGENCIES.filter((a) => a.status === "Onboarding").length, alloc_units: AGENCIES.reduce((a, b) => a + (parseInt(b.alloc) || 0), 0), deals: AGENCIES.reduce((a, b) => a + b.deals, 0), accrued: 26100000, unpaid: 6700000 },
  agencies: AGENCIES.map((a, i) => ({ id: i + 1, name: a.name, orn: a.orn, alloc_units: parseInt(a.alloc) || 0, deals: a.deals, accrued: parseInt(a.accrued.replace(/[^0-9.]/g, "")) * (a.accrued.includes("M") ? 1000000 : 1), paid: parseInt(a.paid.replace(/[^0-9.]/g, "")) * (a.paid.includes("M") ? 1000000 : 1), rate: a.rate, status: a.status.toLowerCase() })),
  agents: AGENTS.map((g, i) => ({ id: i + 1, name: g.name, agency: g.agency, brn: g.brn, deals: g.deals, value: parseFloat(g.value.replace(/[^0-9.]/g, "")) * 1000000, discount_pct: parseFloat(g.disc.replace("%", "")), days_to_close: parseInt(g.days) })),
  activity: BROK_ACT.map((a, i) => ({ id: i + 1, text: a.text, meta: a.meta, kind: a.meta.includes("Clawback") || a.meta.includes("suspended") ? "suspend" : a.meta.includes("reservation") ? "reservation" : "note", created_at: new Date().toISOString() })),
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
          Live data unavailable ({apiError}) — showing sample rows
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
                  <button style={{height:28,borderRadius:9,border:"1px solid #EDEEF3",background:"#fff",padding:"0 10px",fontFamily:"inherit",fontSize:10.5,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Allocation</button>
                  <button onClick={() => toggleStatus(a)} disabled={busy} style={{height:28,borderRadius:9,border:0,background:"#F0EFFE",padding:"0 10px",fontFamily:"inherit",fontSize:10.5,fontWeight:700,color:AC,cursor:"pointer"}}>{a.status === "active" ? "Suspend" : a.status === "suspended" ? "Reinstate" : "Go live"}</button>
                </span>
              </div>
            );
          })}
        </div>
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
  const unitNos = ALL_UNITS.map((u) => u.no);
  const [unitNo, setUnitNo] = useState("H21-T1-1204");
  const [person, setPerson] = useState("Rajesh Menon");
  const [media, setMedia] = useState<Record<string, boolean>>({ "Floor plan": true, "Key plan": true, "Unit render": true, "View photograph": true, "Site plan": false, "Amenities page": false });
  const [sent, setSent] = useState(false);
  const [sentLabel, setSentLabel] = useState("");
  const [genLog, setGenLog] = useState<{ ref: string; type: string; when: string }[]>([]);
  const [version, setVersion] = useState("v3");
  const [notice, setNotice] = useState("");

  const unit = ALL_UNITS.find((u) => u.no === unitNo) || ALL_UNITS[0];
  const price = unit ? unit.price : 2327500;
  const area = unit ? unit.area : 1180;
  const psf = unit ? unit.psf : Math.round(price / area);
  const refBase = doc.split(" ").map((w) => w[0]).join("").toUpperCase() || "DOC";
  const ref = refBase + "-H21-" + String(4412 + (doc.length % 7)).padStart(6, "0");

  const download = (notify: boolean) => {
    exportDocument(doc, { no: unitNo, typ: unit?.typ || "2 Bedroom", beds: unit?.beds || 2, area, price, psf }, person, ref);
    if (notify) {
      const when = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short" });
      setGenLog((l) => [{ ref, type: doc, when }, ...l].slice(0, 5));
      setSentLabel(ref);
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    }
  };

  const setActive = () => {
    setVersion("v4");
    setNotice("v4 is now the active template for " + doc + " \u00b7 rolled out from today");
    setTimeout(() => setNotice(""), 4000);
  };
  const saveDraft = () => {
    setVersion("v4");
    setNotice("v4 draft saved for " + doc + " \u00b7 pending review");
    setTimeout(() => setNotice(""), 4000);
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
                    {BUYERS.map((b) => <option key={b} value={b}>{b}</option>)}
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
                      <span style={{color:"#9AA0AE",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.type} \u00b7 {person}</span>
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
                {DOC_BLOCKS.map((b,i) => (
                  <div key={b} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",borderRadius:12,border:i===8?"1px solid #E2A33C":"1px solid #EDEEF3",background:i===8?"#FDF4E5":"#fff"}}>
                    <span style={{color:"#C2C6D2",fontSize:13,fontWeight:700,cursor:"grab"}}>\u2807</span>
                    <span style={{flex:1,fontSize:12.5,fontWeight:600}}>{b}</span>
                    {i===8 && <span style={{fontSize:9.5,fontWeight:800,letterSpacing:".06em",color:"#B07B14"}}>Locked</span>}
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:10,marginTop:20,paddingTop:16,borderTop:"1px solid #F1F2F7"}}>
                <button onClick={saveDraft} style={{height:38,borderRadius:12,border:"1px solid #EDEEF3",background:"#fff",padding:"0 15px",fontFamily:"inherit",fontSize:12,fontWeight:700,color:"#4A5060",cursor:"pointer"}}>Save as {version} draft</button>
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
                  {[["v3 \u00b7 active","Live","#1F9D6B"],["v2 \u00b7 14 Mar 2026","Archived","#9AA0AE"],["v1 \u00b7 02 Jan 2026","Archived","#9AA0AE"]].map(([ver,status,color]) => (
                    <div key={ver} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:status==="Live"?undefined:"1px solid #F6F7FA"}}>
                      <span style={{fontSize:11.5,color:"#6B7180",fontWeight:600}}>{ver}</span>
                      <span style={{fontSize:11,fontWeight:status==="Live"?700:600,color}}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
