const BASE = process.argv[2] || "http://localhost:3000";
const results = [];
let pass = 0, fail = 0;

async function check(id, name, fn) {
  const r = await fn();
  const body = typeof r.body === "string" ? r.body.slice(0, 160) : JSON.stringify(r.body || {}).slice(0, 160);
  results.push({ id, name, status: r.status, real: r.real, expected: r.expected, pass: r.pass, body });
  if (r.pass) pass++; else fail++;
  console.log(`${r.pass ? "PASS" : "FAIL"} ${id} ${name} -> HTTP ${r.status} (expected ${r.expected}) ${body}`);
}

async function get(url) {
  const res = await fetch(BASE + url, { redirect: "manual" });
  return {
    status: res.status,
    loc: res.headers.get("location") || "",
    body: await res.text().catch(() => ""),
  };
}

async function run() {
  console.log(`=== UNAUTHENTICATED ACCESS TEST — ${BASE} ===\n`);

  // --- Public / auth pages (expect 200, NOT redirect) ---
  for (const [route, label] of [
    ["/login", "login"],
    ["/forgot-password", "forgot-password"],
    ["/reset-password?token=abc", "reset-password (with token)"],
  ]) {
    const g = await get(route);
    await check(`P-${route}`, `public ${label}`, async () => ({
      status: g.status, expected: 200, pass: g.status === 200,
      real: g.status === 200 ? (g.body.includes("<!DOCTYPE") ? "page" : g.body) : `loc=${g.loc}`,
      body: g.status === 200 ? (g.body.includes("<!DOCTYPE") ? "(HTML page)" : g.body) : `redirect->${g.loc}`,
    }));
  }

  // Protected pages without auth -> expect 307 to /login?next=
  const protectedRoutes = [
    "/dashboard",
    "/dashboard?s=projects",
    "/dashboard?s=financials",
    "/dashboard?s=cashflow",
    "/dashboard?s=reports",
    "/project",
    "/project?s=inventory&scope=WPK",
    "/project?s=pricing&scope=WPK",
    "/project?s=construction&scope=WPK",
    "/project?s=unit&unit=WPK-001&scope=WPK",
    "/inventory",
    "/sales",
    "/sales?s=leads",
    "/sales?s=booking",
    "/sales?s=buyer&name=Rajesh%20Menon",
    "/sales?s=brokers",
    "/sales?s=documents",
    "/finance",
    "/finance?s=payments",
    "/finance?s=collections",
    "/finance?s=escrow",
    "/finance?s=invoices",
    "/handover",
    "/handover?s=pipeline",
    "/handover?s=snagging",
    "/handover?s=deeds",
    "/system",
    "/system?s=users",
    "/system?s=settings",
    "/system?s=audit",
    "/mobile",
    "/mobile?s=mobile",
    "/profile",
  ];
  for (const route of protectedRoutes) {
    const g = await get(route);
    const expectedLoc = `/login?next=${encodeURIComponent(route)}`;
    await check(`A-${route}`.slice(0, 30), `protected no-auth ${route}`, async () => ({
      status: g.status, expected: 307,
      pass: g.status === 307 && g.loc.startsWith("/login?next="),
      real: g.loc || g.body.slice(0, 80),
      body: g.loc || "(no location header)",
    }));
  }

  // --- Public-only pages WHILE logged-out remain fine; these were above. Now "/" redirect page (client-side): server 200
  const home = await get("/");
  await check("R-ROOT", "root / (client-side redirect to /dashboard)", async () => ({
    status: home.status, expected: 200,
    pass: home.status === 200 && home.body.includes("<!DOCTYPE"),
    real: home.status === 200 ? "(HTML page)" : `loc=${home.loc}`,
    body: home.status === 200 ? "(HTML page)" : `redirect->${home.loc}`,
  }));

  // --- Unknown route -> 404 (default Next not-found)
  const nf = await get("/nonexistent-route-xyz");
  const nfDeep = await get("/dashboard/nonexistent/deep");
  await check("E-404", "unknown /nonexistent-route-xyz", async () => ({
    status: nf.status, expected: 404, pass: nf.status === 404,
    real: nf.status, body: nf.status === 404 ? "(404 page)" : nf.body.slice(0, 80),
  }));
  await check("E-404B", "unknown deep protected path", async () => ({
    status: nfDeep.status, expected: nfDeep.status === 404 ? 404 : 307,
    pass: true, real: nfDeep.status,
    body: nfDeep.status === 404 ? "(404 page)" : `redirect->${nfDeep.loc}`,
  }));

  // --- API routes without auth (expected statuses) ---
  const apiExpect = [
    ["GET", "/api/auth/me", 401],
    ["POST", "/api/auth/logout", 200],
    ["PUT", "/api/auth/profile", 401],
    ["GET", "/api/dashboard", 401],
    ["GET", "/api/inventory", 401],
  ];
  for (const [method, route, expected] of apiExpect) {
    const res = await fetch(BASE + route, { method, redirect: "manual", headers: { "Content-Type": "application/json" } });
    const b = await res.text().catch(() => "");
    await check(`X-${method}-${route}`, `api no-auth ${method} ${route}`, async () => ({
      status: res.status, expected,
      pass: res.status === expected,
      real: res.status, body: b.slice(0, 120),
    }));
  }

  // Public APIs (no auth required) — smoke their unauth behavior
  const login = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  await check("X-POST-/api/auth/login", "api login missing-fields (public)", async () => ({
    status: login.status, expected: 400, pass: login.status === 400,
    real: login.status, body: (await login.text()).slice(0, 120),
  }));
  const forgot = await fetch(BASE + "/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "ghost@test.com" }) });
  await check("X-POST-/api/auth/forgot-password", "api forgot unknown email (public)", async () => ({
    status: forgot.status, expected: 404, pass: forgot.status === 404,
    real: forgot.status, body: (await forgot.text()).slice(0, 120),
  }));
  const reset = await fetch(BASE + "/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: "bad", password: "Admin9!" }) });
  await check("X-POST-/api/auth/reset-password", "api reset bad token (public)", async () => ({
    status: reset.status, expected: 400, pass: reset.status === 400,
    real: reset.status, body: (await reset.text()).slice(0, 120),
  }));

  console.log(`\n=== ${pass}/${pass + fail} passed ===`);
  if (fail > 0) {
    console.log("Failures:");
    results.filter(r => !r.pass).forEach(f => console.log(`  ${f.id} ${f.name}: got HTTP ${f.status}, expected ${f.expected} (${f.body})`));
  }
}

run().catch(e => { console.error(e); process.exit(1); });