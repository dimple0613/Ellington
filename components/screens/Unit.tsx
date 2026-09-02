import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AC, money } from "../../lib/format";
import { ST, Unit, selectedUnit } from "../../lib/data";
import { exportUnitSoa, exportUnitEoi } from "../../lib/pdf";

const NET_DISCOUNT = 0.05;

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
  const su: Unit = selectedUnit(unitId || null);
  const [tab, setTab] = useState<"overview" | "pay" | "docs" | "act">("overview");

  const data = useMemo(() => {
    const net = Math.round(su.price * (1 - NET_DISCOUNT));
    const collected = Math.round(net * 0.62);
    const outstanding = net - collected;
    return { net, collected, outstanding };
  }, [su]);

  const { net, collected, outstanding } = data;
  const where = "Tower 1 \u00b7 L" + su.f + " \u00b7 " + su.view;

  const metrics = [
    { label: "List price", value: money(su.price), note: "AED " + su.psf.toLocaleString("en-US") + " /sq.ft", color: "#14161F" },
    { label: "Net price", value: money(net), note: "5.0% discount approved 14 Mar 2026", color: "#14161F" },
    { label: "Collected", value: money(collected), note: "62% of net price", color: AC },
    { label: "Outstanding", value: money(outstanding), note: "next due 14 Sep 2026", color: "#14161F" },
  ];

  const uBar = [
    { title: "Collected " + money(collected), w: (collected / net) * 100, c: AC },
    { title: "Outstanding " + money(outstanding), w: (outstanding / net) * 100, c: "#B9B4FA" },
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
    ["Approved discount", "A. Haddad \u00b7 14 Mar", "\u2212 " + money(su.price - net), false],
    ["Net price", "", money(net), true],
    ["DLD registration 4%", "payable by buyer", money(net * 0.04), false],
    ["Developer admin fee", "payable by buyer", "AED 4,200", false],
  ];

  const uFinish = [
    ["Flooring", "Porcelain \u00b7 Italian"], ["Kitchen", "Bosch \u00b7 handleless"], ["Appliances", "Siemens iQ500"],
    ["Sanitaryware", "Duravit / Grohe"], ["Joinery", "Oak veneer"], ["Smart home", "Loxone \u00b7 Tier 2"],
  ];

  const uMiles: [string, string, boolean][] = [
    ["Booking", "14 Mar 26", true], ["SPA", "02 Apr 26", true], ["20%", "14 Jun 26", true],
    ["30%", "14 Sep 26", false], ["50%", "14 Mar 27", false], ["Handover", "Q4 2027", false],
  ];

  const uInst = [
    ["01", "Booking deposit", "On booking", "14 Mar 2026", "10%", "Paid"],
    ["02", "SPA execution", "30 days from booking", "13 Apr 2026", "10%", "Paid"],
    ["03", "Excavation complete", "Construction 20%", "14 Jun 2026", "15%", "Paid"],
    ["04", "Structure 40%", "Construction 40%", "14 Sep 2026", "20%", "Due"],
    ["05", "Facade complete", "Construction 70%", "14 Mar 2027", "15%", "Scheduled"],
    ["06", "Fit-out complete", "Construction 90%", "12 Sep 2027", "10%", "Scheduled"],
    ["07", "On handover", "Handover", "Q4 2027", "20%", "Scheduled"],
  ].map((i) => ({
    seq: i[0], label: i[1], trigger: i[2], due: i[3], pct: i[4], status: i[5] as "Paid" | "Due" | "Scheduled",
    amount: money((net * parseInt(i[4])) / 100),
  }));

  const uDocs = [
    ["PDF", "Reservation form", "v1 \u00b7 214 KB \u00b7 A. Haddad \u00b7 14 Mar 2026", "Signed"],
    ["PDF", "Sale & purchase agreement", "v3 \u00b7 1.8 MB \u00b7 Legal \u00b7 02 Apr 2026", "Signed"],
    ["PDF", "Oqood certificate", "DLD \u00b7 11 Apr 2026", "Registered"],
    ["PDF", "Receipt RCP-H21-004521", "AED 465,500 \u00b7 14 Jun 2026", "Issued"],
    ["JPG", "Passport copy", "Expires 11 Oct 2026", "Expiring"],
    ["JPG", "Emirates ID", "Expires 04 Feb 2028", "Valid"],
    ["PDF", "Source of funds declaration", "AML \u00b7 reviewed by Compliance", "Cleared"],
  ] as [string, string, string, string][];

  const uActs = [
    ["Payment recorded \u00b7 AED 465,500", "F. Nasser \u00b7 Finance \u00b7 14 Jun 2026 11:04 \u00b7 escrow ref ESC-2026-8841"],
    ["Oqood registration completed", "L. Ferreira \u00b7 Legal \u00b7 11 Apr 2026 09:22 \u00b7 ref OQD-4417-2026"],
    ["SPA countersigned by developer", "System \u00b7 02 Apr 2026 16:40"],
    ["Status changed Reserved \u2192 Booked", "System \u00b7 02 Apr 2026 16:40"],
    ["Discount 5.0% approved", "A. Haddad \u00b7 Sales Director \u00b7 14 Mar 2026 12:18"],
    ["Booking created", "R. Kapoor \u00b7 Sales Agent \u00b7 14 Mar 2026 10:55"],
    ["48-hour hold placed", "R. Kapoor \u00b7 Sales Agent \u00b7 12 Mar 2026 15:31"],
  ] as [string, string][];

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
            <button onClick={() => exportUnitSoa({ id: su.id, typ: su.typ, beds: su.beds, area: su.area, view: su.view, f: su.f, psf: su.psf, price: su.price, status: su.status, buyer: su.buyer }, uInst.map((i) => ({ seq: i.seq, label: i.label, due: i.due, pct: i.pct, amount: i.amount, status: i.status })))} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Generate SOA</button>
            <button onClick={() => exportUnitEoi({ id: su.id, typ: su.typ, beds: su.beds, area: su.area, view: su.view, f: su.f, psf: su.psf, price: su.price, status: su.status, buyer: su.buyer })} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Generate EOI</button>
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
          <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 13, padding: 4, marginBottom: 14, width: "fit-content" }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "28px 1.4fr 96px 82px 92px 84px", gap: 8, padding: "10px 0", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3" }}>
                <span>#</span><span>Milestone</span><span>Due</span><span style={{ textAlign: "right" }}>%</span><span style={{ textAlign: "right" }}>Amount</span><span>Status</span>
              </div>
              {uInst.map((i) => {
                const p = pill(i.status);
                return (
                  <div key={i.seq} style={{ display: "grid", gridTemplateColumns: "28px 1.4fr 96px 82px 92px 84px", gap: 8, alignItems: "center", padding: "11px 0", borderBottom: "1px solid #F6F7FA" }}>
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