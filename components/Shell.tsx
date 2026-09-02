import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState, ReactNode, CSSProperties } from "react";
import { PROJECTS, UNITS, BUYERS, ST, Unit } from "../lib/data";
import { money, AC } from "../lib/format";
import { groupUrl, screenUrl, GROUP_PAGE } from "../lib/nav";

export type GroupId =
  | "portfolio"
  | "project"
  | "sales"
  | "finance"
  | "handover"
  | "system"
  | "mobile";

type RailDef = { id: GroupId; label: string; route: string; d: string };

const RAIL: RailDef[] = [
  { id: "portfolio", label: "Portfolio", route: "/dashboard", d: "M12 3a9 9 0 1 0 9 9h-9V3Z" },
  { id: "project", label: "Project", route: "/inventory", d: "M4 21V7l7-4 7 4v14M9 21v-6h6v6M4 21h16" },
  { id: "sales", label: "Sales", route: "/dashboard", d: "M3 17l5-5 4 3 8-8M8 4h13v13" },
  { id: "finance", label: "Finance", route: "/dashboard", d: "M3 8h18v11H3zM3 8l3-4h12l3 4M8 13h8" },
  { id: "handover", label: "Handover", route: "/dashboard", d: "M4 12l8-8 8 8v8H4zM10 20v-6h4v6" },
  { id: "system", label: "System", route: "/dashboard", d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 13H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 20.4 9H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 2Z" },
  { id: "mobile", label: "Executive app", route: "/dashboard", d: "M7 2h10v20H7zM11 19h2" },
];

export type NavItem = { screen: string; label: string; count?: string };

const NAV: Record<GroupId, { label: string; items: NavItem[] }> = {
  portfolio: {
    label: "Portfolio",
    items: [
      { screen: "dashboard", label: "Dashboard" },
      { screen: "projects", label: "Projects" },
      { screen: "financials", label: "Financials" },
      { screen: "cashflow", label: "Cashflow" },
      { screen: "reports", label: "Reports" },
    ],
  },
  project: {
    label: "Project · BLG",
    items: [
      { screen: "inventory", label: "Inventory", count: String(UNITS.filter((u) => u.status === "Available").length) },
      { screen: "pricing", label: "Pricing & availability" },
      { screen: "construction", label: "Construction" },
    ],
  },
  sales: {
    label: "Sales",
    items: [
      { screen: "leads", label: "Leads", count: "34" },
      { screen: "booking", label: "New booking" },
      { screen: "buyer", label: "Buyers" },
      { screen: "brokers", label: "Brokers" },
      { screen: "documents", label: "Documents" },
    ],
  },
  finance: {
    label: "Finance",
    items: [
      { screen: "payments", label: "Payments" },
      { screen: "invoices", label: "Invoices" },
      { screen: "escrow", label: "Escrow", count: "12" },
      { screen: "collections", label: "Collections", count: "31" },
    ],
  },
  handover: {
    label: "Handover",
    items: [
      { screen: "pipeline", label: "Pipeline" },
      { screen: "snagging", label: "Snagging", count: "38" },
      { screen: "deeds", label: "Title deeds" },
    ],
  },
  system: {
    label: "System",
    items: [
      { screen: "users", label: "Users" },
      { screen: "settings", label: "Settings" },
      { screen: "audit", label: "Audit log" },
    ],
  },
  mobile: { label: "Executive app", items: [{ screen: "mobile", label: "All screens" }] },
};

const railBtn = (on: boolean, color: string) =>
  ({
    width: 42,
    height: 42,
    border: 0,
    background: "transparent",
    borderRadius: 13,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    position: "relative",
    zIndex: 2,
    color: on ? "#fff" : color,
  });

type Props = {
  group: GroupId;
  active: string;
  crumbs: string[];
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  onScope?: (code: string) => void;
  scopeCode?: string;
};

export default function Shell({
  group,
  active,
  crumbs,
  children,
  title,
  subtitle,
  action,
  onScope,
  scopeCode,
}: Props) {
  const router = useRouter();
  const gi = RAIL.findIndex((g) => g.id === group);
  const [switcher, setSwitcher] = useState(false);
  const [cmdk, setCmdk] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const closeCmdk = useCallback(() => {
    setCmdk(false);
    setQ("");
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdk(true);
      }
      if (e.key === "Escape") closeCmdk();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [closeCmdk]);

  useEffect(() => {
    if (cmdk && inputRef.current) inputRef.current.focus();
  }, [cmdk]);

  const go = (route: string, qp?: Record<string, string>) =>
    router.push({ pathname: route, query: qp });

  const navigate = (screen: string, g: GroupId, extra?: Record<string, string>) => {
    const url = screenUrl(screen, g, scopeCode);
    if (extra) url.query = { ...url.query, ...extra };
    router.push(url);
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push("/login");
  };

  const countMap: Record<string, { n: number; v: number }> = {};
  UNITS.forEach((u) => {
    countMap[u.status] = countMap[u.status] || { n: 0, v: 0 };
    countMap[u.status].n++;
    countMap[u.status].v += u.price;
  });
  const total = UNITS.length;

  const navItems = NAV[group].items.map((it) => {
    const on = active === it.screen;
    const red = it.label === "Collections" || it.label === "Escrow";
    return {
      screen: it.screen,
      label: it.label,
      count: it.count || "",
      btn: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 10px",
        border: 0,
        borderRadius: 11,
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "12.5px",
        fontWeight: on ? "700" : "500",
        color: on ? "#14161F" : "#6B7180",
        background: on ? "#F0EFFE" : "transparent",
        width: "100%",
      },
      dot: {
        width: 5,
        height: 5,
        borderRadius: 5,
        flex: "none",
        background: on ? AC : "transparent",
      },
      badge: it.count
        ? {
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 7,
            padding: "2px 6px",
            background: red ? "#FDECEC" : "#F1F2F7",
            color: red ? "#E5484D" : "#6B7180",
          }
        : { display: "none" },
      lock: { display: "none" },
    };
  });

  const scopes = [
    { code: "ALL", name: "All projects (Portfolio)", pct: 68, units: 850 },
    ...PROJECTS.map((p) => ({ code: p.code, name: p.name, pct: Math.round((p.sold / p.units) * 100), units: p.units })),
  ];
  const proj = PROJECTS.find((p) => p.code === scopeCode);
  const groupLabel = group === "project" ? "Project · " + (proj ? proj.code : scopeCode || "ALL") : NAV[group].label;

  const hitUnits = UNITS.filter(
    (u) => !q || u.id.toLowerCase().includes(q.toLowerCase()) || u.typ.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 4);
  const hitBuyers = BUYERS.filter((b) => !q || b.toLowerCase().includes(q.toLowerCase())).slice(0, 3);
  const hitActions = [
    { title: "Record payment", screen: "payments", group: "finance" as GroupId },
    { title: "New booking", screen: "booking", group: "sales" as GroupId },
    { title: "Escrow reconciliation", screen: "escrow", group: "finance" as GroupId },
    { title: "Collections worklist", screen: "collections", group: "finance" as GroupId },
  ].filter((a) => !q || a.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", background: "#F3F4F8", color: "#14161F", fontSize: 13 }}>
      <Rail group={group} gi={gi} onGo={(id) => router.push(groupUrl(id, scopeCode))} onSignOut={signOut} />

      <div style={{ width: 222, flex: "none", background: "#fff", display: "flex", flexDirection: "column", padding: "18px 14px 14px", borderRight: "1px solid #EDEEF3", overflow: "auto" }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em", padding: "0 8px" }}>Ellington</div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase", padding: "3px 8px 0" }}>ORN 21281 · H21</div>

        <button
          onClick={() => setSwitcher((s) => !s)}
          style={{ marginTop: 16, width: "100%", textAlign: "left", background: "#F5F6FA", border: "1px solid #EDEEF3", borderRadius: 14, padding: "11px 12px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", fontFamily: "inherit" }}
        >
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, padding: "4px 6px", borderRadius: 8, background: "#EDECFE", color: AC }}>
            {scopeCode || (onScope ? "ALL" : "")}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {proj ? proj.name : "All projects"}
            </span>
            <span style={{ display: "block", fontSize: 10.5, color: "#6B7180", fontWeight: 500, marginTop: 2 }}>
              {proj ? proj.units + " units · " + Math.round((proj.sold / proj.units) * 100) + "% sold" : "850 units · 68% sold"}
            </span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA0AE" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>

        {switcher && (
          <div style={{ marginTop: 8, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 14, boxShadow: "0 12px 32px rgba(20,22,31,.10)", padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
            {scopes.map((s) => {
              const on = (scopeCode || "ALL") === s.code;
              return (
                <button
                  key={s.code}
                  onClick={() => {
                    onScope && onScope(s.code);
                    setSwitcher(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 8px", border: 0, borderRadius: 11, cursor: "pointer", fontFamily: "inherit", background: on ? "#F5F6FA" : "transparent" }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 700, padding: "3px 5px", borderRadius: 6, background: "#EDECFE", color: AC }}>{s.code}</span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                    <span style={{ display: "block", height: 3, borderRadius: 3, background: "#EDEEF3", marginTop: 5, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: s.pct + "%", background: AC }} />
                    </span>
                  </span>
                  <span style={{ fontSize: 10.5, color: "#6B7180", fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{s.pct}%</span>
                </button>
              );
            })}
            <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", border: 0, background: "transparent", borderRadius: 10, cursor: "pointer", color: "#4F46F5", fontSize: 12, fontWeight: 700, fontFamily: "inherit", marginTop: 2, borderTop: "1px solid #EDEEF3" }}>
              + New project
            </button>
          </div>
        )}

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".09em", color: "#9AA0AE", textTransform: "uppercase", padding: "6px 10px 8px" }}>{groupLabel}</div>
          {navItems.map((n) => (
            <button key={n.screen} onClick={() => navigate(n.screen, group)} style={n.btn} onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F6FA")} onMouseLeave={(e) => (e.currentTarget.style.background = n.btn.background as string)}>
              <span style={n.dot} />
              <span style={{ flex: 1, textAlign: "left" }}>{n.label}</span>
              <span style={n.badge}>{n.count}</span>
              <span style={n.lock}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              </span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />
        <div style={{ borderTop: "1px solid #EDEEF3", paddingTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 11, background: "#E7E9F0", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#4A5060" }}>RM</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Rania Mansour</div>
            <div style={{ fontSize: 10, color: "#6B7180", fontWeight: 600 }}>Super Admin</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden" }}>
        <div style={{ minWidth: 1180, height: "100%", display: "flex", flexDirection: "column" }}>
          <Topbar crumbs={crumbs} onOpenCmdk={() => setCmdk(true)} onCollections={() => navigate("collections", "finance")} />

          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "24px 26px 40px" }}>
            {title && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>{title}</div>
                  {subtitle && <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>{subtitle}</div>}
                </div>
                {action}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>

      {cmdk && (
        <div onClick={closeCmdk} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.32)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "90px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: "calc(100vw - 40px)", background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(20,22,31,.2)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #EDEEF3" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA0AE" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search units, buyers, receipts…"
                style={{ flex: 1, border: 0, outline: "none", fontFamily: "inherit", fontSize: 13.5, color: "#14161F", background: "transparent" }}
              />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, background: "#F5F6FA", border: "1px solid #E4E6EE", borderRadius: 6, padding: "2px 6px", color: "#6B7180" }}>Esc</span>
            </div>
            <div style={{ maxHeight: 360, overflow: "auto", padding: "8px" }}>
              {hitUnits.length > 0 && <Group label="Units" items={hitUnits.map((u) => ({ key: u.id, title: u.id, sub: u.typ + " · L" + u.f + " · " + u.area + " sq.ft", trail: money(u.price), icon: "⌗", bg: ST[u.status][1], fg: ST[u.status][0], onClick: () => { closeCmdk(); navigate("unit", "project", { unit: u.id }); } }))} />}
              {hitBuyers.length > 0 && <Group label="Buyers" items={hitBuyers.map((b, i) => ({ key: b, title: b, sub: "H21-B-00" + (147 + i) + " · 2 units", trail: "AED " + (1.9 - i * 0.4).toFixed(1) + "M out", icon: b[0], bg: "#E7E9F0", fg: "#4A5060", onClick: () => { closeCmdk(); navigate("buyer", "sales", { name: b }); } }))} />}
              {hitActions.length > 0 && <Group label="Actions" items={hitActions.map((a) => ({ key: a.title, title: a.title, sub: "Action", trail: "↵", icon: "›", bg: "#EDECFE", fg: AC, onClick: () => { closeCmdk(); navigate(a.screen, a.group); } }))} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Rail({ group, gi, onGo, onSignOut }: { group: GroupId; gi: number; onGo: (id: GroupId) => void; onSignOut: () => void }) {
  return (
    <div style={{ width: 76, flex: "none", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 0 14px", borderRight: "1px solid #EDEEF3" }}>
      <div style={{ width: 40, height: 40, borderRadius: 13, background: "#14161F", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, letterSpacing: "-.02em", marginBottom: 22 }}>EH</div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ position: "absolute", left: 0, top: gi * 52, width: 42, height: 42, borderRadius: 13, background: "#14161F", transition: "top 200ms cubic-bezier(.2,0,0,1)", zIndex: 1 }} />
        {RAIL.map((g) => (
          <button key={g.id} onClick={() => onGo(g.id)} title={g.label} style={railBtn(group === g.id, "#9AA0AE") as CSSProperties}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={g.d} /></svg>
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <button
        onClick={onSignOut}
        title="Sign out"
        style={{ width: 42, height: 42, border: 0, background: "transparent", borderRadius: 13, color: "#9AA0AE", display: "grid", placeItems: "center", cursor: "pointer" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
      </button>
    </div>
  );
}

function Topbar({ crumbs, onOpenCmdk, onCollections }: { crumbs: string[]; onOpenCmdk: () => void; onCollections: () => void }) {
  return (
    <div style={{ height: 60, flex: "none", background: "#fff", borderBottom: "1px solid #EDEEF3", display: "flex", alignItems: "center", gap: 18, padding: "0 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "#9AA0AE", whiteSpace: "nowrap" }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ fontSize: 12, fontWeight: i === crumbs.length - 1 ? "700" : "600", color: i === crumbs.length - 1 ? "#14161F" : "#9AA0AE" }}>
            {c}
            {i < crumbs.length - 1 ? "  /" : ""}
          </span>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <button onClick={onOpenCmdk} style={{ width: 400, height: 38, background: "#F5F6FA", border: "1px solid #EDEEF3", borderRadius: 12, display: "flex", alignItems: "center", gap: 9, padding: "0 12px", cursor: "text", color: "#9AA0AE", fontFamily: "inherit", fontSize: 12.5 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Search units, buyers, receipts…</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, background: "#fff", border: "1px solid #E4E6EE", borderRadius: 6, padding: "2px 6px", color: "#6B7180" }}>⌘K</span>
      </button>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onCollections} style={{ height: 34, border: "1px solid #EDEEF3", background: "#F5F6FA", borderRadius: 11, padding: "0 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: "#34C08A" }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>Due today</span>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "-.01em" }}>AED 4.2M</span>
        </button>
        <button style={{ width: 36, height: 36, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", display: "grid", placeItems: "center", cursor: "pointer", position: "relative" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4A5060" strokeWidth="1.7" strokeLinecap="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
          <span style={{ position: "absolute", top: 5, right: 6, minWidth: 14, height: 14, borderRadius: 8, background: "#E5484D", color: "#fff", fontSize: 9, fontWeight: 800, display: "grid", placeItems: "center", padding: "0 3px" }}>9</span>
        </button>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "#E7E9F0", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#4A5060" }}>RM</div>
      </div>
    </div>
  );
}

function Group({ label, items }: { label: string; items: { key: string; title: string; sub: string; trail: string; icon: string; bg: string; fg: string; onClick: () => void }[] }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".09em", color: "#9AA0AE", textTransform: "uppercase", padding: "8px 10px 4px" }}>{label}</div>
      {items.map((it) => (
        <button key={it.key} onClick={it.onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "8px 10px", border: 0, background: "transparent", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ width: 30, height: 30, flex: "none", borderRadius: 10, background: it.bg, color: it.fg, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700 }}>{it.icon}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{it.title}</span>
            <span style={{ display: "block", fontSize: 10.5, color: "#9AA0AE" }}>{it.sub}</span>
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6B7180", whiteSpace: "nowrap" }}>{it.trail}</span>
        </button>
      ))}
    </div>
  );
}
