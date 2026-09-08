// RBAC runtime test: exercises per-role access across APIs and page routes.
// Uses a raw Node cookie jar against next start :3000.
const BASE = "http://localhost:3000";

let pass = 0, fail = 0;
function record(name, ok, detail = "") {
  if (ok) { pass++; console.log(`PASS ${name}${detail ? " :: " + detail : ""}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? " :: " + detail : ""}`); }
}

function cookieFromSetCookie(r) {
  let values;
  try { values = r.headers.getSetCookie?.() || []; }
  catch { const v = r.headers.get("set-cookie"); values = v ? [v] : []; }
  if (!Array.isArray(values)) values = [values];
  const s = values.find((x) => x.startsWith("session="));
  return s ? s.split(";")[0] : "";
}

function jar(cookie) {
  return { Cookie: cookie || "" };
}

async function login(email, pwd) {
  const r = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: pwd }),
    redirect: "manual",
  });
  return r;
}

async function api(cookie, path, method = "GET", body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { ...jar(cookie), "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  return r;
}

async function page(cookie, path) {
  const r = await fetch(BASE + path, {
    headers: jar(cookie),
    redirect: "manual",
  });
  return r;
}

async function seedRole(connStr, role) {
  const { Client } = await import("pg");
  const c = new Client({ connectionString: connStr });
  await c.connect();
  await c.query("UPDATE admins SET role=$1 WHERE email='admin@gmail.com'", [role]);
  await c.end();
}

const CONN = "postgresql://postgres:postgres@localhost:5432/developer_inventory";

async function main() {
  const adminEmail = "admin@gmail.com";
  const adminPwd = "Admin123";

  // --- super_admin baseline ---
  await seedRole(CONN, "super_admin");
  let r = await login(adminEmail, adminPwd);
  const cookie = cookieFromSetCookie(r);
  record("super_admin login", r.status === 200);

  for (const [p, name, expected] of [
    ["/api/dashboard", "api/dashboard", 200],
    ["/api/inventory", "api/inventory", 200],
  ]) {
    const rr = await api(cookie, p);
    record(`super_admin ${name}`, rr.status === expected, `status=${rr.status}`);
  }
  for (const [p, name] of [
    ["/dashboard", "page /dashboard"],
    ["/system", "page /system"],
    ["/finance", "page /finance"],
  ]) {
    const rr = await page(cookie, p);
    record(`super_admin ${name}`, rr.status === 200, `status=${rr.status}`);
  }

  // --- viewer: Settings denied, inventory allowed, dashboard allowed ---
  await seedRole(CONN, "viewer");
  r = await login(adminEmail, adminPwd);
  const vCookie = cookieFromSetCookie(r);
  record("viewer login", r.status === 200);

  const vDash = await api(vCookie, "/api/dashboard");
  record("viewer api/dashboard (Dashboard REA=true)", vDash.status === 200, `status=${vDash.status}`);
  const vInv = await api(vCookie, "/api/inventory");
  record("viewer api/inventory (Inventory REA=true)", vInv.status === 200, `status=${vInv.status}`);

  const vSystem = await page(vCookie, "/system");
  record("viewer page /system -> 403 redirect", vSystem.status === 307 && (vSystem.headers.get("location") || "").includes("/403"), `status=${vSystem.status}, loc=${vSystem.headers.get("location")}`);

  // --- ops: finance denied, dashboard allowed ---
  await seedRole(CONN, "ops");
  r = await login(adminEmail, adminPwd);
  const oCookie = cookieFromSetCookie(r);
  record("ops login", r.status === 200);
  const oFin = await page(oCookie, "/finance");
  record("ops page /finance -> 403 redirect", oFin.status === 307 && (oFin.headers.get("location") || "").includes("/403"), `status=${oFin.status}, loc=${oFin.headers.get("location")}`);
  const oSys = await page(oCookie, "/system");
  record("ops page /system -> 403 redirect", oSys.status === 307 && (oSys.headers.get("location") || "").includes("/403"), `status=${oSys.status}, loc=${oSys.headers.get("location")}`);
  const oFinApi = await api(oCookie, "/api/inventory"); // ops has inventory REA
  record("ops api/inventory (Inventory REA=true)", oFinApi.status === 200, `status=${oFinApi.status}`);

  // --- finance: dashboard allowed ---
  await seedRole(CONN, "finance");
  r = await login(adminEmail, adminPwd);
  const fCookie = cookieFromSetCookie(r);
  record("finance login", r.status === 200);
  const fDash = await api(fCookie, "/api/dashboard");
  record("finance api/dashboard (Dashboard REA=true)", fDash.status === 200, `status=${fDash.status}`);
  const fSys = await page(fCookie, "/system");
  record("finance page /system -> 403 redirect", fSys.status === 307 && (fSys.headers.get("location") || "").includes("/403"), `status=${fSys.status}, loc=${fSys.headers.get("location")}`);

  // --- restore super_admin ---
  await seedRole(CONN, "super_admin");
  r = await login(adminEmail, adminPwd);
  const sCookie = cookieFromSetCookie(r);
  const restored = await api(sCookie, "/api/dashboard");
  record("restore super_admin dashboard 200", restored.status === 200, `status=${restored.status}`);

  console.log(`\n=== ${pass}/${pass + fail} passed ===`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });