-- Developer Inventory schema (idempotent)
-- Source of truth for projects, units, buyers, receipts, payment milestones, escrow.

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin'
);

-- Server-side RBAC: per-role module/action permissions.
-- Actions: CRE (create), REA (read), UPD (update), DEL (delete), APR (approve), EXP (export).
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT PRIMARY KEY,
  perms JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO role_permissions (role, perms) VALUES
  ('super_admin', '{"Dashboard":{"CRE":true,"REA":true,"UPD":true,"DEL":false,"APR":true,"EXP":true},"Inventory":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true},"Sales":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true},"Finance":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true},"Handover":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true},"Settings":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true}}'),
  ('ops', '{"Dashboard":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Inventory":{"CRE":false,"REA":true,"UPD":true,"DEL":false,"APR":false,"EXP":true},"Sales":{"CRE":true,"REA":true,"UPD":true,"DEL":false,"APR":false,"EXP":true},"Finance":{"CRE":false,"REA":false,"UPD":false,"DEL":false,"APR":false,"EXP":false},"Handover":{"CRE":false,"REA":true,"UPD":true,"DEL":false,"APR":false,"EXP":false},"Settings":{"CRE":false,"REA":false,"UPD":false,"DEL":false,"APR":false,"EXP":false}}'),
  ('finance', '{"Dashboard":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Inventory":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":false},"Sales":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Finance":{"CRE":true,"REA":true,"UPD":true,"DEL":false,"APR":true,"EXP":true},"Handover":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":false},"Settings":{"CRE":false,"REA":false,"UPD":false,"DEL":false,"APR":false,"EXP":false}}'),
  ('viewer', '{"Dashboard":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Inventory":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Sales":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Finance":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Handover":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Settings":{"CRE":false,"REA":false,"UPD":false,"DEL":false,"APR":false,"EXP":false}}')
ON CONFLICT (role) DO NOTHING;

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets (email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets (token_hash);

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

-- Handover module (AUD-006): pipeline stages, snag items, title deeds.
CREATE TABLE IF NOT EXISTS pipeline_items (
  id SERIAL PRIMARY KEY,
  unit_no TEXT,
  buyer TEXT,
  stage TEXT NOT NULL,                 -- payment_cleared / snagging_scheduled / snagging_done / de_snagging / utilities / documents_ready / title_deed_issued / keys_handed / oa_onboarded
  meta TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON pipeline_items(stage);

CREATE TABLE IF NOT EXISTS snag_items (
  id SERIAL PRIMARY KEY,
  unit_no TEXT,
  loc TEXT,
  trade TEXT,
  description TEXT,
  sev TEXT DEFAULT 'Major',            -- Critical / Major / Minor
  contractor TEXT,
  status TEXT DEFAULT 'Open',          -- Open / In progress / Closed / Re-inspect
  reinspect TEXT
);
CREATE INDEX IF NOT EXISTS idx_snags_unit ON snag_items(unit_no);

CREATE TABLE IF NOT EXISTS deeds (
  id SERIAL PRIMARY KEY,
  unit_no TEXT,
  buyer TEXT,
  oqood TEXT,
  dld TEXT,
  deed TEXT DEFAULT 'Applied',         -- Issued / Applied / Blocked
  issued TEXT,
  keys TEXT DEFAULT 'Held',            -- Released / Held
  oa TEXT DEFAULT 'Pending'            -- Registered / Pending
);

-- Seed handover data on first install (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pipeline_items) THEN
    INSERT INTO pipeline_items (unit_no, buyer, stage, meta) VALUES
      ('WPK-T1-0402','N. Khoury','payment_cleared','Cleared 04 Aug'),
      ('WPK-T1-0405','M. Haddad','payment_cleared','Cleared 06 Aug'),
      ('WPK-T1-0311','S. Rathore','snagging_scheduled','Inspection 28 Aug'),
      ('WPK-T1-0208','G. Okonkwo','snagging_done','11 snags raised'),
      ('WPK-T1-0104','W. Chen','de_snagging','4 snags open · ALEC'),
      ('WPK-T1-0512','P. Nair','utilities','DEWA pending'),
      ('WPK-T1-0607','O. Al Suwaidi','documents_ready','Title deed applied'),
      ('WPK-T1-0703','E. Petrova','title_deed_issued','Deed 4417-2026'),
      ('WPK-T1-0801','F. Al Hashimi','keys_handed','Keys 22 Aug'),
      ('WPK-T1-0902','M. Lindqvist','oa_onboarded','Mollak registered');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM snag_items) THEN
    INSERT INTO snag_items (unit_no, loc, trade, description, sev, contractor, status, reinspect) VALUES
      ('WPK-T1-0114','Master bedroom','Joinery','Wardrobe door misaligned, does not close flush','Major','ALEC · Joinery','Open','28 Aug'),
      ('WPK-T1-0114','Guest bathroom','MEP','Low water pressure at basin mixer','Critical','ALEC · MEP','In progress','27 Aug'),
      ('WPK-T1-0208','Living room','Finishes','Paint blemish on north wall, 300mm','Minor','ALEC · Finishes','Closed','—'),
      ('WPK-T1-0208','Balcony','Waterproofing','Ponding at drain outlet after test','Critical','ALEC · Civil','Open','29 Aug'),
      ('WPK-T1-0311','Kitchen','Appliances','Oven fan intermittent','Major','Siemens · warranty','In progress','30 Aug'),
      ('WPK-T1-0104','Entrance','Smart home','Door sensor not pairing with panel','Major','Loxone','Open','02 Sep'),
      ('WPK-T1-0104','Powder room','Finishes','Grout discolouration','Minor','ALEC · Finishes','Closed','—'),
      ('WPK-T1-0512','Terrace','Glazing','Scratch to glass panel, 120mm','Minor','Alumco','Re-inspect','28 Aug');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM deeds) THEN
    INSERT INTO deeds (unit_no, buyer, oqood, dld, deed, issued, keys, oa) VALUES
      ('WPK-T1-0402','Nadia Khoury','OQD-3312','AED 118,000','Issued','04 Aug 26','Released','Registered'),
      ('WPK-T1-0405','Mariam Haddad','OQD-3318','AED 124,400','Issued','08 Aug 26','Released','Registered'),
      ('WPK-T1-0607','Omar Al Suwaidi','OQD-3341','AED 96,800','Applied','—','Held','Pending'),
      ('WPK-T1-0703','Elena Petrova','OQD-3350','AED 142,000','Issued','18 Aug 26','Released','Registered'),
      ('WPK-T1-0801','Fatima Al Hashimi','OQD-3362','AED 88,400','Issued','22 Aug 26','Released','Pending'),
      ('WPK-T1-0210','Vikram Shetty','OQD-3370','AED 104,200','Blocked','—','Held','Pending');
  END IF;
END $$;