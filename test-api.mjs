const BASE = process.argv[2] || "http://localhost:3000";
const results = [];

async function test(id, name, expectedStatus, fn) {
  try {
    const res = await fn();
    const body = await res.text().catch(() => "");
    const match = res.status === expectedStatus;
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    results.push({ id, name, status: res.status, expected: expectedStatus, match });
    console.log(`${match ? "PASS" : "*** FAIL ***"} ${id} ${name} -> ${res.status} (expected ${expectedStatus}) ${JSON.stringify(parsed).slice(0, 150)}`);
  } catch (e) {
    results.push({ id, name, status: 0, expected: expectedStatus, match: false });
    console.log(`*** FAIL *** ${id} ${name} -> ERR ${e.message}`);
  }
}

async function run() {
  console.log(`Testing: ${BASE}\n`);

  await test("01", "login missing pw", 400, async () =>
    fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));

  await test("02", "login wrong pw", 401, async () =>
    fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@gmail.com", password: "wrongpass1" }) }));

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@gmail.com", password: "Admin123" }),
    redirect: "manual"
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  await test("03", "login correct", 200, async () => loginRes);

  const setCookie = loginRes.headers.getSetCookie?.() || [];
  const sessionLine = setCookie.find(c => c.startsWith("session="));
  const cookieHeader = sessionLine ? sessionLine.split(";")[0] : "";
  if (!cookieHeader) {
    console.log("FATAL: no session cookie. Response headers:");
    for (const [k, v] of loginRes.headers.entries()) console.log(`  ${k}: ${v}`);
    return;
  }

  const authed = { Cookie: cookieHeader };

  await test("04", "me with cookie", 200, async () =>
    fetch(`${BASE}/api/auth/me`, { headers: authed }));

  await test("05", "me no cookie", 401, async () =>
    fetch(`${BASE}/api/auth/me`));

  await test("06", "dashboard with cookie", 200, async () =>
    fetch(`${BASE}/api/dashboard`, { headers: authed }));

  await test("07", "dashboard no cookie", 401, async () =>
    fetch(`${BASE}/api/dashboard`));

  await test("08", "inventory with cookie", 200, async () =>
    fetch(`${BASE}/api/inventory`, { headers: authed }));

  await test("09", "inventory no cookie", 401, async () =>
    fetch(`${BASE}/api/inventory`));

  await test("10", "profile PUT name-only", 200, async () =>
    fetch(`${BASE}/api/auth/profile`, {
      method: "PUT", headers: { "Content-Type": "application/json", ...authed },
      body: JSON.stringify({ full_name: "Super Admin", email: "admin@gmail.com" })
    }));

  await test("11", "profile PUT wrong current pw", 401, async () =>
    fetch(`${BASE}/api/auth/profile`, {
      method: "PUT", headers: { "Content-Type": "application/json", ...authed },
      body: JSON.stringify({ email: "new@gmail.com", current_password: "wrongpass1" })
    }));

  await test("12", "forgot known email", 200, async () =>
    fetch(`${BASE}/api/auth/forgot-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@gmail.com" })
    }));

  await test("13", "forgot unknown email", 404, async () =>
    fetch(`${BASE}/api/auth/forgot-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@test.com" })
    }));

  await test("14", "reset garbage token", 400, async () =>
    fetch(`${BASE}/api/auth/reset-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "deadbeef", password: "Admin9!" })
    }));

  await test("15", "logout with cookie", 200, async () =>
    fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: authed }));

  await test("16", "login page", 200, async () =>
    fetch(`${BASE}/login`));

  await test("17", "forgot page", 200, async () =>
    fetch(`${BASE}/forgot-password`));

  await test("18", "reset page", 200, async () =>
    fetch(`${BASE}/reset-password?token=test`));

  await test("19", "dashboard page no auth", 307, async () =>
    fetch(`${BASE}/dashboard`, { redirect: "manual" }));

  await test("20", "profile page no auth", 307, async () =>
    fetch(`${BASE}/profile`, { redirect: "manual" }));

  // Summary
  const passed = results.filter(r => r.match).length;
  const total = results.length;
  const failed = results.filter(r => !r.match);
  console.log(`\n=== ${passed}/${total} passed ===`);
  if (failed.length) {
    console.log("Failures:");
    failed.forEach(f => console.log(`  ${f.id} ${f.name}: got ${f.status}, expected ${f.expected}`));
  }
}

run().catch(e => { console.error(e); process.exit(1); });
