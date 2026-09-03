import { useState } from "react";
import { AC } from "../../lib/format";

type UserRow = { name: string; email: string; role: string; projects: string; lastActive: string; tfa: string; status: string };

const PERMS = ["CRE", "REA", "UPD", "DEL", "APR", "EXP"];
const USERS: UserRow[] = [
  { name: "Khalid Al Fahim", email: "k.fahim@ellington.ae", role: "CEO", projects: "All", lastActive: "Just now", tfa: "Enabled", status: "Active" },
  { name: "Sarah Mitchell", email: "s.mitchell@ellington.ae", role: "Sales Director", projects: "BLG III, WPK", lastActive: "2 h ago", tfa: "Enabled", status: "Active" },
  { name: "Ravi Kumar", email: "r.kumar@ellington.ae", role: "Finance Manager", projects: "All", lastActive: "4 h ago", tfa: "Enabled", status: "Active" },
  { name: "Aisha Nasser", email: "a.nasser@ellington.ae", role: "Sales Agent", projects: "BLG III", lastActive: "1 d ago", tfa: "Disabled", status: "Active" },
  { name: "Omar Saeed", email: "o.saeed@ellington.ae", role: "Project Manager", projects: "WPK", lastActive: "3 d ago", tfa: "Enabled", status: "Active" },
  { name: "Layla Habib", email: "l.habib@ellington.ae", role: "Legal Counsel", projects: "All", lastActive: "5 d ago", tfa: "Enabled", status: "Suspended" },
  { name: "James Park", email: "j.park@ellington.ae", role: "Sales Agent", projects: "BLG III, WPK", lastActive: "1 w ago", tfa: "Disabled", status: "Active" },
];

type PermRow = { module: string; perm: Record<string, boolean> };
const ROLE_PERMS: PermRow[] = [
  { module: "Dashboard", perm: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: true } },
  { module: "Inventory", perm: { CRE: false, REA: true, UPD: true, DEL: false, APR: false, EXP: true } },
  { module: "Sales", perm: { CRE: true, REA: true, UPD: true, DEL: false, APR: false, EXP: true } },
  { module: "Finance", perm: { CRE: true, REA: true, UPD: true, DEL: false, APR: true, EXP: true } },
  { module: "Handover", perm: { CRE: true, REA: true, UPD: true, DEL: false, APR: false, EXP: false } },
  { module: "Settings", perm: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: false } },
];

const FIELDS = [
  { field: "Discount > 3%", override: "Requires Director approval", locked: true },
  { field: "Unit price edit", override: "CEO only", locked: true },
  { field: "Record payment", override: "Self or above", locked: false },
  { field: "Issue notice", override: "Legal counsel", locked: false },
];

const THRESHOLDS = [
  { label: "Discount up to 3%", approver: "Sales Agent", auto: true },
  { label: "Discount 3\u20137%", approver: "Sales Director", auto: false },
  { label: "Discount > 7%", approver: "CEO", auto: false },
  { label: "Payment > AED 500k", approver: "Finance Manager", auto: false },
];

const ROLES = ["CEO", "Sales Director", "Sales Manager", "Finance Manager", "Project Manager", "Sales Agent", "Legal Counsel"];

const PLAIN: Record<string, string> = {
  "Sales Manager": "In plain language: a Sales Manager can hold and release units, approve agent bookings, set discounts up to 5%, and export. They cannot change a price or delete anything.",
  "Sales Agent": "In plain language: a Sales Agent can view inventory, create leads and bookings, and export. They cannot approve discounts or touch finance.",
  "Sales Director": "In plain language: a Sales Director approves discounts up to 8%, manages the sales team and pipeline, and exports. They cannot delete records or change prices.",
  "Finance Manager": "In plain language: a Finance Manager records and approves payments, runs the ledger, and exports. They cannot edit unit prices or release inventory.",
  "CEO": "In plain language: the CEO has full visibility and approval authority across every module, including price edits and final approval.",
  "Project Manager": "In plain language: a Project Manager runs the handover pipeline, snagging and deeds. They cannot touch finance or pricing.",
  "Legal Counsel": "In plain language: Legal approves notices, deeds and disputes. They cannot record payments or edit unit prices.",
};

