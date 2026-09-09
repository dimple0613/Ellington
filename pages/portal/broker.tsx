import { useEffect, useMemo, useState } from "react";
import { PortalChrome, PortalLoginCard, PortalStatusPill, PORTAL_ACCENT } from "../../components/portal/PortalChrome";
import { money } from "../../lib/format";

type Me = { name: string; orn: string; status: string; commission_rate: string; alloc_units: number; deals: number; accrued: number; paid: number };
type InvUnit = { id: number; no: string; type: string; beds: number; area: number; view: string; price: number; project_code: string; project_name: string; reserved: boolean };
type ResRow = { id: number; unit_no: string; project_code: string; buyer_name: string; buyer_mobile: string; commission_pct: number; status: string; created_at: string };

function PortalBroker() {
  const [phase, setPhase] = useState<"loading" | "login" | "data">("loading");
  const [me, setMe] = useState<Me>({ name: "", orn: "", status: "", commission_rate: "", alloc_units: 0, deals: 0, accrued: 0, paid: 0 });
  const [inventory, setInventory] = useState<InvUnit[]>([]);
  const [reservations, setReservations] = useState<ResRow[]>([]);
  const [notice, setNotice] = useState("");

  const load = (silent?: boolean) => {
    if (!silent) setPhase("loading");
    fetch("/api/portal/broker", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) { setPhase("login"); return; }
        const d = json.data;
        setMe(d.me);
        setInventory(Array.isArray(d.inventory) ? d.inventory : []);
        setReservations(Array.isArray(d.reservations) ? d.reservations : []);
        setPhase("data");
      })
      .catch(() => setPhase("login"));
  };

  useEffect(() => { load(); }, []);

  const unpaid = useMemo(() => Math.max(0, Number(me.accrued) - Number(me.paid)), [me]);
  const avail = useMemo(() => inventory.filter((u) => !u.reserved), [inventory]);

  const reserve = async (u: InvUnit) => {
    try {
      const res = await fetch("/api/portal/broker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reserve", unit_id: u.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) { setNotice(json?.error || "Could not reserve unit"); return; }
      setNotice(u.no + " reserved — pending developer approval");
      load(true);
    } catch {
      setNotice("Request failed");
    } finally { setTimeout(() => setNotice(""), 6000); }
  };

  const logout = async () => {
    await fetch("/api/portal/broker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setPhase("login");
  };

  const cell = { fontSize: 12, fontWeight: 600, color: "#4A5060" } as const;

  return (
    <PortalChrome kind="broker">
      {phase === "login" && <PortalLoginCard kind="broker" onLogin={() => load()} />}
      {phase === "loading" && <div style={{ textAlign: "center", padding: "90px 0", fontSize: 13, color: "#9AA0AE", fontWeight: 600 }}>Loading your portal…</div>}

      {phase === "data" && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 22 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: "#9AA0AE", fontWeight: 600 }}>Welcome back,</div>
              <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>{me.name}</div>
              <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4 }}>ORN {me.orn} · commission {me.commission_rate}</div>
            </div>
            <button onClick={() => load(true)} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>↻ Refresh</button>
            <button onClick={logout} style={{ height: 38, borderRadius: 12, border: 0, background: "#14161F", color: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Sign out</button>
          </div>

          {notice && <div style={{ background: notice.includes("reserved") ? "#E9F8F1" : "#FDECEC", color: notice.includes("reserved") ? "#1F9D6B" : "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
            {[["Allocated inventory", String(me.alloc_units), "units in your allocation"], ["Available now", String(avail.length), inventory.length + " total in portfolio"], ["Deals in progress", String(me.deals), "across all agencies"], ["Commission accrued", money(me.accrued), money(unpaid) + " unpaid"]].map(([l, v, n]) => (
              <div key={l} style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase" }}>{l}</div>
                <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.02em", marginTop: 5 }}>{v}</div>
                <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600, marginTop: 3 }}>{n}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3" }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 3 }}>Live availability</div>
              <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginBottom: 12 }}>First come, first served — reserve to hold a unit for your buyer.</div>
              <div style={{ maxHeight: 520, overflow: "auto" }}>
                {inventory.map((u) => (
                  <div key={u.no} style={{ display: "grid", gridTemplateColumns: "130px 64px 1fr 70px 1fr 108px", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F6F7FA" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 700 }}>{u.no}</span>
                    <span style={cell}>{u.type} · {u.beds}B</span>
                    <span style={cell}>{u.project_name}</span>
                    <span style={cell}>{Number(u.area).toLocaleString("en-US")} sq.ft</span>
                    <span style={{ textAlign: "right", fontSize: 12, fontWeight: 700 }}>{money(Number(u.price))}</span>
                    {u.reserved ? (
                      <PortalStatusPill status="reserved" />
                    ) : (
                      <button onClick={() => reserve(u)} style={{ height: 30, borderRadius: 9, border: 0, background: PORTAL_ACCENT, color: "#fff", fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Reserve</button>
                    )}
                  </div>
                ))}
                {inventory.length === 0 && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "16px 0", textAlign: "center" }}>No available inventory yet.</div>}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3" }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>My reservations</div>
                {reservations.length === 0 && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "8px 0" }}>Reserve a unit from the availability list to see it here.</div>}
                {reservations.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #F6F7FA" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700 }}>{r.unit_no}</div>
                      <div style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600 }}>{r.project_code} · {String(r.created_at || "").slice(0, 10)}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600 }}>{r.commission_pct}%</span>
                    <PortalStatusPill status={r.status} />
                  </div>
                ))}
              </div>

              <div style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3" }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em", marginBottom: 12 }}>Commission</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, borderRadius: 14, background: "#E9F8F1", padding: "14px 16px" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#1F9D6B", textTransform: "uppercase" }}>Accrued</div>
                    <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>{money(me.accrued)}</div>
                  </div>
                  <div style={{ flex: 1, borderRadius: 14, background: "#F0EFFE", padding: "14px 16px" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#6B3FA8", textTransform: "uppercase" }}>Paid out</div>
                    <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>{money(me.paid)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid #F6F7FA" }}>
                  <span style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 600 }}>Unpaid balance</span>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{money(unpaid)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalChrome>
  );
}

export default PortalBroker;