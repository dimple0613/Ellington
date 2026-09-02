import type { GroupId } from "../components/Shell";

export const GROUP_PAGE: Record<GroupId, { path: string; home: string }> = {
  portfolio: { path: "/dashboard", home: "dashboard" },
  project: { path: "/project", home: "inventory" },
  sales: { path: "/sales", home: "leads" },
  finance: { path: "/finance", home: "payments" },
  handover: { path: "/handover", home: "pipeline" },
  system: { path: "/system", home: "users" },
  mobile: { path: "/mobile", home: "mobile" },
};

export const GROUP_LABEL: Record<GroupId, string> = {
  portfolio: "Portfolio",
  project: "Project",
  sales: "Sales",
  finance: "Finance",
  handover: "Handover",
  system: "System",
  mobile: "Executive app",
};

export function screenUrl(screen: string, group: GroupId, scope?: string) {
  const q: Record<string, string> = { s: screen };
  if (scope && scope !== "ALL") q.scope = scope;
  return { pathname: GROUP_PAGE[group].path, query: q };
}

export function groupUrl(group: GroupId, scope?: string) {
  return screenUrl(GROUP_PAGE[group].home, group, scope);
}