export default function AuthBrandPanel() {
  return (
    <div
      style={{
        display: "none",
        flex: 1.1,
        background: "linear-gradient(160deg,#14161F 0%,#252a3d 58%,#2b2570 100%)",
        color: "#fff",
        padding: "54px 60px",
        position: "relative",
        overflow: "hidden",
      }}
      className="auth-brand-panel"
    >
      <div style={{ position: "absolute", inset: 0, opacity: 0.16, backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,.5), transparent 24%), radial-gradient(circle at 80% 30%, rgba(255,255,255,.35), transparent 22%), radial-gradient(circle at 55% 85%, rgba(79,70,245,.8), transparent 30%)" }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: "#fff", color: "#4F46F5", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15, letterSpacing: "-.02em" }}>EH</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>Ellington</div>
        </div>
        <div style={{ marginTop: "auto", maxWidth: 430 }}>
          <div style={{ fontSize: 40, lineHeight: 1.08, fontWeight: 800, letterSpacing: "-.04em" }}>Own every unit,<br />chasing every dirham.</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.72)", fontWeight: 500, marginTop: 18, lineHeight: 1.6 }}>
            The developer sales console for ORN 21281 — portfolio position, sales, finance, handover and compliance in one secure workspace.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
            {["Sales console", "Escrow reconciliation", "Handover pipeline"].map((t) => (
              <span key={t} style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: "7px 13px", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.16)", color: "#fff" }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 40, marginTop: 48, paddingTop: 26, borderTop: "1px solid rgba(255,255,255,.14)" }}>
          {[
            { v: "AED 1.94B", l: "Portfolio GDV" },
            { v: "850", l: "Units tracked" },
            { v: "89 / 89", l: "Screens verified" },
          ].map((s) => (
            <div key={s.l}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", color: "#4F46F5" }}>
                <span style={{ color: "#fff" }}>{s.v}</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: 600, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}