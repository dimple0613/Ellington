import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AC, money, fmtShortDate } from "../../lib/format";
import { ST, stKey, Unit } from "../../lib/unit";
import { fetchJSON } from "../../lib/api";
import { exportUnitSoa, exportUnitEoi } from "../../lib/pdf";

const NET_DISCOUNT = 0.05;

type LiveRow = {
  id?: string | number | null;
  no?: string | number | null;
  type?: string | null;
  beds?: string | number | null;
  area?: string | number | null;
  view?: string | null;
  status?: string | null;
  price?: string | number | null;
  buyer?: string | null;
};

type MileRow = {
  unit: string;
  project: string;
  milestone: string;
  due: string;
  percent: number;
  amount: number;
  status: string;
};

function floorFromNo(no: string): number {
  const m = no.match(/(\d+)\s*$/);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > 0 && n <= 45 ? n : 12;
}

function mileStatus(s: string): "Paid" | "Due" | "Scheduled" {
  if (s === "paid") return "Paid";
  if (s === "due" || s === "overdue" || s === "invoiced") return "Due";
  return "Scheduled";
}

function mapLiveUnit(row: LiveRow | null, unitId: string | undefined): Unit {
  if (!row) {
    return {
      f: floorFromNo(unitId || ""),
      pos: 1,
      no: unitId || "",
      id: unitId || "",
      typ: "2BR",
      beds: 2,
      area: 0,
      view: "\u2014",
      psf: 0,
      price: 0,
      status: "Available",
      base: 1450,
      buyer: "\u2014",
    };
  }
  const price = Number(row.price) || 0;
  const area = Number(row.area) || 0;
  const no = row.no != null ? String(row.no) : row.id != null ? String(row.id) : "";
  const st = (row.status || "available").toLowerCase();
  return {
    f: floorFromNo(no),
    pos: 1,
    no,
    id: no || String(row.id ?? ""),
    typ: row.type || "2BR",
    beds: Number(row.beds) || 2,
    area,
    view: row.view || "Park",
    psf: area > 0 ? Math.round(price / area) : 0,
    price,
    status: stKey(st),
    base: area > 0 ? Math.round(price / area) : 1450,
    buyer: row.buyer ? String(row.buyer) : "—",
  };
}

