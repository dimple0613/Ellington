import { useEffect, useMemo, useState } from "react";
import { PortalChrome, PortalLoginCard, PortalStatusPill, PORTAL_ACCENT } from "../../components/portal/PortalChrome";
import { money } from "../../lib/format";

type UnitRow = { id: number; no: string; type: string; beds: number; area: number; view: string; status: string; price: number; project_code: string; project_name: string };
type ScheduleRow = { unit_no: string; label: string; pct: number; amount: number; paid: boolean };
type ReceiptRow = { method: string; amount: number; reference: string; received_at: string };
type DocRow = { doc_type: string; ref: string; status: string; generated_at: string };
type StageRow = { milestone: string; status: string; planned: number; actual: number };

function PortalBuyer() {
  const [phase, setPhase] = useState<"loading" | "login" | "data">("loading");
  const [me, setMe] = useState<{ name: string; phone: string; kyc: string }>({ name: "", phone: "", kyc: "" });
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = (silent?: boolean) => {
    if (!silent) setPhase("loading");
    fetch("/api/portal/buyer", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) { setPhase("login"); return; }
        const d = json.data;
        setMe(d.me);
        setUnits(Array.isArray(d.units) ? d.units : []);
        setSchedule(Array.isArray(d.schedule) ? d.schedule : []);
        setReceipts(Array.isArray(d.receipts) ? d.receipts : []);
        setDocs(Array.isArray(d.documents) ? d.documents : []);
        setStages(Array.isArray(d.construction) ? d.construction : []);
        setPhase("data");
      })
      .catch(() => setPhase("login"))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => { load(); }, []);

  const committed = useMemo(() => units.reduce((a, u) => a + Number(u.price || 0), 0), [units]);
  const paid = useMemo(() => receipts.reduce((a, r) => a + Number(r.amount || 0), 0), [receipts]);
  const nextDue = useMemo(() => schedule.find((s) => !s.paid), [schedule]);
  const overall = useMemo(() => {
    const done = stages.filter((s) => s.status === "certified");
    return stages.length ? Math.round((done.length / stages.length) * 100) : Math.round(Math.max(0, ...stages.map((s) => Number(s.actual) || 0)));
  }, [stages]);

  const logout = async () => {
    await fetch("/api/portal/buyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setPhase("login");
  };

  const cell = { fontSize: 12, fontWeight: 600, color: "#4A5060" } as const;

  return (
    <PortalChrome kind="buyer">
      {phase === "login" && <PortalLoginCard kind="buyer" onLogin={() => load()} />}

      {phase === "loading" && <div style={{ textAlign: "center", padding: "90px 0", fontSize: 13, color: "#9AA0AE", fontWeight: 600 }}>Loading your portal…</div>}

      {phase === "data" && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 22 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: "#9AA0AE", fontWeight: 600 }}>Welcome back,</div>
              <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>{me.name}</div>
              <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4 }}>KYC {me.kyc === "cleared" ? "cleared" : "pending"} · {me.phone}</div>
            </div>
            <button onClick={() => { setRefreshing(true); load(true); }} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: refreshing ? "default" : "pointer" }}>{refreshing ? "Refreshing…" : "↻ Refresh"}</button>
            <button onClick={logout} style={{ height: 38, borderRadius: 12, border: 0, background: "#14161F", color: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Sign out</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
            {[["Units", String(units.length), units.length + " on your reservation"], ["Committed", money(committed), "net price across units"], ["Paid so far", money(paid), receipts.length + " receipts"], ["Next milestone", nextDue ? money(nextDue.amount) : "—", nextDue ? nextDue.label : "All settled"]].map(([l, v, n]) => (
              <div key={l} style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{l}</div>
                <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.02em", marginTop: 5 }}>{v}</div>
                <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600, marginTop: 3 }}>{n}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3" }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>My units</div>
                {units.length === 0 && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "10px 0" }}>No units assigned to you yet.</div>}
                {units.map((u) => (
                  <div key={u.no} style={{ display: "grid", gridTemplateColumns: "150px 70px 1fr 1fr 80px auto", gap: 10, alignItems: "center", padding: "11px 0", borderBottom: "1px solid #F6F7FA", fontSize: 12 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{u.no}</span>
                    <span style={cell}>{u.type} · {u.beds}B</span>
                    <span style={cell}>{u.project_name}</span>
                    <span style={cell}>{Number(u.area || 0).toLocaleString("en-US")} sq.ft · {u.view}</span>
                    <span style={cell}>{money(Number(u.price))}</span>
                    <PortalStatusPill status={u.status} />
                  </div>
                ))}
              </div>

              <div style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3" }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 3 }}>Payment schedule</div>
                <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginBottom: 12 }}>Milestone plan is based on your project's payment terms.</div>
                {schedule.length === 0 && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "10px 0" }}>No schedule computed yet.</div>}
                {schedule.map((s, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "110px 1.4fr 70px 1fr 70px", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: "1px solid #F6F7FA" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: "#6B7180" }}>{s.unit_no}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</span>
                    <span style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600 }}>{s.pct}%</span>
                    <span style={{ textAlign: "right", fontSize: 12, fontWeight: 700 }}>{money(s.amount)}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", textAlign: "center", background: s.paid ? "#E9F8F1" : "#FDF4E5", color: s.paid ? "#1F9D6B" : "#B07B14" }}>{s.paid ? "Paid" : "Due"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3" }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>Construction progress</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.04em" }}>{overall}%</span>
                  <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 600 }}>overall complete</span>
                </div>
                <div style={{ height: 9, borderRadius: 6, background: "#F1F2F6", overflow: "hidden", margin: "12px 0 16px" }}>
                  <div style={{ height: "100%", borderRadius: 6, background: `linear-gradient(90deg,#827CCE,${PORTAL_ACCENT})`, width: overall + "%", transition: "width .4s ease" }} />
                </div>
                {stages.map((s) => (
                  <div key={s.milestone} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #F6F7FA" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{s.milestone}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.status === "certified" ? "#1F9D6B" : "#B07B14" }}>{s.status === "certified" ? "Certified" : s.status === "forecast" ? "Forecast" : s.status}</span>
                  </div>
                ))}
                {stages.length === 0 && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "6px 0" }}>Construction milestones not published yet.</div>}
              </div>

              <div style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3" }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>Documents</div>
                {docs.length === 0 && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "8px 0" }}>Documents will appear here as they are issued.</div>}
                {docs.map((d, i) => (
                  <div key={d.ref} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i === docs.length - 1 ? "0" : "1px solid #F6F7FA" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F0EFFE", color: PORTAL_ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 10 }}>{d.doc_type.slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{d.doc_type}</div>
                      <div style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600 }}>{d.ref} · {String(d.generated_at || "").slice(0, 10)}</div>
                    </div>
                    <PortalStatusPill status={d.status} />
                  </div>
                ))}
              </div>

              <div style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3" }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>Recent receipts</div>
                {receipts.slice(0, 6).map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i === Math.min(receipts.length, 6) - 1 ? "0" : "1px solid #F6F7FA" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{money(Number(r.amount))}</span>
                    <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{r.method}</span>
                    <span style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600 }}>{String(r.received_at || "").slice(0, 10)}</span>
                  </div>
                ))}
                {receipts.length === 0 && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "6px 0" }}>No receipts recorded yet.</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalChrome>
  );
}

export default PortalBuyer;