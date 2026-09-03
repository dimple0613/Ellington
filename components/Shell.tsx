import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState, ReactNode, CSSProperties } from "react";
import { PROJECTS, UNITS, BUYERS, ST, Unit } from "../lib/data";
import { money, AC } from "../lib/format";
import { groupUrl, screenUrl, GROUP_PAGE } from "../lib/nav";
import { useWindowSize } from "../lib/useWindowSize";

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
    label: "Project Â· BLG",
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

const NOTIFS = [
  { id: "n1", who: "R. Menon", what: "requested a 7.5% discount on T2-0806", time: "2 min ago", unread: true },
  { id: "n2", who: "Oqood", what: "3 registrations pending >14 days", time: "18 min ago", unread: true },
  { id: "n3", who: "Escrow", what: "AED 340,000 variance unmatched", time: "41 min ago", unread: true },
  { id: "n4", who: "Collections", what: "4 units overdue >90 days â€” AED 8.2M", time: "1 hr ago", unread: true },
  { id: "n5", who: "Handover", what: "Wilton Park â€” 12 SPAs unsigned beyond 21 days", time: "2 hr ago", unread: false },
  { id: "n6", who: "Compliance", what: "6 buyer passports expiring within 60 days", time: "Yesterday", unread: false },
];

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
  const win = useWindowSize();
  const [switcher, setSwitcher] = useState(false);
  const [cmdk, setCmdk] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [drawer, setDrawer] = useState(false);
  const dlg = win.bp === "mobile";

  const [notif, setNotif] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [newProj, setNewProj] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rtl, setRtl] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFS);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const unread = notifs.filter((n) => n.unread).length;

  const closeCmdk = useCallback(() => {
    setCmdk(false);
    setQ("");
  }, []);

  const closeMenus = useCallback(() => {
    setNotif(false);
    setProfileMenu(false);
    setHelp(false);
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdk(true);
      }
      if (e.key === "Escape") {
        closeCmdk();
        closeMenus();
        setSwitcher(false);
        setNewProj(false);
        setDrawer(false);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [closeCmdk, closeMenus]);

  useEffect(() => {
    if (cmdk && inputRef.current) inputRef.current.focus();
  }, [cmdk]);

  const navigate = (screen: string, g: GroupId, extra?: Record<string, string>) => {
    const url = screenUrl(screen, g, scopeCode);
    if (extra) url.query = { ...url.query, ...extra };
    setDrawer(false);
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

  const scopeLocked = (scopeCode || "ALL") === "ALL";
  const groupLocked = (group === "project" || group === "sales") && scopeLocked;

  const navItems = NAV[group].items.map((it) => {
    const on = active === it.screen;
    const red = it.label === "Collections" || it.label === "Escrow";
    const locked = groupLocked && it.screen !== "buyer";
    return {
      screen: it.screen,
      label: it.label,
      count: it.count || "",
      locked,
      btn: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 10px",
        border: 0,
        borderRadius: 11,
        cursor: locked ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontSize: "12.5px",
        fontWeight: on ? "700" : "500",
        color: locked ? "#B8BDC9" : on ? "#14161F" : "#6B7180",
        background: on && !locked ? "#F0EFFE" : "transparent",
        width: "100%",
        opacity: locked ? 0.7 : 1,
      } as CSSProperties,
      dot: {
        width: 5,
        height: 5,
        borderRadius: 5,
        flex: "none",
        background: on && !locked ? AC : "transparent",
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
      lock: locked
        ? { display: "inline-flex", color: "#B8BDC9" }
        : { display: "none" },
    };
  });

  const scopes = [
    { code: "ALL", name: "All projects (Portfolio)", pct: 68, units: 850 },
    ...PROJECTS.map((p) => ({ code: p.code, name: p.name, pct: Math.round((p.sold / p.units) * 100), units: p.units })),
  ];
  const proj = PROJECTS.find((p) => p.code === scopeCode);
  const groupLabel = group === "project" ? "Project Â· " + (proj ? proj.code : scopeCode || "ALL") : NAV[group].label;

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

  const sideInFlow = win.bp === "laptop" || win.bp === "desktop";
  const railVisible = win.bp !== "mobile";
  const goGroup = (id: GroupId) => {
    if ((id === "project" || id === "sales") && scopeLocked) {
      showToast("Select a project to access " + (id === "project" ? "the Project module" : "Sales"));
      return;
    }
    setDrawer(false);
    router.push(groupUrl(id, scopeCode));
  };

  const renderSidebar = () => (
    <>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em", padding: "0 8px" }}>Ellington</div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase", padding: "3px 8px 0" }}>ORN 21281 · H21</div>
      <button
        onClick={() => {
          closeMenus();
          setSwitcher((s) => !s);
        }}
        style={{ marginTop: 16, width: "100%", textAlign: "left", background: "#F5F6FA", border: "1px solid #EDEEF3", borderRadius: 14, padding: "11px 12px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", fontFamily: "inherit" }}
      >
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, padding: "4px 6px", borderRadius: 8, background: "#EDECFE", color: AC }}>{scopeCode || (onScope ? "ALL" : "")}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{proj ? proj.name : "All projects"}</span>
          <span style={{ display: "block", fontSize: 10.5, color: "#6B7180", fontWeight: 500, marginTop: 2 }}>{proj ? proj.units + " units · " + Math.round((proj.sold / proj.units) * 100) + "% sold" : "850 units · 68% sold"}</span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA0AE" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {switcher && (
        <div style={{ marginTop: 8, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 14, boxShadow: "0 12px 32px rgba(20,22,31,.10)", padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
          {scopes.map((s) => {
            const on = (scopeCode || "ALL") === s.code;
            return (
              <button key={s.code} onClick={() => { onScope && onScope(s.code); setSwitcher(false); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 8px", border: 0, borderRadius: 11, cursor: "pointer", fontFamily: "inherit", background: on ? "#F5F6FA" : "transparent" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 700, padding: "3px 5px", borderRadius: 6, background: "#EDECFE", color: AC }}>{s.code}</span>
                <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                  <span style={{ display: "block", height: 3, borderRadius: 3, background: "#EDEEF3", marginTop: 5, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: s.pct + "%", background: AC }} /></span>
                </span>
                <span style={{ fontSize: 10.5, color: "#6B7180", fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{s.pct}%</span>
              </button>
            );
          })}
          <button onClick={() => { setSwitcher(false); setNewProj(true); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", border: 0, background: "transparent", borderRadius: 10, cursor: "pointer", color: "#4F46F5", fontSize: 12, fontWeight: 700, fontFamily: "inherit", marginTop: 2, borderTop: "1px solid #EDEEF3" }}>+ New project</button>
        </div>
      )}
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".09em", color: "#9AA0AE", textTransform: "uppercase", padding: "6px 10px 8px" }}>{groupLabel}</div>
        {navItems.map((n) => (
          <button key={n.screen} title={n.locked ? "Select a project to access" : undefined} disabled={n.locked} onClick={() => { if (n.locked) { showToast("Select a project to access the " + n.label + " screen"); return; } navigate(n.screen, group); }} style={n.btn} onMouseEnter={(e) => { if (!n.locked) e.currentTarget.style.background = "#F5F6FA"; }} onMouseLeave={(e) => { if (!n.locked) e.currentTarget.style.background = n.btn.background as string; }}>
            <span style={n.dot} />
            <span style={{ flex: 1, textAlign: "left" }}>{n.label}</span>
            <span style={n.badge}>{n.count}</span>
            <span style={n.lock}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            </span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 24 }} />
      <div style={{ borderTop: "1px solid #EDEEF3", paddingTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, flex: "none", borderRadius: 11, background: "#E7E9F0", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#4A5060" }}>RM</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Rania Mansour</div>
          <div style={{ fontSize: 10, color: "#6B7180", fontWeight: 600 }}>Super Admin</div>
        </div>
        <button onClick={() => { closeMenus(); setProfileMenu((p) => !p); }} title="Account menu" style={{ width: 30, height: 30, border: 0, background: "#F5F6FA", borderRadius: 10, display: "grid", placeItems: "center", cursor: "pointer", color: "#4A5060" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
        </button>
      </div>
    </>
  );

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%", overflow: "hidden", background: "#F3F4F8", color: "#14161F", fontSize: 13 }}
    >
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      {railVisible && (
      <Rail
        group={group}
        gi={gi}
        locked={scopeLocked}
        onGo={(id) => {
          if ((id === "project" || id === "sales") && scopeLocked) {
            showToast("Select a project to access " + (id === "project" ? "the Project module" : "Sales"));
            return;
          }
          setDrawer(false);
          router.push(groupUrl(id, scopeCode));
        }}
        onSignOut={signOut}
      />
      )}

      {sideInFlow && (
      <div style={{ width: 216, flex: "none", background: "#fff", display: "flex", flexDirection: "column", padding: "18px 14px 14px", borderRight: "1px solid #EDEEF3", overflow: "auto" }}>
        {renderSidebar()}
      </div>
      )}

      <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Topbar
          crumbs={crumbs}
          onOpenCmdk={() => setCmdk(true)}
          onCollections={() => navigate("collections", "finance")}
          notifOpen={notif}
          onNotif={() => { closeMenus(); setNotif((n) => !n); }}
          profileOpen={profileMenu}
          onProfile={() => { closeMenus(); setProfileMenu((p) => !p); }}
          unread={unread}
          helpOpen={help}
          onHelp={() => { closeMenus(); setHelp((h) => !h); }}
          onMenu={dlg || win.bp === "tablet" ? () => setDrawer(true) : undefined}
          group={group}
        /> 

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

      {dlg && <MobileBar groups={RAIL} group={group} locked={scopeLocked} onGo={goGroup} onOpen={() => setDrawer(true)} />}

      {(dlg || win.bp === "tablet") && drawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(20,22,31,.4)", display: "flex" }}>
          <div onClick={() => setDrawer(false)} style={{ flex: 1 }} />
          <div style={{ width: Math.min(300, win.w - 40), height: "100%", background: "#fff", display: "flex", flexDirection: "column", padding: "18px 14px 14px", overflowY: "auto", boxShadow: "-12px 0 40px rgba(20,22,31,.16)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>Ellington</div>
              <button onClick={() => setDrawer(false)} style={{ width: 32, height: 32, border: 0, background: "#F1F2F7", borderRadius: 10, display: "grid", placeItems: "center", cursor: "pointer", fontWeight: 700, fontSize: 16, color: "#4A5060", fontFamily: "inherit" }}>×</button>
            </div>
            {renderSidebar()}
          </div>
        </div>
      )}

      <TopbarFloating
        notifOpen={notif}
        unread={unread}
        notifs={notifs}
        onMarkAll={() => setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })))}
        onDismiss={(id) => setNotifs((ns) => ns.filter((n) => n.id !== id))}
        onClose={() => setNotif(false)}
        helpOpen={help}
        onCloseHelp={() => setHelp(false)}
        profileOpen={profileMenu}
        onCloseProfile={() => setProfileMenu(false)}
        rtl={rtl}
        onToggleRtl={() => setRtl((r) => !r)}
        onSignOut={signOut}
        onToast={showToast}
      />

      {cmdk && (
        <div onClick={closeCmdk} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.32)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "90px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: "calc(100vw - 40px)", background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(20,22,31,.2)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #EDEEF3" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA0AE" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search units, buyers, receiptsâ€¦"
                style={{ flex: 1, border: 0, outline: "none", fontFamily: "inherit", fontSize: 13.5, color: "#14161F", background: "transparent" }}
              />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, background: "#F5F6FA", border: "1px solid #E4E6EE", borderRadius: 6, padding: "2px 6px", color: "#6B7180" }}>Esc</span>
            </div>
            <div style={{ maxHeight: 360, overflow: "auto", padding: "8px" }}>
              {hitUnits.length > 0 && <Group label="Units" items={hitUnits.map((u) => ({ key: u.id, title: u.id, sub: u.typ + " Â· L" + u.f + " Â· " + u.area + " sq.ft", trail: money(u.price), icon: "âŒ—", bg: ST[u.status][1], fg: ST[u.status][0], onClick: () => { closeCmdk(); navigate("unit", "project", { unit: u.id }); } }))} />}
              {hitBuyers.length > 0 && <Group label="Buyers" items={hitBuyers.map((b, i) => ({ key: b, title: b, sub: "H21-B-00" + (147 + i) + " Â· 2 units", trail: "AED " + (1.9 - i * 0.4).toFixed(1) + "M out", icon: b[0], bg: "#E7E9F0", fg: "#4A5060", onClick: () => { closeCmdk(); navigate("buyer", "sales", { name: b }); } }))} />}
              {hitActions.length > 0 && <Group label="Actions" items={hitActions.map((a) => ({ key: a.title, title: a.title, sub: "Action", trail: "â†µ", icon: "â€º", bg: "#EDECFE", fg: AC, onClick: () => { closeCmdk(); navigate(a.screen, a.group); } }))} />}
            </div>
          </div>
        </div>
      )}

      {newProj && (
        <NewProjectModal
          onClose={() => setNewProj(false)}
          onCreate={(name, code) => {
            setNewProj(false);
            showToast("Project " + code + " Â· " + name + " created");
          }}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#14161F", color: "#fff", borderRadius: 12, padding: "11px 18px", boxShadow: "0 12px 32px rgba(20,22,31,.24)", fontSize: 12.5, fontWeight: 600, zIndex: 80, display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34C08A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          {toast}
        </div>
      )}
    </div>
  );
}

