import { useEffect, useState } from "react";
import { fetchJSON } from "../../lib/api";

const TABS = [
  { key: "home", label: "Home", icon: "\u2302" },
  { key: "snap", label: "Projects", icon: "\u25A6" },
  { key: "money", label: "Money", icon: "\u00A3" },
  { key: "appr", label: "Approvals", icon: "\u2713", badge: 2 },
  { key: "more", label: "More", icon: "\u2261" },
];

type Tab = typeof TABS[number]["key"];

type MoneySub = "Collections" | "Forecast" | "Ageing";

type MobileAgg = {
  me: { name: string; role: string };
  portfolio: {
    value: number;
    collected: number;
    target: number;
    overdue: number;
    cheques: number;
    max_due: number;
    confidence: { amount: number; pct: number };
  };
  projects: {
    code: string;
    name: string;
    total: number;
    gdv: number;
    sold: number;
    collected: number;
    counts: { available: number; booked: number; reserved: number; held: number; blocked: number; sold: number };
    mix: { type: string; count: number; sold: number }[];
  }[];
  money: {
    ytd: number;
    target: number;
    instalments: number;
    forecast30: number;
    milestones: { project: string; milestone: string; amount: number; due: string }[];
    ageing: { bucket: string; amount: number; pct: number }[];
    buyer: { name: string; unit: string; amount: number; days: number } | null;
  };
  approvals: { count: number; valueM: string };
};

