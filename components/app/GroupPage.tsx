import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Shell, { GroupId } from "../Shell";
import { GROUP_PAGE, GROUP_LABEL } from "../../lib/nav";
import { SCR_TITLES } from "../../lib/screens";
import { PROJECTS } from "../../lib/data";
import { AC } from "../../lib/format";

export function Stub({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "64px 40px", boxShadow: "0 1px 3px rgba(20,22,31,.04)", textAlign: "center", maxWidth: 560, margin: "60px auto" }}>
      <div style={{ width: 60, height: 60, borderRadius: 20, background: "#F3F4F8", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9AA0AE" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M3 10h18M9 10v10"></path></svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#6B7180", fontWeight: 500, marginTop: 8, lineHeight: 1.6 }}>This module is built later in the reference order and will be wired to real data when we reach it.</div>
      <button onClick={onBack} style={{ marginTop: 20, height: 38, borderRadius: 12, background: AC, color: "#fff", border: 0, padding: "0 18px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Back to dashboard</button>
    </div>
  );
}

export default function GroupPage({
  group,
  render,
}: {
  group: GroupId;
  render?: (screen: string, scope: string) => ReactNode;
}) {
  const router = useRouter();
  const s = (typeof router.query.s === "string" ? router.query.s : null) || GROUP_PAGE[group].home;
  const scopeFromUrl = typeof router.query.scope === "string" ? router.query.scope : "ALL";
  const [scope, setScope] = useState(scopeFromUrl);

  useEffect(() => {
    setScope(scopeFromUrl);
  }, [scopeFromUrl]);

  const setScopeAndPush = (code: string) => {
    const q: Record<string, string> = { ...(router.query as Record<string, string>), s };
    if (code === "ALL") delete q.scope;
    else q.scope = code;
    router.replace({ pathname: GROUP_PAGE[group].path, query: q }, undefined, { shallow: true });
  };

  const proj = PROJECTS.find((p) => p.code === scope);
  const projName = proj ? proj.name : "All projects";
  const crumbLabels = group === "portfolio" ? ["Portfolio"] : group === "project" ? ["Portfolio", projName] : ["Portfolio", projName];
  const crumbs = crumbLabels.concat([SCR_TITLES[s] || "Module"]);
  const title = SCR_TITLES[s] || "Module";

  return (
    <Shell group={group} active={s} crumbs={crumbs} scopeCode={group === "portfolio" ? (scope === "ALL" ? "ALL" : scope) : scope} onScope={setScopeAndPush}>
      {render ? render(s, scope) : <Stub title={title} onBack={() => router.push("/dashboard")} />}
    </Shell>
  );
}

export { GROUP_LABEL };