function MenuRow({ icon, label, sub, onClick }: { icon: string; label: string; sub?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: 0, background: "transparent", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
      <span style={{ width: 24, height: 24, flex: "none", borderRadius: 8, background: "#F1F2F7", color: "#4A5060", display: "grid", placeItems: "center", fontSize: 12 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12, fontWeight: 700 }}>{label}</span>
        {sub && <span style={{ display: "block", fontSize: 10.5, color: "#9AA0AE", fontWeight: 500 }}>{sub}</span>}
      </span>
    </button>
  );
}

function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, code: string) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.4)", zIndex: 60, display: "grid", placeItems: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: "calc(100vw - 40px)", background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(20,22,31,.22)", padding: 24 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>New project</div>
        <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4 }}>Set up a new development project.</div>
        <label style={{ display: "block", marginTop: 18 }}>
          <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7180", marginBottom: 6 }}>Project name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cordoba Residences" style={{ width: "100%", height: 40, border: "1px solid #EDEEF3", borderRadius: 12, padding: "0 12px", fontFamily: "inherit", fontSize: 13, outline: "none", background: "#F8F9FB" }} />
        </label>
        <label style={{ display: "block", marginTop: 12 }}>
          <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7180", marginBottom: 6 }}>Project code (3 letters)</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 3))} placeholder="CRD" style={{ width: "100%", height: 40, border: "1px solid #EDEEF3", borderRadius: 12, padding: "0 12px", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, outline: "none", background: "#F8F9FB" }} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ height: 38, border: "1px solid #EDEEF3", background: "#fff", borderRadius: 12, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button
            onClick={() => onCreate(name || "Untitled project", code || "NEW")}
            style={{ height: 38, border: 0, background: "#14161F", color: "#fff", borderRadius: 12, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            Create project
          </button>
        </div>
      </div>
    </div>
  );
}

