import "dotenv/config";
import { Client } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { hashPassword } from "../lib/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/developer_inventory";

const PROJECTS = [
  { code: "BLG", name: "Boullevard Gateway", location: "Dubai Hills", units_total: 28, gdv: 86000000, sold: 86000000, collected: 71400000, due_date: "2026-05-10" },
  { code: "OCH", name: "Opera Court 2", location: "Downtown", units_total: 30, gdv: 58000000, sold: 52200000, collected: 41400000, due_date: "2026-04-30" },
  { code: "SMW", name: "Stratum 3", location: "JVC", units_total: 26, gdv: 47000000, sold: 44650000, collected: 37800000, due_date: "2026-03-15" },
  { code: "BKP", name: "The Bunker 4", location: "JVC", units_total: 22, gdv: 44000000, sold: 41800000, collected: 29700000, due_date: "2026-02-28" },
  { code: "WKP", name: "West Kenn ", location: "Business Bay", units_total: 20, gdv: 39000000, sold: 35100000, collected: 23800000, due_date: "2026-01-20" },
];

const BUYERS = ["Adam", "Fatima Al Mulla", "Khalid Rahman", "Priya Nair", "Omar Haddad", "Sara Bennett", "Ravi Menon", "Layla Hassan"];
const UNIT_TYPES = ["1BR", "2BR", "3BR"];

// H21 flagship tower referenced by the finance seeds (collections / invoices / PDC / refund calculator).
const H21_UNITS = [
  { no: "H21-T1-2705", type: "3BR", beds: 4, area: 1080, price: 4120000 },
  { no: "H21-T1-4102", type: "2BR", beds: 2, area: 860, price: 2860000 },
  { no: "H21-T1-2404", type: "3BR", beds: 3, area: 980, price: 1940000 },
  { no: "H21-T1-1602", type: "2BR", beds: 2, area: 760, price: 1210000 },
  { no: "H21-T1-2202", type: "2BR", beds: 2, area: 720, price: 864000 },
  { no: "H21-T1-3601", type: "2BR", beds: 2, area: 700, price: 640000 },
  { no: "H21-T1-1103", type: "1BR", beds: 1, area: 540, price: 412000 },
  { no: "H21-T1-0904", type: "1BR", beds: 1, area: 500, price: 208000 },
];
const AGENTS = ["Reema", "John D", "Sana", "Yusuf"];

