import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AC } from "../../lib/format";
import { fetchJSON } from "../../lib/api";
import { PanelSkeleton } from "../Loading";

type PipeCard = { no: string; buyer: string; meta: string };
type PipeCol = { label: string; count: number; color: string; cards: PipeCard[] };

const PIPE: PipeCol[] = [
  { label: "Payment cleared", count: 0, color: "#34C08A", cards: [] },
  { label: "Snagging scheduled", count: 0, color: AC, cards: [] },
  { label: "Snagging done", count: 0, color: AC, cards: [] },
  { label: "De-snagging", count: 0, color: "#8B7CF6", cards: [] },
  { label: "Utilities", count: 0, color: "#8B7CF6", cards: [] },
  { label: "Documents ready", count: 0, color: "#E2A33C", cards: [] },
  { label: "Title deed issued", count: 0, color: "#E2A33C", cards: [] },
  { label: "Keys handed", count: 0, color: "#0EA5A5", cards: [] },
  { label: "OA onboarded", count: 0, color: "#8A94A6", cards: [] },
];

const BLOCKED: BlockedRow[] = [];

type BlockedRow = { unit: string; buyer: string; reason: string; detail: string; color: string };
type ReadinessRow = { unit_no: string; buyer: string; stage: string; payment_ok: boolean; snags_ok: boolean; docs_ok: boolean; blocked: boolean; reason: string; detail: string };

const STAGE_DAYS: { label: string; days: number }[] = [];

const STAGE_SLUGS = ["payment_cleared", "snagging_scheduled", "snagging_done", "de_snagging", "utilities", "documents_ready", "title_deed_issued", "keys_handed", "oa_onboarded"];

const FORECAST: number[] = [];
const maxF = 1;