function Rail({ group, gi, locked, onGo, onSignOut }: { group: GroupId; gi: number; locked: boolean; onGo: (id: GroupId) => void; onSignOut: () => void }) {
  return (
    <div style={{ width: 76, flex: "none", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 0 14px", borderRight: "1px solid #EDEEF3" }}>
      <div style={{ width: 40, height: 40, borderRadius: 13, background: "#14161F", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, letterSpacing: "-.02em", marginBottom: 22 }}>EH</div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ position: "absolute", left: 0, top: gi * 52, width: 42, height: 42, borderRadius: 13, background: "#14161F", transition: "top 200ms cubic-bezier(.2,0,0,1)", zIndex: 1 }} />
        {RAIL.map((g) => {
          const isLocked = (g.id === "project" || g.id === "sales") && locked;
          return (
            <button
              key={g.id}
              onClick={() => onGo(g.id)}
              title={isLocked ? "Select a project to access â€” " + g.label : g.label}
              style={{ ...railBtn(group === g.id, isLocked ? "#C7CBD6" : "#9AA0AE"), opacity: isLocked && group !== g.id ? 0.5 : 1, cursor: isLocked && group !== g.id ? "not-allowed" : "pointer" } as CSSProperties}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={g.d} /></svg>
            </button>
          );
        })}
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

function Topbar({
  crumbs,
  onOpenCmdk,
  onCollections,
  notifOpen,
  onNotif,
  profileOpen,
  onProfile,
  unread,
  helpOpen,
  onHelp,
  onMenu,
  group,
}: {
  crumbs: string[];
  onOpenCmdk: () => void;
  onCollections: () => void;
  notifOpen: boolean;
  onNotif: () => void;
  profileOpen: boolean;
  onProfile: () => void;
  unread: number;
  helpOpen: boolean;
  onHelp: () => void;
  onMenu?: () => void;
  group?: GroupId;
}) {
  return (
    <div style={{ height: 60, flex: "none", background: "#fff", borderBottom: "1px solid #EDEEF3", display: "flex", alignItems: "center", gap: 14, padding: "0 18px", position: "relative", zIndex: 30 }}>
      {onMenu && (
        <button onClick={onMenu} title="Menu" style={{ width: 38, height: 38, flex: "none", borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14161F" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "#9AA0AE", whiteSpace: "nowrap", minWidth: 0, overflow: "hidden" }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ fontSize: 12, fontWeight: i === crumbs.length - 1 ? "700" : "600", color: i === crumbs.length - 1 ? "#14161F" : "#9AA0AE" }}>
            {c}
            {i < crumbs.length - 1 ? "  /" : ""}
          </span>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <button onClick={onOpenCmdk} style={{ width: 300, maxWidth: "34vw", height: 38, background: "#F5F6FA", border: "1px solid #EDEEF3", borderRadius: 12, display: "flex", alignItems: "center", gap: 9, padding: "0 12px", cursor: "text", color: "#9AA0AE", fontFamily: "inherit", fontSize: 12.5 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Search units, buyers, receipts…</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, background: "#fff", border: "1px solid #E4E6EE", borderRadius: 6, padding: "2px 6px", color: "#6B7180" }}>⌘K</span>
      </button>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => { onCollections(); }} style={{ height: 34, border: "1px solid #EDEEF3", background: "#F5F6FA", borderRadius: 11, padding: "0 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: "#34C08A" }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#6B7180" }}>Due today</span>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "-.01em" }}>AED 4.2M</span>
        </button>
        <button
          onClick={() => { onHelp(); }}
          title="Help"
          style={{ width: 36, height: 36, borderRadius: 12, border: "1px solid #EDEEF3", background: helpOpen ? "#F5F6FA" : "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4A5060" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.6 1.4c0 1.5-2.1 2-2.1 3.1M12 17h.01" /></svg>
        </button>
        <button
          onClick={() => { onNotif(); }}
          title="Notifications"
          style={{ width: 36, height: 36, borderRadius: 12, border: "1px solid #EDEEF3", background: notifOpen ? "#F5F6FA" : "#fff", display: "grid", placeItems: "center", cursor: "pointer", position: "relative" }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4A5060" strokeWidth="1.7" strokeLinecap="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
          <span style={{ position: "absolute", top: 5, right: 6, minWidth: 14, height: 14, borderRadius: 8, background: "#E5484D", color: "#fff", fontSize: 9, fontWeight: 800, display: unread > 0 ? "grid" : "none", placeItems: "center", padding: "0 3px" }}>{unread}</span>
        </button>
        <button
          onClick={onProfile}
          title="Account"
          style={{ width: 36, height: 36, borderRadius: 12, background: profileOpen ? "#DDE0E8" : "#E7E9F0", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#4A5060", border: 0, cursor: "pointer" }}
        >
          RM
        </button>
      </div>
    </div>
  );
}

function MobileBar({ groups, group, locked, onGo, onOpen }: { groups: RailDef[]; group: GroupId; locked: boolean; onGo: (id: GroupId) => void; onOpen: () => void }) {
  return (
    <div style={{ flex: "none", height: 62, background: "#fff", borderTop: "1px solid #EDEEF3", display: "flex", alignItems: "center", justifyContent: "space-around", position: "relative", zIndex: 60 }}>
      {groups.slice(0, 6).map((g) => {
        const gLocked = (g.id === "project" || g.id === "sales") && locked;
        return (
          <button key={g.id} onClick={() => onGo(g.id)} title={gLocked ? "Select a project" : g.label} style={{ height: "100%", flex: 1, border: 0, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: gLocked && group !== g.id ? "not-allowed" : "pointer", opacity: gLocked && group !== g.id ? 0.5 : 1, fontFamily: "inherit" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={group === g.id ? "#14161F" : "#9AA0AE"} strokeWidth={group === g.id ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round"><path d={g.d} /></svg>
            <span style={{ fontSize: 9.5, fontWeight: group === g.id ? "800" : "600", color: group === g.id ? "#14161F" : "#9AA0AE" }}>{g.label.split(" ")[0]}</span>
          </button>
        );
      })}
      <button onClick={onOpen} title="Menu" style={{ height: "100%", flex: 1, border: 0, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", fontFamily: "inherit" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14161F" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: "#9AA0AE" }}>Menu</span>
      </button>
    </div>
  );
}

function TopbarFloating({
  notifOpen,
  unread,
  notifs,
  onMarkAll,
  onDismiss,
  onClose,
  helpOpen,
  onCloseHelp,
  profileOpen,
  onCloseProfile,
  rtl,
  onToggleRtl,
  onSignOut,
  onToast,
}: {
  notifOpen: boolean;
  unread: number;
  notifs: { id: string; who: string; what: string; time: string; unread: boolean }[];
  onMarkAll: () => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
  helpOpen: boolean;
  onCloseHelp: () => void;
  profileOpen: boolean;
  onCloseProfile: () => void;
  rtl: boolean;
  onToggleRtl: () => void;
  onSignOut: () => void;
  onToast: (m: string) => void;
}) {
  return (
    <>
      {profileOpen && (
        <div style={{ position: "fixed", top: 56, right: 18, width: 236, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 16, boxShadow: "0 20px 56px rgba(20,22,31,.18)", zIndex: 70, padding: 6 }}>
          <div style={{ padding: "8px 10px 4px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-.01em" }}>Rania Mansour</div>
            <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 1 }}>r.mansour@ellington.ae</div>
            <span style={{ display: "inline-block", marginTop: 6, fontSize: 10, fontWeight: 700, background: "#EDECFE", color: AC, borderRadius: 7, padding: "2px 7px" }}>Super Admin</span>
          </div>
          <div style={{ borderTop: "1px solid #EDEEF3", margin: "6px 8px" }} />
          <MenuRow icon="â—Ž" label="My profile" sub="Identity & preferences" onClick={() => { onCloseProfile(); onToast("Profile settings opened"); }} />
          <MenuRow icon="âš™" label="Preferences" sub="Notifications & quiet hours" onClick={() => { onCloseProfile(); onToast("Preferences opened"); }} />
          <MenuRow icon="âŸ³" label="Offline cache" sub="Last synced 09:39" onClick={() => { onCloseProfile(); onToast("Offline cache synced"); }} />
          <MenuRow icon="â‡„" label={rtl ? "Direction: RTL" : "Direction: LTR"} sub="Mirror the shell" onClick={() => { onToggleRtl(); onCloseProfile(); }} />
          <div style={{ borderTop: "1px solid #EDEEF3", margin: "6px 8px" }} />
          <button onClick={() => { onCloseProfile(); onSignOut(); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", border: 0, background: "transparent", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", color: "#E5484D", fontSize: 12, fontWeight: 700, textAlign: "left", width: "100%" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Sign out
          </button>
        </div>
      )}
      {notifOpen && (
        <div style={{ position: "fixed", top: 56, right: 18, width: 360, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 16, boxShadow: "0 20px 56px rgba(20,22,31,.18)", zIndex: 70, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #EDEEF3" }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: "-.01em" }}>Notifications</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {unread > 0 && (
                <button onClick={onMarkAll} style={{ border: 0, background: "transparent", color: AC, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Mark all read</button>
              )}
              <button onClick={onClose} style={{ border: 0, background: "#F1F2F7", color: "#4A5060", width: 24, height: 24, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, lineHeight: 1 }}>Ã—</button>
            </div>
          </div>
          <div style={{ maxHeight: 380, overflow: "auto" }}>
            {notifs.length === 0 && <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 12.5, color: "#9AA0AE", fontWeight: 500 }}>You're all caught up.</div>}
            {notifs.map((n) => (
              <div key={n.id} style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: "1px solid #F4F5F9", background: n.unread ? "#F7F7FF" : "#fff" }}>
                <span style={{ width: 26, height: 26, flex: "none", borderRadius: 9, background: n.unread ? "#EDECFE" : "#F1F2F7", color: n.unread ? AC : "#6B7180", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>{n.who[0]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.45 }}>
                    <span style={{ fontWeight: 800 }}>{n.who}</span> {n.what}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 500, marginTop: 2 }}>{n.time}{n.unread ? " Â· unread" : ""}</div>
                </div>
                <button onClick={() => onDismiss(n.id)} title="Dismiss" style={{ border: 0, background: "transparent", color: "#C7CBD6", cursor: "pointer", fontSize: 13, fontFamily: "inherit", alignSelf: "flex-start" }}>Ã—</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {helpOpen && (
        <div style={{ position: "fixed", top: 56, right: 66, width: 260, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 16, boxShadow: "0 20px 56px rgba(20,22,31,.18)", zIndex: 70, padding: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-.01em", padding: "8px 10px 4px" }}>Help centre</div>
          <button onClick={onCloseHelp} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: 0, background: "transparent", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%" }}>
            <span style={{ width: 26, height: 24, flex: "none", borderRadius: 8, background: "#F1F2F7", color: "#4A5060", display: "grid", placeItems: "center", fontSize: 12 }}>?</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Documentation & guides</span>
          </button>
          <button onClick={onCloseHelp} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: 0, background: "transparent", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%" }}>
            <span style={{ width: 26, height: 24, flex: "none", borderRadius: 8, background: "#F1F2F7", color: "#4A5060", display: "grid", placeItems: "center", fontSize: 12 }}>âŒ˜K</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Keyboard shortcuts</span>
          </button>
          <button onClick={onCloseHelp} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: 0, background: "transparent", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%" }}>
            <span style={{ width: 26, height: 24, flex: "none", borderRadius: 8, background: "#F1F2F7", color: "#4A5060", display: "grid", placeItems: "center", fontSize: 12 }}>@</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Contact support</span>
          </button>
        </div>
      )}
    </>
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