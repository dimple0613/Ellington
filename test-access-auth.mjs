const BASE = process.argv[2] || "http://localhost:3000";
const results = [];
let pass = 0, fail = 0;

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@gmail.com", password: "Admin123" }),
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const sessionLine = setCookie.find(c => c.startsWith("session="));
  return sessionLine ? sessionLine.split(";")[0] : "";
}

async function check(id, name, r) {
  results.push({ id, name, ...r });
  if (r.pass) pass++; else fail++;
  console.log(`${r.pass ? "PASS" : "FAIL"} ${id} ${name} -> HTTP ${r.status} (expected ${r.expected}) ${r.body}`);
}

async function run() {
  const cookie = await login();
  if (!cookie) { console.log("FATAL: login failed, no cookie"); process.exit(1); }
  console.log(`=== AUTHENTICATED ACCESS TEST — ${BASE} (cookie ok)\n`);

  const routes = [
    ["/dashboard", "dashboard home"],
    ["/dashboard?s=projects", "dashboard projects"],
    ["/dashboard?s=financials", "dashboard financials"],
    ["/dashboard?s=cashflow", "dashboard cashflow"],
    ["/dashboard?s=reports", "dashboard reports"],
    ["/project?s=inventory&scope=WPK", "project inventory"],
    ["/project?s=pricing&scope=WPK", "project pricing"],
    ["/project?s=construction&scope=WPK", "project construction"],
    ["/project?s=unit&unit=WPK-001&scope=WPK", "project unit detail"],
    ["/inventory", "inventory redirect"],
    ["/sales?s=leads", "sales leads"],
    ["/sales?s=booking", "sales booking"],
    ["/sales?s=buyer&name=Rajesh%20Menon", "sales buyer 360"],
    ["/sales?s=brokers", "sales brokers"],
    ["/sales?s=documents", "sales documents"],
    ["/finance?s=payments", "finance payments"],
    ["/finance?s=collections", "finance collections"],
    ["/finance?s=escrow", "finance escrow"],
    ["/finance?s=invoices", "finance invoices"],
    ["/handover?s=pipeline", "handover pipeline"],
    ["/handover?s=snagging", "handover snagging"],
    ["/handover?s=deeds", "handover deeds"],
    ["/system?s=users", "system users"],
    ["/system?s=settings", "system settings"],
    ["/system?s=audit", "system audit"],
    ["/mobile?s=mobile", "mobile app"],
    ["/profile", "profile"],
    ["/inventory", "inventory alias"],
  ];

  for (const [route, label] of routes) {
    const res = await fetch(BASE + route, { redirect: "manual", headers: { Cookie: cookie } });
    const b = await res.text().catch(() => "");
    let expected = 200;
    let passOk = res.status === expected && b.includes("<!DOCTYPE");
    // /inventory client-redirects; server returns a blank page (200)
    if (route === "/inventory") passOk = res.status === 200;
    await check(`L-${label.replace(/[^a-z0-9]/gi, "-").slice(0, 24)}`, `auth ${route}`, {
      status: res.status, expected,
      pass: passOk,
      body: res.status === expected ? (b.includes("<!DOCTYPE") ? "(HTML page)" : b.slice(0, 60)) : `redirect->${res.headers.get("location") || "(none)"}`,
    });
  }

  // Public-only pages WITH cookie -> expect 307 back to /dashboard
  for (const [route, label] of [
    ["/login", "login"],
    ["/forgot-password", "forgot-password"],
    ["/reset-password?token=abc", "reset-password"],
  ]) {
    const res = await fetch(BASE + route, { redirect: "manual", headers: { Cookie: cookie } });
    await check(`Q-${label}`, `auth user on ${route}`, {
      status: res.status, expected: 307,
      pass: res.status === 307 && (res.headers.get("location") || "").startsWith("/dashboard"),
      body: `redirect->${res.headers.get("location")}`,
    });
  }

  console.log(`\n=== ${pass}/${pass + fail} passed ===`);
  if (fail > 0) {
    console.log("Failures:");
    results.filter(r => !r.pass).forEach(f => console.log(`  ${f.id} ${f.name}: got ${f.status}, expected ${f.expected}`));
  }
}

run().catch(e => { console.error(e); process.exit(1); });