const aedM = (v: number) =>
  v >= 1e6 ? "AED " + (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? "AED " + (v / 1e3).toFixed(1) + "K" : "AED " + Math.round(v).toLocaleString("en-US");

const shortDate = (d: string) => {
  if (!d) return "";
  const [y, mo, dd] = d.split("-");
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return dd + " " + MON[Number(mo) - 1];
};

export default function MobileScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [notice, setNotice] = useState("");
  const [moneyTab, setMoneyTab] = useState<MoneySub>("Ageing");
  const [resolved, setResolved] = useState<Record<string, string>>({ discount: "", drawdown: "" });
  const [agg, setAgg] = useState<MobileAgg | null>(null);

  useEffect(() => {
    let active = true;
    fetchJSON<MobileAgg>("/api/mobile")
      .then((j) => {
        if (active && j) setAgg(j);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const ao = agg?.portfolio;
  const aM = agg?.money;
  const proj0 = agg?.projects?.[0];

  const projName = proj0 ? proj0.code + " " + proj0.name : "BLG Belgravia Heights III";
  const ringPct = proj0
    ? Math.round(((proj0.counts.sold + proj0.counts.booked + proj0.counts.reserved) / Math.max(1, proj0.total)) * 100)
    : 71;
  const legend = proj0
    ? [
        ["Sold", "#4F46E5", String(proj0.counts.sold + proj0.counts.booked)],
        ["Available", "#34C08A", String(proj0.counts.available)],
        ["Reserved", "#F5A623", String(proj0.counts.reserved)],
        ["Blocked", "#E5484D", String(proj0.counts.held + proj0.counts.blocked)],
      ]
    : [["Sold", "#4F46E5", "62"], ["Available", "#34C08A", "24"], ["Reserved", "#F5A623", "6"], ["Blocked", "#E5484D", "4"]];
  const TYP_LABEL: Record<string, string> = { "1BR": "1 Bed", "2BR": "2 Bed", "3BR": "3 Bed" };
  const mix = proj0
    ? proj0.mix.map((m) => [TYP_LABEL[m.type] || m.type, m.sold, Math.round((m.count ? m.sold / m.count : 0) * 100) + "%"] as [string, number, string])
    : [["Studio", 18, "42%"], ["1 Bed", 24, "58%"], ["2 Bed", 14, "35%"], ["3 Bed", 6, "43%"]];

  const mileRows = aM && aM.milestones.length
    ? aM.milestones.map((m) => [m.project + " \u00b7 " + m.milestone, aedM(m.amount), shortDate(m.due)] as [string, string, string])
    : [["Structure 40% \u00b7 WPK", "AED 2.4M", "12 Sep"], ["Structure 60% \u00b7 BLG III", "AED 5.1M", "28 Sep"], ["Handover \u00b7 WPK", "AED 4.9M", "30 Sep"]];
  const AG_COLORS = ["#34C08A", "#F5A623", "#F5A623", "#E5484D", "#E5484D"];
  const ageingLive = aM
    ? aM.ageing.map((b, i) => [b.bucket, AG_COLORS[i] || "#9AA0AE", aedM(b.amount), b.pct + "%"] as [string, string, string, string])
    : [["Current", "#34C08A", "AED 8.2M", "64%"], ["1\u201330 days", "#F5A623", "AED 1.4M", "11%"], ["31\u201360 days", "#F5A623", "AED 0.8M", "6%"], ["61\u201390 days", "#E5484D", "AED 0.4M", "3%"], ["90+ days", "#E5484D", "AED 0.3M", "2%"]];
  const buyerInfo = aM && aM.buyer
    ? { name: aM.buyer.name, sub: "Unit " + aM.buyer.unit + " \u00b7 " + aedM(aM.buyer.amount) + " \u00b7 " + aM.buyer.days + " days overdue", days: aM.buyer.days }
    : { name: "Rajesh Menon", sub: "Unit BLG-0402 \u00b7 AED 2.1M \u00b7 1 overdue cheque", days: 62 };

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

  const resolveApproval = (key: string, outcome: string) => {
    setResolved((p) => ({ ...p, [key]: outcome }));
    showNotice((key === "discount" ? "Discount request " : "Drawdown request ") + outcome + (outcome === "approved" ? " \u00b7 requester notified" : " \u00b7 requester notified"));
  };

  const getPendingCount = () => [resolved.discount, resolved.drawdown].filter((v) => v === "").length;
  const pendingValueM = () => {
    let v = 0;
    if (resolved.discount === "") v += 0.085;
    if (resolved.drawdown === "") v += 1.2;
    return v.toFixed(1);
  };

  const PhoneShell = ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: 300, background: "#000", borderRadius: 36, padding: 8, boxShadow: "0 8px 30px rgba(0,0,0,.18)" }}>
      <div style={{ background: "#FAFBFD", borderRadius: 28, overflow: "hidden", height: 620, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 44, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ width: 90, height: 22, background: "#000", borderRadius: 12, position: "absolute" }} />
          <span style={{ position: "absolute", left: 20, fontSize: 10, fontWeight: 700, color: "#fff" }}>9:41</span>
          <span style={{ position: "absolute", right: 20, fontSize: 10, fontWeight: 600, color: "#fff" }}>{"\u25C8"} {"\u25B6"} 100%</span>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>{children}</div>
        <div style={{ borderTop: "1px solid #EDEEF3", display: "flex" }}>
          {TABS.map((t) => (
            <div key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: 1, textAlign: "center", padding: "6px 0", cursor: "pointer", position: "relative" }}>
              <span style={{ fontSize: 15, display: "block", color: activeTab === t.key ? "#4F46E5" : "#9AA0AE" }}>{t.icon}</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: activeTab === t.key ? "#4F46E5" : "#9AA0AE", letterSpacing: ".03em" }}>{t.label}</span>
              {t.badge && <span style={{ position: "absolute", top: 1, right: "50%", transform: "translateX(14px)", width: 14, height: 14, borderRadius: 7, background: "#E5484D", color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.badge}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9AA0AE", letterSpacing: ".07em", textTransform: "uppercase" as const, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );

  const Card = ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...rest} style={{ background: "#fff", borderRadius: 12, padding: "10px 12px", border: "1px solid #F1F2F7", marginBottom: 6, ...rest.style }}>{children}</div>
  );

  return (
    <div>
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Executive app</div>
        <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>iPhone 15 Pro \u00b7 393\u00d7852 \u00b7 read + approve only \u00b7 select a tab to preview each screen</div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <PhoneShell>
          {activeTab === "home" && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>Good morning, Khalid</div>
              <div style={{ fontSize: 10, color: "#9AA0AE", fontWeight: 600, marginBottom: 12 }}>Thursday, 3 September</div>
              <Card>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#9AA0AE", letterSpacing: ".05em", textTransform: "uppercase" as const }}>Portfolio value</div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginTop: 4 }}>{aedM(ao ? ao.value : 1320000000)}</div>
                <div style={{ fontSize: 9.5, color: "#1F9D6B", fontWeight: 700, marginTop: 2 }}>{"\u25B2"} 2.4% vs last month</div>
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <Card>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#9AA0AE", letterSpacing: ".05em", textTransform: "uppercase" as const }}>Collected</div>
                  <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>{aedM(ao ? ao.collected : 84200000)}</div>
                  <div style={{ fontSize: 9, color: "#1F9D6B", fontWeight: 700 }}>{Math.round(((ao ? ao.collected : 0) / (ao ? ao.target : 1)) * 100)}% of target</div>
                </Card>
                <Card>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#9AA0AE", letterSpacing: ".05em", textTransform: "uppercase" as const }}>Overdue</div>
                  <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3, color: "#E5484D" }}>{aedM(ao ? ao.overdue : 3100000)}</div>
                  <div style={{ fontSize: 9, color: "#E5484D", fontWeight: 700 }}>{agg ? agg.portfolio.cheques : 7} cheques</div>
                </Card>
              </div>
              <Section title="30-day confidence">
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>Expected {aedM(ao ? ao.confidence.amount : 12400000)}</span>
                    <span style={{ fontSize: 9, color: "#1F9D6B", fontWeight: 700 }}>{agg ? agg.portfolio.confidence.pct : 87}% likely</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "#F1F2F7", overflow: "hidden" }}>
                    <div style={{ width: (agg ? agg.portfolio.confidence.pct : 87) + "%", height: "100%", borderRadius: 3, background: "#4F46E5" }} />
                  </div>
                </Card>
              </Section>
            </div>
          )}

          {activeTab === "snap" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{projName}</div>
              <Card>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 32, border: "5px solid #4F46E5", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{ringPct}%</span>
                    <span style={{ fontSize: 7, color: "#9AA0AE", fontWeight: 600 }}>sold</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    {legend.map(([label, color, count]) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 3, background: color }} />
                        <span style={{ fontSize: 9, fontWeight: 600, flex: 1 }}>{label}</span>
                        <span style={{ fontSize: 9, fontWeight: 700 }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <Card><div style={{ fontSize: 8, color: "#9AA0AE", fontWeight: 700, textTransform: "uppercase" as const }}>Collected</div><div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>{aedM(proj0 ? proj0.collected : 52100000)}</div></Card>
                <Card><div style={{ fontSize: 8, color: "#9AA0AE", fontWeight: 700, textTransform: "uppercase" as const }}>Outstanding</div><div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>{aedM(proj0 ? Math.max(0, proj0.gdv - proj0.collected) : 31800000)}</div></Card>
                <Card><div style={{ fontSize: 8, color: "#9AA0AE", fontWeight: 700, textTransform: "uppercase" as const }}>Overdue</div><div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, color: "#E5484D" }}>{proj0 ? "AED 0" : "AED 1.2M"}</div></Card>
                <Card><div style={{ fontSize: 8, color: "#9AA0AE", fontWeight: 700, textTransform: "uppercase" as const }}>Net margin</div><div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>28.4%</div></Card>
              </div>
              <Section title="Typology mix">
                {mix.map(([t, sold, pct]) => (
                  <div key={t as string} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, width: 42 }}>{t as string}</span>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#F1F2F7", overflow: "hidden" }}>
                      <div style={{ width: pct as string, height: "100%", borderRadius: 3, background: "#4F46E5" }} />
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "#6B7180" }}>{sold as number} sold</span>
                  </div>
                ))}
              </Section>
            </div>
          )}

          {activeTab === "money" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Money {"\u00b7"} {moneyTab}</div>
              <div style={{ display: "flex", gap: 4, background: "#E9EAF0", borderRadius: 13, padding: 4, marginBottom: 12 }}>
                {(["Collections", "Forecast", "Ageing"] as MoneySub[]).map((tab) => (
                  <span key={tab} onClick={() => setMoneyTab(tab)} style={{ flex: 1, textAlign: "center", fontSize: 9.5, fontWeight: 700, padding: "6px 0", borderRadius: 10, background: moneyTab === tab ? "#fff" : "transparent", color: moneyTab === tab ? "#4F46E5" : "#8A90A0", cursor: "pointer" }}>{tab}</span>
                ))}
              </div>

              {moneyTab === "Collections" && (
                <div>
                  <Section title="This month">
                    <Card>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#9AA0AE", textTransform: "uppercase" as const }}>Collected YTD</div>
                      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 3 }}>{aedM(aM ? aM.ytd : 84200000)}</div>
                      <div style={{ fontSize: 9.5, color: "#1F9D6B", fontWeight: 700, marginTop: 2 }}>{"\u25B2"} {Math.round(((aM ? aM.ytd : 0) / (aM ? aM.target : 1)) * 100)}% of target</div>
                    </Card>
                  </Section>
                  <Section title="Source mix">
                    {[["Instalments", "#4F46E5", aM ? aM.instalments + "%" : "62%"], ["Final / handover", "#34C08A", "21%"], ["Reservation", "#F5A623", "9%"], ["Other", "#9AA0AE", "8%"]].map(([label, color, pct]) => (
                      <Card key={label as string}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 3, background: color as string }} />
                            <span style={{ fontSize: 10, fontWeight: 700 }}>{label as string}</span>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 800 }}>{pct as string}</span>
                        </div>
                      </Card>
                    ))}
                  </Section>
                </div>
              )}

              {moneyTab === "Forecast" && (
                <div>
                  <Section title="Cashflow forecast">
                    <Card>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#9AA0AE", textTransform: "uppercase" as const }}>Expected next 30 days</div>
                      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", marginTop: 3 }}>{aedM(aM ? aM.forecast30 : 12400000)}</div>
                      <div style={{ fontSize: 9.5, color: "#1F9D6B", fontWeight: 700, marginTop: 2 }}>{agg ? agg.portfolio.confidence.pct : 87}% confidence</div>
                    </Card>
                  </Section>
                  <Section title="Milestone-driven">
                    {mileRows.map(([label, amt, due]) => (
                      <Card key={label as string}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700 }}>{label as string}</span>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, fontWeight: 800 }}>{amt as string}</div>
                            <div style={{ fontSize: 8, color: "#9AA0AE", fontWeight: 600 }}>{due as string}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </Section>
                </div>
              )}

              {moneyTab === "Ageing" && (
                <div>
                  <Section title="Ageing buckets">
                    { ageingLive.map(([bucket, color, amt, pct]) => (
                      <Card key={bucket as string}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 3, background: color as string }} />
                            <span style={{ fontSize: 10, fontWeight: 700 }}>{bucket as string}</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, fontWeight: 800 }}>{amt as string}</div>
                            <div style={{ fontSize: 8, color: "#9AA0AE", fontWeight: 600 }}>{pct as string}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </Section>
                  <Section title="Buyer">
                    <Card>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700 }}>{buyerInfo.name}</span>
                        <span style={{ fontSize: 9, color: "#E5484D", fontWeight: 700 }}>{"\u25CF"} {buyerInfo.days} days</span>
                      </div>
                      <div style={{ fontSize: 9, color: "#9AA0AE", fontWeight: 600, marginTop: 2 }}>{buyerInfo.sub}</div>
                    </Card>
                  </Section>
                </div>
              )}
            </div>
          )}

          {activeTab === "appr" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Approvals inbox</div>
              {getPendingCount() > 0 ? (
                <div style={{ background: "#FDECEC", borderRadius: 10, padding: "8px 10px", marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#E5484D" }}>{"\u26A0"} {getPendingCount()} pending approvals {"\u00b7"} AED {(agg ? Number(agg.approvals.valueM) + (resolved.discount === "" && resolved.drawdown === "" ? 0.085 : resolved.discount === "" ? 0.085 : 0) : Number(pendingValueM())).toFixed(1)}M</span>
                </div>
              ) : (
                <div style={{ background: "#E9F8F1", borderRadius: 10, padding: "8px 10px", marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#1F9D6B" }}>{"\u2713"} No pending approvals {"\u00b7"} inbox clear</span>
                </div>
              )}

              {!resolved.discount ? (
                <Section title="Discount request">
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>BLG-0304</div>
                        <div style={{ fontSize: 9, color: "#6B7180", fontWeight: 600, marginTop: 2 }}>Buyer: Priya Sharma {"\u00b7"} Agent: Sarah M.</div>
                        <div style={{ fontSize: 9, color: "#6B7180", fontWeight: 600, marginTop: 1 }}>Discount: 5% {"\u00b7"} AED 85,000</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, background: "#FFF3E0", color: "#F5A623", borderRadius: 6, padding: "3px 8px" }}>Pending</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => resolveApproval("discount", "approved")} style={{ flex: 1, height: 28, borderRadius: 8, background: "#34C08A", color: "#fff", border: 0, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                      <button onClick={() => resolveApproval("discount", "rejected")} style={{ flex: 1, height: 28, borderRadius: 8, background: "#fff", color: "#E5484D", border: "1px solid #E5484D", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                    </div>
                  </Card>
                </Section>
              ) : <Section title="Discount request"><Card><div style={{ fontSize: 11, fontWeight: 700, color: resolved.discount === "rejected" ? "#E5484D" : "#1F9D6B" }}>{resolved.discount === "rejected" ? "Discount request rejected" : "Discount request approved"}</div><div style={{ fontSize: 9, color: "#9AA0AE", fontWeight: 600, marginTop: 2 }}>BLG-0304 {"\u00b7"} resolved</div></Card></Section>}

              {!resolved.drawdown ? (
                <Section title="Drawdown request">
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>DDR-0003</div>
                        <div style={{ fontSize: 9, color: "#6B7180", fontWeight: 600, marginTop: 2 }}>Milestone: Structure 40% {"\u00b7"} WPK</div>
                        <div style={{ fontSize: 9, color: "#6B7180", fontWeight: 600, marginTop: 1 }}>AED 1,200,000</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, background: "#FFF3E0", color: "#F5A623", borderRadius: 6, padding: "3px 8px" }}>Pending</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => resolveApproval("drawdown", "approved")} style={{ flex: 1, height: 28, borderRadius: 8, background: "#34C08A", color: "#fff", border: 0, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                      <button onClick={() => resolveApproval("drawdown", "rejected")} style={{ flex: 1, height: 28, borderRadius: 8, background: "#fff", color: "#E5484D", border: "1px solid #E5484D", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                    </div>
                  </Card>
                </Section>
              ) : <Section title="Drawdown request"><Card><div style={{ fontSize: 11, fontWeight: 700, color: resolved.drawdown === "rejected" ? "#E5484D" : "#1F9D6B" }}>{resolved.drawdown === "rejected" ? "Drawdown rejected" : "Drawdown approved"}</div><div style={{ fontSize: 9, color: "#9AA0AE", fontWeight: 600, marginTop: 2 }}>DDR-0003 {"\u00b7"} resolved</div></Card></Section>}
            </div>
          )}

          {activeTab === "more" && (
            <div>
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>KA</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{agg ? agg.me.name : "Khalid Al Fahim"}</div>
                    <div style={{ fontSize: 9, color: "#9AA0AE", fontWeight: 600 }}>{agg ? (agg.me.role || "CEO").replace(/_/g, " ") : "CEO"} {"\u00b7"} Ellington Properties</div>
                  </div>
                </div>
              </Card>
              { [["Notifications", "12 unread"], ["My approvals", "2 pending"], ["Documents", "Shared with me"], ["Help & support", "FAQ + contact"], ["Settings", "App preferences"]].map(([label, note]) => (
                <Card key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 9, color: "#9AA0AE", fontWeight: 600 }}>{note}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </PhoneShell>

        <div style={{ flex: 1 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>Screen description</div>
            <div style={{ fontSize: 12, color: "#6B7180", fontWeight: 500, lineHeight: 1.7 }}>
              {activeTab === "home" && "Portfolio home shows top-level KPIs (total value, collected, overdue) plus a 30-day confidence indicator. Data refreshes every 5 minutes."}
              {activeTab === "snap" && "Project snapshot gives a quick status overview: sold percentage ring, unit-by-status legend, financial tiles, and typology mix bars. Tap a unit to see its detail."}
              {activeTab === "money" && "Money & ageing displays collections, forecast, and ageing tabs. Ageing buckets colour-code overdue periods. Buyer rows are PII-gated in production."}
              {activeTab === "appr" && "Approvals inbox surfaces discount requests and drawdown requests pending executive sign-off. Approve/reject actions send instant notifications to the requesting agent."}
              {activeTab === "more" && "More is the profile + settings menu. Notifications, shared documents, help, and app preferences live here."}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", marginTop: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>All screens</div>
            {TABS.map((t) => (
              <div key={t.key} onClick={() => setActiveTab(t.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, cursor: "pointer", background: activeTab === t.key ? "#F0EFFE" : undefined, marginBottom: 2 }}>
                <span style={{ fontSize: 16, width: 22, textAlign: "center", color: activeTab === t.key ? "#4F46E5" : "#9AA0AE" }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: activeTab === t.key ? "#4F46E5" : "#4A5060" }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: "#9AA0AE", fontWeight: 500 }}>
                    {t.key === "home" && "Portfolio overview + KPIs"}
                    {t.key === "snap" && "Per-project unit snapshot"}
                    {t.key === "money" && "Collections + ageing view"}
                    {t.key === "appr" && "Discount + drawdown approvals"}
                    {t.key === "more" && "Profile + settings"}
                  </div>
                </div>
                {t.badge && <span style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: 9, background: "#E5484D", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.badge}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
