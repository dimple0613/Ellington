import { useMemo, useState } from "react";
import { AC, compact, money } from "../../lib/format";
import { ST, UnitStatus, UNITS, Unit } from "../../lib/data";

type View = "stack" | "plate" | "list" | "cards";

const VIEWS: View[] = ["stack", "plate", "list", "cards"];
const VIEW_LABEL: Record<View, string> = {
  stack: "Stack plan",
  plate: "Floor plate",
  list: "List",
  cards: "Cards",
};

const CHIPS: [string, string][] = [
  ["Typology", "All 5"],
  ["Beds", "1\u20133"],
  ["Floors", "1\u201345"],
  ["Price", "AED 1.0\u20134.2M"],
  ["View", "Any"],
  ["Agent", "Any"],
];

const psfMin = 1435 + 13;
const psfMax = 1610 + 45 * 13;

function heatColor(psf: number): string {
  const t = Math.max(0, Math.min(1, (psf - psfMin) / (psfMax - psfMin)));
  const A = [240, 239, 254];
  const B = [130, 124, 206];
  return (
    "rgb(" +
    A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",") +
    ")"
  );
}

export function exportedRows(units: Unit[]) {
  const head = ["Unit", "Typology", "Floor", "Sq.ft", "AED/ft", "Price", "View", "Status", "Buyer"];
  const body = units.map((u) =>
    [u.id, u.typ, "L" + u.f, u.area.toLocaleString("en-US"), u.psf.toLocaleString("en-US"), u.price.toLocaleString("en-US"), u.view, u.status, u.buyer]
      .map((v) => '"' + v.replace(/"/g, '"') + '"')
      .join(",")
  );
  return head.join(",") + "\n" + body.join("\n");
}

export default function InventoryScreen({
  scope = "ALL",
  onSelectUnit,
}: {
  scope?: string;
  onSelectUnit?: (id: string) => void;
}) {
  const [view, setView] = useState<View>("stack");
  const [filter, setFilter] = useState<string>("all");
  const [heat, setHeat] = useState(false);

  const units = useMemo(() => {
    const list = filter === "all" ? UNITS : UNITS.filter((u) => u.status === filter);
    return list.slice(0, 120);
  }, [filter]);

  const counts = useMemo(() => {
    const c: Record<string, { n: number; v: number }> = {};
    UNITS.forEach((u) => {
      c[u.status] = c[u.status] || { n: 0, v: 0 };
      c[u.status].n += 1;
      c[u.status].v += u.price;
    });
    c.all = { n: UNITS.length, v: UNITS.reduce((a, u) => a + u.price, 0) };
    return c;
  }, []);

  const floors = useMemo(() => {
    const map: Record<number, Unit[]> = {};
    UNITS.forEach((u) => {
      (map[u.f] = map[u.f] || []).push(u);
    });
    return Object.keys(map)
      .map(Number)
      .sort((a, b) => b - a)
      .map((f) => {
        const cells = (map[f] || []).sort((a, b) => a.pos - b.pos);
        const sold = cells.filter((c) => c.status === "Sold" || c.status === "Booked").length;
        return { f, cells, sold };
      });
  }, []);

  const scopeName = "Tower 1";

  const order = { Available: 0, Held: 1, Reserved: 2, Booked: 3, Sold: 4, Blocked: 5, Overdue: 6 };
  const ordered = [...units].sort((a, b) => order[a.status] - order[b.status]);

  const exportCsv = () => {
    const blob = new Blob([exportedRows(units)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ellington-price-list.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const cellBtn = (u: Unit) => {
    const vis = filter === "all" || u.status === filter;
    const hc = heat ? heatColor(u.psf) : ST[u.status][1];
    const bd = heat ? "transparent" : ST[u.status][0];
    return {
      onClick: () => onSelectUnit && onSelectUnit(u.id),
      title: u.id + " \u00b7 " + u.typ + " \u00b7 " + u.area + " sq.ft \u00b7 " + money(u.price) + " \u00b7 AED " + u.psf + "/sq.ft \u00b7 " + u.status + (u.buyer !== "\u2014" ? " \u00b7 " + u.buyer : ""),
      style: {
        flex: 1,
        height: 44,
        border: 0,
        borderLeft: "3px solid " + bd,
        borderRadius: 9,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 1,
        padding: "0 8px",
        textAlign: "left",
        opacity: vis ? 1 : 0.22,
        background: hc,
        color: "#14161F",
      } as React.CSSProperties,
      meta: heat ? u.psf : u.typ,
    };
  };

  const statusChips = ["all" as const, ...Object.keys(ST)] as const;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Inventory</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>
            {scopeName} \u00b7 {UNITS.length} units
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #EDEEF3", borderRadius: 12, padding: 4 }}>
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                height: 30,
                border: 0,
                borderRadius: 9,
                padding: "0 13px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11.5,
                fontWeight: 700,
                background: view === v ? "#fff" : "transparent",
                color: view === v ? "#14161F" : "#9AA0AE",
                boxShadow: view === v ? "0 1px 3px rgba(20,22,31,.10)" : "none",
              }}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setHeat((h) => !h)}
          style={{
            height: 38,
            borderRadius: 12,
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 700,
            background: heat ? "#F0EFFE" : "#fff",
            border: "1px solid " + (heat ? AC : "#EDEEF3"),
            color: heat ? AC : "#4A5060",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 18h4V9H4zM10 18h4V4h-4zM16 18h4v-6h-4z"></path></svg>
          Price/sq.ft heat
        </button>
        <button
          onClick={exportCsv}
          style={{
            height: 38,
            borderRadius: 12,
            background: "#14161F",
            color: "#fff",
            border: 0,
            padding: "0 16px",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Export price list
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {statusChips.map((k) => {
          const c = counts[k] || { n: 0, v: 0 };
          const on = filter === k;
          const col = k === "all" ? "#14161F" : ST[k as UnitStatus][0];
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                height: 40,
                borderRadius: 13,
                padding: "0 13px",
                display: "flex",
                alignItems: "center",
                gap: 9,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 600,
                background: "#fff",
                border: "1.5px solid " + (on ? col : "#EDEEF3"),
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 4, background: col }}></span>
              <span>
                {k === "all" ? "All units" : k}
              </span>
              <span style={{ fontWeight: 800, fontSize: 12.5 }}>{c.n}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "#9AA0AE" }}>{compact(c.v)}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        {CHIPS.map((c) => (
          <button
            key={c[0]}
            style={{
              height: 32,
              borderRadius: 10,
              border: "1px solid #EDEEF3",
              background: "#fff",
              padding: "0 11px",
              display: "flex",
              alignItems: "center",
              gap: 7,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 11.5,
              fontWeight: 600,
              color: "#4A5060",
            }}
          >
            <span style={{ color: "#9AA0AE" }}>{c[0]}</span>
            <span style={{ fontWeight: 700, color: "#14161F" }}>{c[1]}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9AA0AE" strokeWidth="2.4" strokeLinecap="round"><path d="m6 9 6 6 6-6"></path></svg>
          </button>
        ))}
        <div style={{ flex: 1 }}></div>
        <button
          style={{
            height: 32,
            borderRadius: 10,
            border: "1px dashed #C9CCD8",
            background: "transparent",
            padding: "0 12px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 11.5,
            fontWeight: 700,
            color: "#6B7180",
          }}
        >
          Saved: Sea view 2BRs
        </button>
      </div>

      {view === "stack" && (
        <div style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Stack plan</div>
            <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 500 }}>Hover a unit for detail \u00b7 click to open the drawer</div>
            <div style={{ flex: 1 }}></div>
            {heat && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9AA0AE" }}>AED 1,450</span>
                <span style={{ width: 120, height: 8, borderRadius: 5, background: "linear-gradient(90deg,#F0EFFE,#827CCE)" }}></span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9AA0AE" }}>AED 2,400 /sq.ft</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 560, overflow: "auto", paddingRight: 4 }}>
            {floors.map((f) => (
              <div key={f.f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 40, flex: "none", fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, color: "#9AA0AE", textAlign: "right" }}>L{f.f}</span>
                <span style={{ flex: 1, display: "flex", gap: 3 }}>
                  {f.cells.map((u) => {
                    const b = cellBtn(u);
                    return (
                      <button key={u.id} onClick={b.onClick} title={b.title} style={{ ...b.style, fontFamily: "inherit" }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600 }}>{u.no}</span>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: "#14161F" }}>{b.meta}</span>
                      </button>
                    );
                  })}
                </span>
                <span style={{ width: 52, flex: "none", fontSize: 10, fontWeight: 600, color: "#C2C6D2", textAlign: "left" }}>{f.sold}/6 sold</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "plate" && (
        <div style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Floor plate</div>
            <div style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 500 }}>One floor at a time \u00b7 click a unit to open it</div>
            <div style={{ flex: 1 }}></div>
            {heat && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9AA0AE" }}>AED 1,450</span>
                <span style={{ width: 120, height: 8, borderRadius: 5, background: "linear-gradient(90deg,#F0EFFE,#827CCE)" }}></span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9AA0AE" }}>AED 2,400 /sq.ft</span>
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10, maxHeight: 560, overflow: "auto", paddingRight: 4 }}>
            {ordered.slice(0, 48).map((u) => {
              const b = cellBtn(u);
              return (
                <button key={u.id} onClick={b.onClick} title={b.title} style={{ ...b.style, height: 62, borderLeftWidth: 3 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: "-.01em" }}>{u.id.replace("H21-T1-", "")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#14161F" }}>{u.typ}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: "#14161F", opacity: 0.75 }}>{b.meta} \u00b7 {money(u.price)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "list" && (
        <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(20,22,31,.04)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "96px 84px 52px 78px 70px 82px 74px 92px 96px", gap: 8, padding: "14px 22px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", borderBottom: "1px solid #EDEEF3", background: "#FAFBFD" }}>
            <span>Unit</span><span>Typology</span><span style={{ textAlign: "right" }}>Floor</span><span style={{ textAlign: "right" }}>Sq.ft</span><span style={{ textAlign: "right" }}>AED/ft</span><span style={{ textAlign: "right" }}>Price</span><span>View</span><span>Status</span><span>Buyer</span>
          </div>
          <div style={{ maxHeight: 560, overflow: "auto" }}>
            {ordered.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelectUnit && onSelectUnit(u.id)}
                style={{ width: "100%", display: "grid", gridTemplateColumns: "96px 84px 52px 78px 70px 82px 74px 92px 96px", gap: 8, alignItems: "center", padding: "0 22px", height: 38, border: 0, background: "transparent", borderBottom: "1px solid #F6F7FA", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
              >
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600 }}>{u.id}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#4A5060" }}>{u.typ}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, color: "#6B7180" }}>L{u.f}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, color: "#6B7180" }}>{u.area.toLocaleString("en-US")}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, color: "#6B7180" }}>{u.psf.toLocaleString("en-US")}</span>
                <span style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700 }}>{(u.price / 1e6).toFixed(2) + "M"}</span>
                <span style={{ fontSize: 11, color: "#9AA0AE", fontWeight: 600 }}>{u.view}</span>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 7px", textAlign: "center", background: ST[u.status][1], color: ST[u.status][0] }}>{u.status}</span>
                <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.buyer}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, maxHeight: 560, overflow: "auto", paddingRight: 4 }}>
          {ordered.map((u) => {
            const b = cellBtn(u);
            return (
              <button
                key={u.id}
                onClick={() => onSelectUnit && onSelectUnit(u.id)}
                style={{ textAlign: "left", background: "#fff", borderRadius: 16, padding: "16px 18px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", border: "1px solid #EDEEF3", cursor: "pointer", fontFamily: "inherit" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700 }}>{u.id.replace("H21-T1-", "")}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "3px 8px", background: ST[u.status][1], color: ST[u.status][0] }}>{u.status}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "#6B7180", fontWeight: 600, marginTop: 8 }}>
                  {u.typ} \u00b7 L{u.f} \u00b7 {u.area.toLocaleString("en-US")} sq.ft
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F2F7" }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" }}>Price</div>
                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em", marginTop: 3 }}>{(u.price / 1e6).toFixed(2) + "M"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase" }}>AED/ft</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 3 }}>{u.psf.toLocaleString("en-US")}</div>
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 500, marginTop: 10 }}>
                  {u.view} {u.buyer !== "\u2014" ? "\u00b7 " + u.buyer : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}