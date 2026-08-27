-- Developer Inventory schema (idempotent)
-- Source of truth for projects, units, buyers, receipts, payment milestones, escrow.

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin'
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'launched',          -- launched / under_construction / handover
  units_total INT DEFAULT 0,
  gdv NUMERIC DEFAULT 0,                    -- gross development value (AED)
  sold NUMERIC DEFAULT 0,
  collected NUMERIC DEFAULT 0,
  due_date DATE
);

CREATE TABLE IF NOT EXISTS buyers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  kyc_status TEXT DEFAULT 'pending'          -- pending / cleared
);

CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id),
  no TEXT NOT NULL,
  type TEXT,                                  -- 1BR / 2BR / 3BR
  beds INT,
  area NUMERIC,
  "view" TEXT,
  status TEXT DEFAULT 'available',            -- available / booked / reserved / held / blocked / sold
  price NUMERIC DEFAULT 0,
  buyer_id INT REFERENCES buyers(id),
  UNIQUE (project_id, no)
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  name TEXT,
  source TEXT,
  phone TEXT,
  stage TEXT DEFAULT 'new',                   -- new/contacted/qualified/viewing/negotiation/eoi/booked/lost
  budget_min NUMERIC,
  budget_max NUMERIC,
  agent TEXT,
  stage_changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  unit_id INT REFERENCES units(id),
  buyer_id INT REFERENCES buyers(id),
  amount NUMERIC DEFAULT 0,
  method TEXT,                                -- bank_transfer / cheque / cash
  reference TEXT,
  matched BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_milestones (
  id SERIAL PRIMARY KEY,
  unit_id INT REFERENCES units(id),
  milestone TEXT,
  due_date DATE,
  percent INT DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'scheduled'             -- paid / due / scheduled
);

CREATE TABLE IF NOT EXISTS escrow_ledger (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  reference TEXT,
  direction TEXT DEFAULT 'in',                -- in / out
  amount NUMERIC DEFAULT 0,
  "bank" BOOLEAN DEFAULT false,
  system BOOLEAN DEFAULT false,
  matched BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_units_project ON units(project_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_receipts_project ON receipts(project_id);