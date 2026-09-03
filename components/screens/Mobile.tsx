import { useState } from "react";

const TABS = [
  { key: "home", label: "Home", icon: "\u2302" },
  { key: "snap", label: "Projects", icon: "\u25A6" },
  { key: "money", label: "Money", icon: "\u00A3" },
  { key: "appr", label: "Approvals", icon: "\u2713", badge: 2 },
  { key: "more", label: "More", icon: "\u2261" },
];

type Tab = typeof TABS[number]["key"];

export default function MobileScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [notice, setNotice] = useState("");

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

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
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginTop: 4 }}>AED 1.32B</div>
                <div style={{ fontSize: 9.5, color: "#1F9D6B", fontWeight: 700, marginTop: 2 }}>{"\u25B2"} 2.4% vs last month</div>
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <Card>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#9AA0AE", letterSpacing: ".05em", textTransform: "uppercase" as const }}>Collected</div>
                  <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>AED 84.2M</div>
                  <div style={{ fontSize: 9, color: "#1F9D6B", fontWeight: 700 }}>96% of target</div>
                </Card>
                <Card>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#9AA0AE", letterSpacing: ".05em", textTransform: "uppercase" as const }}>Overdue</div>
                  <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3, color: "#E5484D" }}>AED 3.1M</div>
                  <div style={{ fontSize: 9, color: "#E5484D", fontWeight: 700 }}>7 cheques</div>
                </Card>
              </div>
              <Section title="30-day confidence">
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>Expected AED 12.4M</span>
                    <span style={{ fontSize: 9, color: "#1F9D6B", fontWeight: 700 }}>87% likely</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "#F1F2F7", overflow: "hidden" }}>
                    <div style={{ width: "87%", height: "100%", borderRadius: 3, background: "#4F46E5" }} />
                  </div>
                </Card>
              </Section>
            </div>
          )}

          {activeTab === "snap" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>BLG Belgravia Heights III</div>
              <Card>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 32, border: "5px solid #4F46E5", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>71%</span>
                    <span style={{ fontSize: 7, color: "#9AA0AE", fontWeight: 600 }}>sold</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    { [["Sold", "#4F46E5", "62"], ["Available", "#34C08A", "24"], ["Reserved", "#F5A623", "6"], ["Blocked", "#E5484D", "4"]].map(([label, color, count]) => (
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
                <Card><div style={{ fontSize: 8, color: "#9AA0AE", fontWeight: 700, textTransform: "uppercase" as const }}>Collected</div><div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>AED 52.1M</div></Card>
                <Card><div style={{ fontSize: 8, color: "#9AA0AE", fontWeight: 700, textTransform: "uppercase" as const }}>Outstanding</div><div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>AED 31.8M</div></Card>
                <Card><div style={{ fontSize: 8, color: "#9AA0AE", fontWeight: 700, textTransform: "uppercase" as const }}>Overdue</div><div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, color: "#E5484D" }}>AED 1.2M</div></Card>
                <Card><div style={{ fontSize: 8, color: "#9AA0AE", fontWeight: 700, textTransform: "uppercase" as const }}>Net margin</div><div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>28.4%</div></Card>
              </div>
              <Section title="Typology mix">
                { [["Studio", 18, "42%"], ["1 Bed", 24, "58%"], ["2 Bed", 14, "35%"], ["3 Bed", 6, "43%"]].map(([t, sold, pct]) => (
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
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Money {"\u00b7"} Ageing</div>
              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                {["Collections", "Forecast", "Ageing"].map((tab) => (
                  <span key={tab} style={{ fontSize: 9, fontWeight: 700, padding: "5px 10px", borderRadius: 8, background: tab === "Ageing" ? "#4F46E5" : "#F1F2F7", color: tab === "Ageing" ? "#fff" : "#6B7180" }}>{tab}</span>
                ))}
              </div>
              <Section title="Ageing buckets">
                { [["Current", "#34C08A", "AED 8.2M", "64%"], ["1\u201330 days", "#F5A623", "AED 1.4M", "11%"], ["31\u201360 days", "#F5A623", "AED 0.8M", "6%"], ["61\u201390 days", "#E5484D", "AED 0.4M", "3%"], ["90+ days", "#E5484D", "AED 0.3M", "2%"]].map(([bucket, color, amt, pct]) => (
                  <Card key={bucket as string}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 3, background: color }} />
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
                    <span style={{ fontSize: 10, fontWeight: 700 }}>Rajesh Menon</span>
                    <span style={{ fontSize: 9, color: "#E5484D", fontWeight: 700 }}>{"\u25CF"} 62 days</span>
                  </div>
                  <div style={{ fontSize: 9, color: "#9AA0AE", fontWeight: 600, marginTop: 2 }}>Unit BLG-0402 {"\u00b7"} AED 2.1M {"\u00b7"} 1 overdue cheque</div>
                </Card>
              </Section>
            </div>
          )}

          {activeTab === "appr" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Approvals inbox</div>
              <div style={{ background: "#FDECEC", borderRadius: 10, padding: "8px 10px", marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#E5484D" }}>{"\u26A0"} 2 pending approvals {"\u00b7"} AED 1.2M</span>
              </div>
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
                    <button onClick={() => showNotice("Discount approved \u00b7 Sarah M. notified")} style={{ flex: 1, height: 28, borderRadius: 8, background: "#34C08A", color: "#fff", border: 0, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                    <button onClick={() => showNotice("Discount rejected \u00b7 Priya S. notified")} style={{ flex: 1, height: 28, borderRadius: 8, background: "#fff", color: "#E5484D", border: "1px solid #E5484D", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                  </div>
                </Card>
              </Section>
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
                    <button onClick={() => showNotice("Drawdown approved \u00b7 Finance notified")} style={{ flex: 1, height: 28, borderRadius: 8, background: "#34C08A", color: "#fff", border: 0, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                    <button onClick={() => showNotice("Drawdown rejected")} style={{ flex: 1, height: 28, borderRadius: 8, background: "#fff", color: "#E5484D", border: "1px solid #E5484D", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                  </div>
                </Card>
              </Section>
            </div>
          )}

          {activeTab === "more" && (
            <div>
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>KA</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>Khalid Al Fahim</div>
                    <div style={{ fontSize: 9, color: "#9AA0AE", fontWeight: 600 }}>CEO {"\u00b7"} Ellington Properties</div>
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
