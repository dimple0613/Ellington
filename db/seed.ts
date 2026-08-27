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

  // admin
  await c.query(
    "INSERT INTO admins (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4)",
    ["Super Admin", process.env.ADMIN_EMAIL || "admin@developer.com", hashPassword(process.env.ADMIN_PASSWORD || "admin123"), "super_admin"]
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

  await c.end();
  console.log("seed ok");
}
main().catch((e) => { console.error(e); process.exit(1); });