export default function PipelineScreen() {
  const router = useRouter();
  const [sel, setSel] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState("");
  const [cards, setCards] = useState<Record<number, PipeCard[]>>({});
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [blocked, setBlocked] = useState<BlockedRow[]>(BLOCKED);
  const [overview, setOverview] = useState<{ total: number; ready: number; blocked: number }>({ total: 0, ready: 0, blocked: 0 });
  const [readyInfo, setReadyInfo] = useState<Record<string, ReadinessRow>>({});
  const [apiError, setApiError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchJSON<{
      pipeline: { unit_no: string; buyer: string; stage: string; meta: string }[];
      readiness: ReadinessRow[];
      overview: { total: number; ready: number; blocked: number };
    }>("/api/handover")
      .then((j) => {
        if (!active) return;
        setLoaded(true);
        if (Array.isArray(j.pipeline)) {
          const byStage: Record<string, PipeCard[]> = {};
          for (const p of j.pipeline) {
            const slug = STAGE_SLUGS.includes(p.stage) ? p.stage : "payment_cleared";
            (byStage[slug] = byStage[slug] || []).push({ no: p.unit_no || "", buyer: p.buyer || "", meta: p.meta || "" });
          }
          setCards((c) => {
            const next = { ...c };
            STAGE_SLUGS.forEach((slug, i) => { if (byStage[slug]) next[i] = byStage[slug]; });
            return next;
          });
          setCounts((c) => {
            const next = { ...c };
            STAGE_SLUGS.forEach((slug, i) => { if (byStage[slug]) next[i] = byStage[slug].length; });
            return next;
          });
        }
        if (Array.isArray(j.readiness)) {
          const info: Record<string, ReadinessRow> = {};
          for (const r of j.readiness) info[r.unit_no] = r;
          setReadyInfo(info);
          setBlocked(
            j.readiness.filter((r) => r.blocked).map((r) => ({
              unit: r.unit_no,
              buyer: r.buyer,
              reason: r.reason,
              detail: r.detail,
              color: r.reason === "Outstanding payment" ? "#E5484D" : r.reason === "Snags open" ? "#E2A33C" : "#8B7CF6",
            }))
          );
        }
        if (j.overview) setOverview(j.overview);
      })
      .catch((e) => {
        if (active) { setLoaded(true); setApiError(e?.message || "Failed to load pipeline"); }
      });
    return () => { active = false; };
  }, []);

  const goSnag = () => router.push({ pathname: "/handover", query: { s: "snagging" } }, undefined, { shallow: true });

  const schedule = () => {
    if (!unit.trim()) return;
    const newCard: PipeCard = { no: unit.trim(), buyer: "\u2014", meta: date.trim() ? "Handover " + date.trim() : "" };
    setCards((c) => ({ ...c, 0: [newCard, ...(c[0] || [])] }));
    setCounts((c) => ({ ...c, 0: (c[0] || 0) + 1 }));
    setOpen(false);
    setNotice("Handover scheduled for " + unit + " on " + date + " \u00b7 added to Payment cleared");
    setTimeout(() => setNotice(""), 3800);
  };

  if (!loaded) {
    return (
      <div>
        <PanelSkeleton headerW={160} rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "#FDECEC", color: "#E5484D", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          Live data unavailable ({apiError}) — columns stay empty until data loads
        </div>
      )}
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Handover pipeline</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Wilton Park Residences \u00b7 a unit cannot pass Payment cleared with any balance outstanding</div>
        </div>
        <button onClick={goSnag} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Open snag list</button>
        <button onClick={() => setOpen(true)} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Schedule handover</button>
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" }}>
        {PIPE.map((col, ci) => (
          <div key={col.label} style={{ width: 206, flex: "none", background: "#EFF0F5", borderRadius: 18, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 6px 12px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, flex: "none", background: col.color }} />
              <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, lineHeight: 1.3 }}>{col.label}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#6B7180" }}>{counts[ci]}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(cards[ci] || []).map((k, ki) => {
                const info = readyInfo[k.no];
                const paymentBlocked = ci === 0 && info && !info.payment_ok;
                return (
                  <div key={k.no + ki} onClick={() => setSel(sel === ci * 100 + ki ? null : ci * 100 + ki)} style={{ background: "#fff", borderRadius: 14, padding: "12px 13px", boxShadow: "0 1px 2px rgba(20,22,31,.05)", cursor: "pointer", border: sel === ci * 100 + ki ? "2px solid " + (paymentBlocked ? "#E5484D" : col.color) : paymentBlocked ? "1px solid #F3C2C6" : "1px solid transparent" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 600, color: paymentBlocked ? "#E5484D" : "#14161F" }}>{k.no}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 6 }}>{k.buyer}</div>
                    <div style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600, marginTop: 4 }}>{k.meta}</div>
                    {paymentBlocked && <div style={{ fontSize: 9.5, fontWeight: 800, color: "#E5484D", marginTop: 7 }}>Blocked · {info.detail}</div>}
                    {!paymentBlocked && sel === ci * 100 + ki && <div style={{ fontSize: 10, fontWeight: 700, color: col.color, marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F2F6" }}>Selected · ready to advance</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 16, marginTop: 18, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Blocked units</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#FDECEC", color: "#E5484D", borderRadius: 8, padding: "3px 9px" }}>{overview.blocked} blocked</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginBottom: 10 }}>Computed live from collections, invoices, snags &amp; title deeds{overview.total ? " \u00b7 " + overview.ready + " of " + overview.total + " ready" : ""}</div>
          {overview.total > 0 && blocked.length === 0 && <div style={{ fontSize: 12, color: "#1F9D6B", fontWeight: 700, padding: "10px 0" }}>All units ready — nothing blocking handover.</div>}
          {!overview.total && <div style={{ fontSize: 12, color: "#9AA0AE", fontWeight: 600, padding: "10px 0" }}>No blocked units yet — computed live once the pipeline loads.</div>}
          {blocked.map((b) => (
            <div key={b.unit} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #F6F7FA" }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, flex: "none", marginTop: 5, background: b.color }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700 }}>{b.unit}</span>
                <span style={{ display: "block", fontSize: 11, color: "#6B7180", fontWeight: 600, marginTop: 2 }}>{b.reason}</span>
              </span>
              <span style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600 }}>{b.buyer} \u00b7 {b.detail}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Average days in stage</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Computed live once units sit in each stage</div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {STAGE_DAYS.length ? (
              STAGE_DAYS.map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 110, fontSize: 11, fontWeight: 600, color: "#4A5060", flex: "none" }}>{s.label}</span>
                  <span style={{ flex: 1, height: 8, borderRadius: 4, background: "#F1F2F6", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", borderRadius: 4, width: (s.days / 21 * 100) + "%", background: s.days > 15 ? "#E2A33C" : AC }} />
                  </span>
                  <span style={{ width: 30, fontSize: 11, fontWeight: 700, color: s.days > 15 ? "#B07B14" : "#4A5060", textAlign: "right" }}>{s.days}d</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9AA0AE" }}>No stage data yet</div>
            )}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Handovers forecast</div>
          <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Next weeks \u00b7 computed live</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 9, height: 150, marginTop: 18 }}>
            {FORECAST.length ? (
              FORECAST.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#4A5060", marginBottom: 4 }}>{v}</span>
                  <span style={{ width: "100%", borderRadius: "6px 6px 0 0", height: (v / maxF * 110) + "px", background: AC }} />
                  <span style={{ fontSize: 9, color: "#9AA0AE", fontWeight: 600, marginTop: 6 }}>W{i + 1}</span>
                </div>
              ))
            ) : (
              <div style={{ flex: 1, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600, color: "#9AA0AE" }}>No forecast yet</div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div onMouseDown={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.42)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "26px 28px", width: "100%", maxWidth: 540, boxShadow: "0 24px 60px rgba(20,22,31,.25)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>Schedule handover</div>
            <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>Pick a completed unit and a handover date. The unit is added to Payment cleared, then flows through snagging, documents and keys.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Unit</div>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit no (e.g. WPK-T1-0211)"
                  style={{ width: "100%", height: 40, borderRadius: 12, border: "1px solid #E4E6EE", background: "#fff", padding: "0 14px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Handover date</div>
                <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. 06 Sep 26"
                  style={{ width: "100%", height: 40, borderRadius: 12, border: "1px solid #E4E6EE", background: "#fff", padding: "0 14px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setOpen(false)} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Cancel</button>
              <button onClick={schedule} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Schedule handover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
