import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Shell, { GroupId } from "../Shell";
import { GROUP_PAGE, GROUP_LABEL } from "../../lib/nav";
import { SCR_TITLES } from "../../lib/screens";
import { PROJECTS } from "../../lib/data";
import { AC } from "../../lib/format";
import { Stub } from "./Stub";

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