export default function UsersScreen() {
  const [sel, setSel] = useState(1);
  const [role, setRole] = useState(USERS[1].role);
  const [notice, setNotice] = useState("");
  const [users, setUsers] = useState<UserRow[]>(USERS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [iName, setIName] = useState("");
  const [iEmail, setIEmail] = useState("");
  const [iRole, setIRole] = useState("Sales Agent");
  const [iProj, setIProj] = useState("WPK");
  const [err, setErr] = useState("");
  const [permByRole, setPermByRole] = useState<Record<string, PermRow[]>>(() => {
    const init: Record<string, PermRow[]> = {};
    for (const r of ROLES) init[r] = ROLE_PERMS.map((row) => ({ ...row, perm: { ...row.perm } }));
    return init;
  });

  const user = users[sel];
  const matrix = permByRole[role] || ROLE_PERMS;

  const toggle = (module: string, perm: string) => {
    setPermByRole((prev) => {
      const cur = prev[role].map((row) => row.module === module ? { ...row, perm: { ...row.perm, [perm]: !row.perm[perm] } } : row);
      return { ...prev, [role]: cur };
    });
    setNotice(perm + " toggled " + (matrix.find((m) => m.module === module)?.perm[perm] ? "off" : "on") + " for " + module + " \u00b7 role: " + role);
    setTimeout(() => setNotice(""), 3000);
  };

  const invite = () => {
    if (!iName.trim() || !iEmail.trim()) { setErr("Enter both name and work email"); return; }
    const row: UserRow = { name: iName.trim(), email: iEmail.trim().toLowerCase(), role: iRole, projects: iProj, lastActive: "Just now", tfa: "Disabled", status: "Active" };
    setUsers((u) => [row, ...u]);
    setInviteOpen(false);
    setIName(""); setIEmail(""); setErr("");
    setNotice("Invite sent \u00b7 " + row.email + " \u00b7 " + iRole);
    setTimeout(() => setNotice(""), 3000);
  };

  return (
    <div>
      {notice && <div style={{ background: "#E9F8F1", color: "#1F9D6B", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{notice}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.15 }}>Users &amp; roles</div>
          <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 5 }}>Role-based with per-project scoping \u00b7 7 active users \u00b7 2FA enforced on production</div>
        </div>
        <button onClick={() => setInviteOpen(true)} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Invite user</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 16, alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 96px 1.1fr 82px 72px 72px", gap: 8, padding: "13px 20px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", color: "#9AA0AE", textTransform: "uppercase", background: "#FAFBFD", borderBottom: "1px solid #EDEEF3" }}>
            <span>Name</span><span>Email</span><span>Role</span><span>Projects</span><span>Last active</span><span>2FA</span><span>Status</span>
          </div>
          {users.map((u, i) => (
            <div key={i} onClick={() => { setSel(i); setRole(u.role); }} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 96px 1.1fr 82px 72px 72px", gap: 8, alignItems: "center", padding: "0 20px", height: 46, borderBottom: "1px solid #F6F7FA", cursor: "pointer", background: i === sel ? "#F0EFFE" : undefined }}>
              <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</span>
              <span style={{ fontSize: 11, color: "#6B7180", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: AC }}>{u.role}</span>
              <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.projects}</span>
              <span style={{ fontSize: 10.5, color: "#9AA0AE", fontWeight: 600 }}>{u.lastActive}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: u.tfa === "Enabled" ? "#1F9D6B" : "#E5484D" }}>{u.tfa}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: u.status === "Active" ? "#1F9D6B" : "#E5484D" }}>{u.status}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.015em" }}>Role editor \u00b7 {role}</div>
              <div style={{ fontSize: 11.5, color: "#9AA0AE", fontWeight: 500, marginTop: 3 }}>Permission matrix for {user?.name || "selected user"}</div>
            </div>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ height: 34, borderRadius: 10, border: "1px solid #E4E6EE", padding: "0 10px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: "#fff", color: AC }}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr repeat(6,38px)", gap: 4, fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", color: "#9AA0AE", textTransform: "uppercase", padding: "0 0 8px", borderBottom: "1px solid #EDEEF3" }}>
              <span>Module</span>
              {PERMS.map((p) => <span key={p} style={{ textAlign: "center" }}>{p}</span>)}
            </div>
            {matrix.map((r) => (
              <div key={r.module} style={{ display: "grid", gridTemplateColumns: "1.2fr repeat(6,38px)", gap: 4, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{r.module}</span>
                {PERMS.map((p) => (
                  <span key={p} onClick={() => toggle(r.module, p)} style={{ display: "block", width: 28, height: 16, borderRadius: 9, background: r.perm[p] ? AC : "#DDE0E8", cursor: "pointer", position: "relative", margin: "0 auto" }}>
                    <span style={{ position: "absolute", top: 2, width: 12, height: 12, borderRadius: 7, background: "#fff", left: r.perm[p] ? "14px" : "2px" }} />
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #F1F2F7" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 8 }}>Field-level overrides</div>
            {FIELDS.map((f) => (
              <div key={f.field} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>{f.field}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10.5, color: f.locked ? "#E5484D" : "#6B7180", fontWeight: 600 }}>{f.override}</span>
                  {f.locked && <span style={{ fontSize: 9, fontWeight: 800, background: "#FDECEC", color: "#E5484D", borderRadius: 6, padding: "2px 6px" }}>Locked</span>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #F1F2F7" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 8 }}>Approval thresholds</div>
            {THRESHOLDS.map((t) => (
              <div key={t.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F6F7FA" }}>
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>{t.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700 }}>{t.approver}</span>
                  {t.auto && <span style={{ fontSize: 9, fontWeight: 800, background: "#E9F8F1", color: "#1F9D6B", borderRadius: 6, padding: "2px 6px" }}>Auto</span>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#6B7180", fontWeight: 500, marginTop: 16, lineHeight: 1.65 }}>{PLAIN[role] || PLAIN["Sales Manager"]}</div>
        </div>
      </div>

      {inviteOpen && (
        <div onMouseDown={() => { setInviteOpen(false); setErr(""); }} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.42)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "26px 28px", width: "100%", maxWidth: 500, boxShadow: "0 24px 60px rgba(20,22,31,.25)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>Invite user</div>
            <div style={{ fontSize: 12.5, color: "#6B7180", fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>Send an invite email to join the workspace with role-based access and per-project scoping.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Full name</div>
                <input value={iName} onChange={(e) => setIName(e.target.value)} placeholder="e.g. Dana Osei" style={{ width: "100%", boxSizing: "border-box", height: 40, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 12px", fontSize: 12.5, fontWeight: 600, outline: "none" }} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Work email</div>
                <input value={iEmail} onChange={(e) => setIEmail(e.target.value)} placeholder="e.g. d.osei@ellington.ae" style={{ width: "100%", boxSizing: "border-box", height: 40, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 12px", fontSize: 12.5, fontWeight: 600, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Role</div>
                  <select value={iRole} onChange={(e) => setIRole(e.target.value)} style={{ width: "100%", height: 40, borderRadius: 12, border: "1px solid #E4E6EE", padding: "0 10px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", background: "#fff" }}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#9AA0AE", textTransform: "uppercase", marginBottom: 6 }}>Projects</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["All", "WPK", "BLG III"].map((p) => (
                      <span key={p} onClick={() => setIProj(p)} style={{ fontSize: 11.5, fontWeight: 700, padding: "10px 12px", borderRadius: 10, cursor: "pointer", background: iProj === p ? AC : "#F1F2F6", color: iProj === p ? "#fff" : "#4A5060" }}>{p}</span>
                    ))}
                  </div>
                </div>
              </div>
              {err && <div style={{ fontSize: 11.5, fontWeight: 600, color: "#E5484D" }}>{err}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => { setInviteOpen(false); setErr(""); }} style={{ height: 38, borderRadius: 12, border: "1px solid #EDEEF3", background: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#4A5060", cursor: "pointer" }}>Cancel</button>
              <button onClick={invite} style={{ height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 20px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Send invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