export default function UnitScreen({
  scope = "ALL",
  unitId,
  onSelectUnit,
}: {
  scope?: string;
  unitId?: string;
  onSelectUnit?: (id: string) => void;
}) {
  const router = useRouter();
  const [liveRow, setLiveRow] = useState<LiveRow | null>(null);
  const [liveMiles, setLiveMiles] = useState<MileRow[]>([]);
  const [liveDocs, setLiveDocs] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    setLiveRow(null);
    setLiveMiles([]);
    if (!unitId) return;
    fetchJSON<{ units: LiveRow[] }>("/api/inventory?unit=" + encodeURIComponent(unitId))
      .then((j) => {
        if (active && Array.isArray(j.units) && j.units.length) setLiveRow(j.units[0]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [unitId]);

  useEffect(() => {
    if (!liveRow || liveRow.no == null) return;
    let active = true;
    fetchJSON<{ milestones: MileRow[] }>("/api/milestones?unit=" + encodeURIComponent(String(liveRow.no)))
      .then((j) => {
        if (active && Array.isArray(j.milestones)) setLiveMiles(j.milestones);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [liveRow]);

  useEffect(() => {
    let active = true;
    fetchJSON<{ docs: any[] }>("/api/documents")
      .then((j) => {
        if (active && Array.isArray(j.docs)) setLiveDocs(j.docs);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const su: Unit = useMemo(() => mapLiveUnit(liveRow, unitId), [liveRow, unitId]);
  const [tab, setTab] = useState<"overview" | "pay" | "docs" | "act">("overview");

  const data = useMemo(() => {
    if (liveMiles.length) {
      const liveNet = liveMiles.reduce((a, m) => a + (Number(m.amount) || 0), 0);
      const liveCollected = liveMiles.reduce((a, m) => a + (mileStatus(m.status || "scheduled") === "Paid" ? (Number(m.amount) || 0) : 0), 0);
      const net = liveNet || Math.round(su.price * (1 - NET_DISCOUNT));
      const collected = liveCollected;
      const outstanding = Math.max(0, net - collected);
      return { net, collected, outstanding, live: true };
    }
    const net = Math.round(su.price * (1 - NET_DISCOUNT));
    const collected = 0;
    const outstanding = net;
    return { net, collected, outstanding, live: false };
  }, [su, liveMiles]);

  const { net, collected, outstanding, live: liveMetrics } = data;
  const discountPct = su.price > 0 ? Math.round((1 - net / su.price) * 1000) / 10 : 0;
  const where = "Tower 1 \u00b7 L" + su.f + " \u00b7 " + su.view;

  const unitDocs = liveDocs.filter(
    (d) => String(d.unit_no || "") === su.no || String(d.unit_no || "") === su.id
  );

  const metrics = [
    { label: "List price", value: money(su.price), note: "AED " + su.psf.toLocaleString("en-US") + " /sq.ft", color: "#14161F" },
    { label: "Net price", value: money(net), note: liveMetrics ? "from live payment schedule" : "discount applied to list price", color: "#14161F" },
    { label: "Collected", value: money(collected), note: liveMetrics ? "paid instalments to date" : "no payments recorded", color: AC },
    { label: "Outstanding", value: money(outstanding), note: liveMetrics ? "remaining instalments" : "balance per schedule", color: "#14161F" },
  ];

  const uBar = [
    { title: "Collected " + money(collected), w: net > 0 ? (collected / net) * 100 : 0, c: AC },
    { title: "Outstanding " + money(outstanding), w: net > 0 ? (outstanding / net) * 100 : 0, c: "#B9B4FA" },
  ];

  const uSpec = [
    ["Typology", su.typ], ["Bedrooms", String(su.beds)], ["Bathrooms", String(su.beds + 1)], ["Powder room", "Yes"],
    ["Maid\u2019s room", su.beds >= 3 ? "Yes" : "No"], ["Store", "Yes"], ["Suite area", (su.area - 148).toLocaleString("en-US") + " sq.ft"],
    ["Balcony area", "148 sq.ft"], ["Total area", su.area.toLocaleString("en-US") + " sq.ft"], ["Ceiling height", "3.05 m"],
    ["Parking", su.beds >= 2 ? "2 bays \u00b7 P2-114, P2-115" : "1 bay \u00b7 P1-088"], ["Orientation", "North-west"],
  ];

  const uLadder: [string, string, string, boolean][] = [
    ["Base price", "typology rate", "AED " + su.base, false],
    ["Floor rise", "L" + su.f + " \u00d7 AED 13", "+ AED " + (su.f * 13), false],
    ["View premium", su.view, "+ 0.0%", false],
    ["List price/sq.ft", "", "AED " + su.psf.toLocaleString("en-US"), true],
    ["List price", su.area.toLocaleString("en-US") + " sq.ft", money(su.price), false],
    ["Approved discount", "applied to unit", "\u2212 " + money(su.price - net), false],
    ["Net price", "", money(net), true],
    ["DLD registration 4%", "payable by buyer", money(net * 0.04), false],
    ["Developer admin fee", "payable by buyer", "AED 4,200", false],
  ];

  const uFinish = [
    ["Flooring", "Porcelain \u00b7 Italian"], ["Kitchen", "Bosch \u00b7 handleless"], ["Appliances", "Siemens iQ500"],
    ["Sanitaryware", "Duravit / Grohe"], ["Joinery", "Oak veneer"], ["Smart home", "Loxone \u00b7 Tier 2"],
  ];

  const uMiles: [string, string, boolean][] = liveMiles
    .slice(0, 6)
    .map((m) => [m.milestone, m.due || "\u2014", mileStatus(m.status || "scheduled") === "Paid"]);

  const uInst = liveMiles.map((m, i) => ({
    seq: String(i + 1).padStart(2, "0"),
    label: m.milestone,
    trigger: "Milestone payment",
    due: m.due || "\u2014",
    pct: m.percent + "%",
    status: mileStatus(m.status || "scheduled"),
    amount: money(m.amount),
  }));

  const uDocs: [string, string, string, string][] = unitDocs.slice(0, 10).map((d) => [
    String(d.type || "PDF").toUpperCase().includes("PDF") ? "PDF" : String(d.type || "DOC"),
    d.ref || "Document",
    (d.buyer || "\u2014") + " \u00b7 " + fmtShortDate(d.generated_at || d.created_at),
    String(d.status || "Issued"),
  ]);

  const uActs = [
    ...liveMiles
      .filter((m) => mileStatus(m.status || "scheduled") === "Paid")
      .map((m) => ["Payment recorded \u00b7 " + money(Number(m.amount) || 0), "Milestone \u00b7 " + m.milestone + " \u00b7 " + (m.due || "\u2014")] as [string, string]),
    ...unitDocs.map((d) => ["Document generated \u00b7 " + (d.ref || ""), String(d.type || "Document") + " \u00b7 " + (d.buyer || "\u2014") + " \u00b7 " + fmtShortDate(d.generated_at || d.created_at)] as [string, string]),
  ];

  const pill = (s: string) =>
    s === "Paid"
      ? { background: "#E9F8F1", color: "#1F9D6B" }
      : s === "Due"
      ? { background: "#FDF4E5", color: "#B07B14" }
      : s === "Scheduled"
      ? { background: "#F1F2F6", color: "#6B7180" }
      : s === "Expiring"
      ? { background: "#FDECEC", color: "#E5484D" }
      : { background: "#E9F8F1", color: "#1F9D6B" };

  const tabBtn = (t: string, label: string) => (
    <button
      onClick={() => setTab(t as typeof tab)}
      style={{
        height: 32,
        border: 0,
        borderRadius: 10,
        padding: "0 15px",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 700,
        background: tab === t ? "#F0EFFE" : "transparent",
        color: tab === t ? AC : "#9AA0AE",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600, letterSpacing: "-.03em" }}>{su.id}</span>
              <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "4px 9px", background: ST[su.status][1], color: ST[su.status][0] }}>{su.status}</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: "#F1F2F7", color: "#4A5060", borderRadius: 8, padding: "4px 9px" }}>{su.typ}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#9AA0AE" }}>{where}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 7 }}>
              {su.area.toLocaleString("en-US")} sq.ft {su.beds}-bed {su.view.toLowerCase()} {su.f}-storey
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => exportUnitSoa({ id: su.id, typ: su.typ, beds: su.beds, area: su.area, view: su.view, f: su.f, psf: su.psf, price: su.price, status: su.status, buyer: su.buyer }, uInst.map((i) => ({ seq: i.seq, label: i.label, due: i.due, pct: i.pct, amount: i.amount, status: i.status })), { discountPct, collected: liveMetrics ? collected : undefined })} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Generate SOA</button>
            <button onClick={() => exportUnitEoi({ id: su.id, typ: su.typ, beds: su.beds, area: su.area, view: su.view, f: su.f, psf: su.psf, price: su.price, status: su.status, buyer: su.buyer }, { discountPct })} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Generate EOI</button>
            <button onClick={() => router.push("/finance?s=payments")} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Record payment</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 26, marginTop: 22, paddingTop: 20, borderTop: "1px solid #F1F2F7" }}>
          {metrics.map((m) => (
            <div key={m.label}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 9, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 3 }}>{m.note}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", height: 12, borderRadius: 7, overflow: "hidden", background: "#F1F2F7", marginTop: 18 }}>
          {uBar.map((b) => (
            <span key={b.title} title={b.title} style={{ display: "block", height: "100%", width: b.w.toFixed(1) + "%", background: b.c }}></span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 13, padding: 4, marginBottom: 14, width: "fit-content" }}>
            {tabBtn("overview", "Overview")}
            {tabBtn("pay", "Payments")}
            {tabBtn("docs", "Documents")}
            {tabBtn("act", "Activity")}
          </div>

          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 20, padding: "20px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 14 }}>Specification</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                  {uSpec.map((r) => (
                    <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #F6F7FA" }}>
                      <span style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 500 }}>{r[0]}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>{r[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 20, padding: "20px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 4 }}>Price derivation</div>
                <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginBottom: 12 }}>Developers audit these numbers \u2014 the full ladder, not just the total</div>
                {uLadder.map((l, i) => (
                  <div key={l[0]} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid #F6F7FA", background: i === 3 || i === 6 ? "#FAFBFD" : "transparent" }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#4A5060" }}>{l[0]}</span>
                    <span style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 500, width: 110, textAlign: "right" }}>{l[1]}</span>
                    <span style={{ width: 120, textAlign: "right", fontSize: 12, fontWeight: i === 3 || i === 6 ? 800 : 600, color: i === 5 ? "#E5484D" : "#14161F" }}>{l[2]}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", borderRadius: 20, padding: "20px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>Finishes</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px" }}>
                  {uFinish.map((r) => (
                    <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 500 }}>{r[0]}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{r[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "pay" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "20px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em" }}>Payment schedule</div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 0, margin: "22px 0 26px" }}>
                {uMiles.map((m, i, a) => (
                  <div key={m[0]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative" }}>
                    <span style={{ position: "absolute", top: 5, left: 0, right: 0, height: 3, background: i < 3 ? AC : "#EDEEF3" }}></span>
                    <span style={{ width: 14, height: 14, borderRadius: 9, zIndex: 2, background: m[2] ? AC : "#fff", border: "2.5px solid " + (m[2] ? AC : "#DDE0E8") }}></span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: "center" }}>{m[0]}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: "#9AA0AE" }}>{m[1]}</span>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "28px 1.4fr 96px 82px 92px 84px", minWidth: 580, gap: 8, padding: "10px 0", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3" }}>
                <span>#</span><span>Milestone</span><span>Due</span><span style={{ textAlign: "right" }}>%</span><span style={{ textAlign: "right" }}>Amount</span><span>Status</span>
              </div>
              {uInst.length === 0 && (
                <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 500, padding: "14px 0" }}>No payment schedule on file yet.</div>
              )}
              {uInst.map((i) => {
                const p = pill(i.status);
                return (
                  <div key={i.seq} style={{ display: "grid", gridTemplateColumns: "28px 1.4fr 96px 82px 92px 84px", minWidth: 580, gap: 8, alignItems: "center", padding: "11px 0", borderBottom: "1px solid #F6F7FA" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#9AA0AE" }}>{i.seq}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 600 }}>{i.label}</span>
                      <span style={{ display: "block", fontSize: 10.5, color: "#9AA0AE", fontWeight: 500 }}>{i.trigger}</span>
                    </span>
                    <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{i.due}</span>
                    <span style={{ textAlign: "right", fontSize: 11.5, color: "#6B7180" }}>{i.pct}</span>
                    <span style={{ textAlign: "right", fontSize: 12, fontWeight: 700 }}>{i.amount}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", textAlign: "center", background: p.background, color: p.color }}>{i.status}</span>
                  </div>
                );
              })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "28px 1.4fr 96px 82px 92px 84px", gap: 8, alignItems: "center", padding: "14px 0 2px" }}>
                <span></span><span style={{ fontSize: 12, fontWeight: 800 }}>Total</span><span></span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>100%</span>
                <span style={{ textAlign: "right", fontSize: 12.5, fontWeight: 800 }}>{money(net)}</span><span></span>
              </div>
            </div>
          )}

          {tab === "docs" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "20px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 14 }}>Document vault</div>
              {uDocs.length === 0 && (
                <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 500, padding: "10px 0" }}>No documents generated for this unit yet.</div>
              )}
              {uDocs.map((d) => {
                const p = pill(d[3]);
                return (
                  <div key={d[1]} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 0", borderBottom: "1px solid #F6F7FA" }}>
                    <span style={{ width: 34, height: 34, flex: "none", borderRadius: 11, background: "#F3F4F8", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 800, color: "#6B7180" }}>{d[0]}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{d[1]}</span>
                      <span style={{ display: "block", fontSize: 10.5, color: "#9AA0AE", fontWeight: 500, marginTop: 2 }}>{d[2]}</span>
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", whiteSpace: "nowrap", background: p.background, color: p.color }}>{d[3]}</span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "act" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "20px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 14 }}>Activity</div>
              {uActs.length === 0 && (
                <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 500, padding: "10px 0" }}>No activity recorded for this unit yet.</div>
              )}
              {uActs.map((a, i) => (
                <div key={a[0]} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i === uActs.length - 1 ? "0" : "1px solid #F6F7FA" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 5, flex: "none", marginTop: 4, background: i < 3 ? AC : "#DDE0E8" }}></span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{a[0]}</div>
                    <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 500, marginTop: 2 }}>{a[1]}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "20px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>Compliance</div>
            {([
              ["Oqood registered", "OQD-4417", true],
              ["SPA executed", "02 Apr 26", true],
              ["DLD 4% remitted", money(net * 0.04), true],
              ["KYC approved", "14 Mar 26", true],
            ] as [string, string, boolean][]).map((c) => (
              <div key={c[0]} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0" }}>
                <span style={{ width: 7, height: 7, borderRadius: 5, flex: "none", background: c[2] ? "#34C08A" : "#E5484D" }}></span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{c[0]}</span>
                <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 600 }}>{c[1]}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: "20px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 10 }}>Similar units</div>
            {onSelectUnit && (
              <div style={{ color: "#9AA0AE", fontSize: 12 }}>Select related {su.typ} units from the inventory to compare.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}