async function main() {
  // ensure database exists
  const dbName = new URL(url).pathname.slice(1) || "developer_inventory";
  const base = new Client({ connectionString: url.replace(`/${dbName}`, "/postgres") });
  await base.connect();
  const exists = await base.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rows.length === 0) await base.query(`CREATE DATABASE "${dbName}"`);
  await base.end();

  const c = new Client({ connectionString: url });
  await c.connect();

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await c.query(schema);

  const cnt = await c.query("SELECT COUNT(*)::int AS n FROM projects");
  if (cnt.rows[0].n > 0) { console.log("already seeded, skipping"); await c.end(); return; }

  // admin — initial default credentials (used only on first install)
  const initialHash = await hashPassword(process.env.INITIAL_ADMIN_PASSWORD || "Admin123");
  await c.query(
    "INSERT INTO admins (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4)",
    ["Super Admin", process.env.INITIAL_ADMIN_EMAIL || "admin@ellington.com", initialHash, "super_admin"]
  );

  // projects + units
  const buyerIds: number[] = [];
  for (const b of BUYERS) {
    const r = await c.query(
      "INSERT INTO buyers (name, kyc_status) VALUES ($1, $2) RETURNING id",
      [b, "cleared"]
    );
    buyerIds.push(r.rows[0].id);
  }

  let bi = 0;
  for (const p of PROJECTS) {
    const pr = await c.query(
      `INSERT INTO projects (code,name,location,status,units_total,gdv,sold,collected,due_date)
       VALUES ($1,$2,$3,'under_construction',$4,$5,$6,$7,$8) RETURNING id`,
      [p.code, p.name, p.location, p.units_total, p.gdv, p.sold, p.collected, p.due_date]
    );
    const projectId = pr.rows[0].id;
    const areaBase = p.code === "BLG" ? 900 : 750;
    for (let u = 1; u <= p.units_total; u++) {
      const type = UNIT_TYPES[u % UNIT_TYPES.length];
      const buyerId = bi < buyerIds.length ? buyerIds[bi] : null;
      const price = Math.round(p.gdv / p.units_total * (0.9 + (u % 20) / 100));
      await c.query(
        `INSERT INTO units (project_id, no, type, beds, area, "view", status, price, buyer_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [projectId, `${p.code}-${String(u).padStart(3,"0")}`, type, Number(type[0]), areaBase + u * 15,
         u % 2 ? "Park" : "Canal", u <= p.units_total * 0.9 ? (u % 3 === 0 ? "booked" : "sold") : "available",
         price, buyerId]
      );
      bi++;
    }
  }

  // H21 flagship tower — referenced by finance seeds (collections / invoices / PDC / refund calculator).
  const h21 = await c.query(
    `INSERT INTO projects (code,name,location,status,units_total,gdv,sold,collected,due_date)
     VALUES ('H21','Harbour Heights I','Palm Jumeirah, Dubai','under_construction',8,12600000,0,0,NULL) RETURNING id`
  );
  const h21Id = h21.rows[0].id;
  for (const u of H21_UNITS) {
    await c.query(
      `INSERT INTO units (project_id, no, type, beds, area, "view", status, price, buyer_id)
       VALUES ($1,$2,$3,$4,$5,'Skyline','sold',$6,NULL)`,
      [h21Id, u.no, u.type, u.beds, u.area, u.price]
    );
  }

  // receipts
  for (const p of PROJECTS) {
    const pr = await c.query("SELECT id FROM projects WHERE code=$1", [p.code]);
    const pid = pr.rows[0].id;
    const parts = 6;
    for (let i = 0; i < parts; i++) {
      await c.query(
        "INSERT INTO receipts (project_id, amount, method, matched, received_at) VALUES ($1,$2,'bank_transfer',true, now() - ($3 || ' days')::interval)",
        [pid, Math.round(p.collected / parts), i]
      );
    }
  }

  // PDC sample cheques on H21 — register shows Held / Presented / Cleared / Bounced.
  const h21r = await c.query("SELECT id FROM projects WHERE code='H21'");
  if (h21r.rows.length) {
    const pid = h21r.rows[0].id;
    await c.query(
      `INSERT INTO receipts (project_id, amount, method, reference, matched, received_at, cheque_no, cheque_date, bank_name, pdc_status) VALUES
       ($1,640000,'cheque','RCP-H21-004706',false,now() - interval '27 days','CHQ-883964','2026-08-12','HSBC','Bounced'),
       ($1,268000,'cheque','RCP-H21-004690',false,now() - interval '12 days','CHQ-883964','2026-08-12','HSBC','Bounced'),
       ($1,298400,'cheque','RCP-H21-004708',false,now() - interval '5 days','CHQ-884120','2026-09-14','Mashreq','Presented'),
       ($1,234500,'cheque','RCP-H21-004703',false,now() - interval '12 days','CHQ-884131','2026-09-22','Emirates NBD','Held'),
       ($1,312000,'cheque','RCP-H21-004705',false,now() - interval '11 days','CHQ-884102','2026-09-01','Emirates NBD','Held'),
       ($1,186250,'cheque','RCP-H21-004707',false,now() - interval '21 days','CHQ-883991','2026-08-18','ADIB','Cleared')`,
      [pid]
    );

    // Bank-transfer receipts feeding the default-calculation refund check (T10).
    const paidUnits: [string, number][] = [
      ["H21-T1-2705", 1236000],
      ["H21-T1-4102", 990000],
      ["H21-T1-2404", 580000],
      ["H21-T1-1602", 400000],
      ["H21-T1-2202", 300000],
      ["H21-T1-3601", 250000],
      ["H21-T1-1103", 150000],
      ["H21-T1-0904", 100000],
    ];
    for (const [no, amount] of paidUnits) {
      const u = await c.query("SELECT id FROM units WHERE project_id=$1 AND no=$2", [pid, no]);
      if (!u.rows.length) continue;
      await c.query(
        "INSERT INTO receipts (project_id, unit_id, amount, method, reference, matched) VALUES ($1,$2,$3,'bank_transfer','RCP-H21-RECON',true)",
        [pid, u.rows[0].id, amount]
      );
    }
  }

  // leads
  for (const p of PROJECTS.slice(0, 3)) {
    const pr = await c.query("SELECT id FROM projects WHERE code=$1", [p.code]);
    const pid = pr.rows[0].id;
    await c.query(
      "INSERT INTO leads (project_id, name, source, stage, budget_min, budget_max, agent) VALUES ($1,$2,'referral','qualified',$3,$4,$5)",
      [pid, p.name + " Prospect", (p.collected / p.gdv) * 1000000 * 0.6, (p.gdv / p.units_total) * 1.1, AGENTS[pid % AGENTS.length]]
    );
  }

  // payment milestones sample for first project's sold units
  const p1 = await c.query("SELECT id FROM projects WHERE code='BLG'");
  const p1id = p1.rows[0].id;
  const soldUnits = await c.query("SELECT id, price FROM units WHERE project_id=$1 AND status='sold' LIMIT 6", [p1id]);
  for (const u of soldUnits.rows) {
    const steps = [10, 10, 10, 10, 20, 20, 20];
    for (let i = 0; i < steps.length; i++) {
      await c.query(
        "INSERT INTO payment_milestones (unit_id, milestone, percent, amount, status, due_date) VALUES ($1,$2,$3,$4,$5,$6)",
        [u.id, "Installment " + (i+1), steps[i], Math.round(u.price * steps[i]/100), i < 3 ? "paid" : "scheduled", `2026-0${Math.min(9,i+1)}-15`]
      );
    }
  }

  // construction milestone fixtures per project (PLINTH parity T4)
  const CONST_MILESTONES = [
    { milestone: "Enabling works", weight: 6, planned: "2026-02-14", forecast: "2026-02-11", actual: "2026-02-11", status: "certified", pp: 100, ap: 100, share: 0.16 },
    { milestone: "Substructure complete", weight: 14, planned: "2026-05-18", forecast: "2026-05-12", actual: "2026-05-12", status: "certified", pp: 100, ap: 100, share: 0.22 },
    { milestone: "Structure 40%", weight: 32, planned: "2026-04-12", forecast: "2026-04-18", actual: "", status: "pending", pp: 62, ap: 54, share: 0.28 },
    { milestone: "Structure 70%", weight: 18, planned: "2026-11-20", forecast: "2026-11-28", actual: "", status: "forecast", pp: 24, ap: 18, share: 0.2 },
    { milestone: "Facade complete", weight: 14, planned: "2027-06-14", forecast: "2027-07-02", actual: "", status: "forecast", pp: 8, ap: 4, share: 0.14 },
    { milestone: "Handover", weight: 16, planned: "2027-12-31", forecast: "2027-12-31", actual: "", status: "forecast", pp: 0, ap: 0, share: 0 },
  ];
  const cproj = await c.query("SELECT id, code, gdv, units_total FROM projects ORDER BY code");
  for (let pi = 0; pi < cproj.rows.length; pi++) {
    const pr = cproj.rows[pi];
    const offset = pi * 10;
    for (const mk of CONST_MILESTONES) {
      const shift = (d: string) => {
        if (!d) return null;
        const dt = new Date(d + "T00:00:00Z");
        dt.setUTCDate(dt.getUTCDate() + offset);
        return dt.toISOString().slice(0, 10);
      };
      await c.query(
        `INSERT INTO construction_milestones (project_id, milestone, planned, forecast, actual, status, weight, planned_pct, actual_pct, trigger_amt, trigger_buyers)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [pr.id, mk.milestone, shift(mk.planned), shift(mk.forecast), shift(mk.actual), mk.status,
         mk.weight, mk.pp, mk.ap, Math.round(pr.gdv * mk.share), Math.round(pr.units_total * 0.9)]
      );
    }
  }

  await c.end();
  console.log("seed ok");
}
main().catch((e) => { console.error(e); process.exit(1); });