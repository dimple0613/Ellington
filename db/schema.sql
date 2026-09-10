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
  ('super_admin', '{"Dashboard":{"CRE":true,"REA":true,"UPD":true,"DEL":false,"APR":true,"EXP":true},"Inventory":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true},"Sales":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true},"Finance":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true},"Handover":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true},"Settings":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true},"Construction":{"CRE":true,"REA":true,"UPD":true,"DEL":true,"APR":true,"EXP":true}}'),
  ('ops', '{"Dashboard":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Inventory":{"CRE":false,"REA":true,"UPD":true,"DEL":false,"APR":false,"EXP":true},"Sales":{"CRE":true,"REA":true,"UPD":true,"DEL":false,"APR":false,"EXP":true},"Finance":{"CRE":false,"REA":false,"UPD":false,"DEL":false,"APR":false,"EXP":false},"Handover":{"CRE":false,"REA":true,"UPD":true,"DEL":false,"APR":false,"EXP":false},"Settings":{"CRE":false,"REA":false,"UPD":false,"DEL":false,"APR":false,"EXP":false},"Construction":{"CRE":false,"REA":true,"UPD":true,"DEL":false,"APR":false,"EXP":false}}'),
  ('finance', '{"Dashboard":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Inventory":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":false},"Sales":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Finance":{"CRE":true,"REA":true,"UPD":true,"DEL":false,"APR":true,"EXP":true},"Handover":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":false},"Settings":{"CRE":false,"REA":false,"UPD":false,"DEL":false,"APR":false,"EXP":false},"Construction":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":false}}'),
  ('viewer', '{"Dashboard":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Inventory":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Sales":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Finance":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Handover":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":true},"Settings":{"CRE":false,"REA":false,"UPD":false,"DEL":false,"APR":false,"EXP":false},"Construction":{"CRE":false,"REA":true,"UPD":false,"DEL":false,"APR":false,"EXP":false}}')
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
  stage_changed_at TIMESTAMPTZ DEFAULT now(),
  discount_pct NUMERIC,
  days_to_close INT
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS discount_pct NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS days_to_close INT;

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

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS cheque_no TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS cheque_date DATE;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS pdc_status TEXT;

-- Finance (PLINTH parity T11): bank-statement import queue for escrow reconciliation.
CREATE TABLE IF NOT EXISTS bank_statements (
  id SERIAL PRIMARY KEY,
  value_date DATE,
  reference TEXT,
  amount NUMERIC DEFAULT 0,
  description TEXT,
  matched BOOLEAN DEFAULT false,
  matched_receipt_id INT REFERENCES receipts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bankstatements_matched ON bank_statements(matched);

CREATE TABLE IF NOT EXISTS payment_milestones (
  id SERIAL PRIMARY KEY,
  unit_id INT REFERENCES units(id),
  milestone TEXT,
  due_date DATE,
  percent INT DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'scheduled'             -- paid / due / scheduled
);

-- Bookings (PLINTH parity T14): converts an available unit into a registered sale.
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  unit_id INT REFERENCES units(id) NOT NULL,
  buyer_id INT REFERENCES buyers(id),
  ref TEXT UNIQUE,                            -- BKG-2026-00891
  buyer_name TEXT,
  buyer_mobile TEXT,
  buyer_email TEXT,
  discount_pct NUMERIC DEFAULT 0,
  discount_amt NUMERIC DEFAULT 0,
  list_price NUMERIC DEFAULT 0,
  net_price NUMERIC DEFAULT 0,
  booking_amount NUMERIC DEFAULT 0,           -- token (default 10%)
  dld_payer TEXT DEFAULT 'buyer',             -- buyer / developer
  admin_fee NUMERIC DEFAULT 0,
  broker_involved BOOLEAN DEFAULT false,
  agency TEXT,
  agent TEXT,
  commission_pct NUMERIC DEFAULT 0,
  expected_spa DATE,
  status TEXT DEFAULT 'draft',                -- draft / pending_approval / confirmed / cancelled
  payment_method TEXT,                        -- bank_transfer / cheque / card / cash
  payment_bank TEXT,
  payment_cheque_no TEXT,
  payment_reference TEXT,
  escrow_ref TEXT,                            -- mandatory for confirm
  receipt_id INT REFERENCES receipts(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_unit ON bookings(unit_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Brokers & agencies (T15): registered agencies, their agents, and the activity feed.
CREATE TABLE IF NOT EXISTS broker_agencies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  orn TEXT,
  alloc_units INT DEFAULT 0,
  deals INT DEFAULT 0,
  accrued NUMERIC DEFAULT 0,             -- AED commission accrued
  paid NUMERIC DEFAULT 0,                -- AED commission paid out
  commission_rate TEXT DEFAULT '2.0%',
  status TEXT DEFAULT 'onboarding',      -- onboarding / active / suspended
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS broker_agents (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  agency TEXT NOT NULL,                  -- agency display name
  brn TEXT,
  deals INT DEFAULT 0,
  value NUMERIC DEFAULT 0,               -- AED value sold by this agent
  discount_pct NUMERIC DEFAULT 0,
  days_to_close INT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS broker_activity (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  meta TEXT,
  kind TEXT DEFAULT 'note',              -- reservation / commission / clawback / download / suspend / onboard
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  doc_type TEXT NOT NULL,
  unit_no TEXT,
  buyer TEXT,
  ref TEXT NOT NULL UNIQUE,
  media JSONB,
  status TEXT DEFAULT 'generated',   -- generated / sent
  generated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_ref ON documents(ref);

CREATE TABLE IF NOT EXISTS document_templates (
  id SERIAL PRIMARY KEY,
  doc_type TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT DEFAULT 'archived',    -- live / draft / archived
  blocks JSONB,
  changed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (doc_type, version)
);
ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS blocks JSONB;
CREATE INDEX IF NOT EXISTS idx_doc_templates_live ON document_templates(doc_type) WHERE status = 'live';

CREATE TABLE IF NOT EXISTS escrow_ledger (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  reference TEXT,
  direction TEXT DEFAULT 'in',                -- in / out
  amount NUMERIC DEFAULT 0,
  "bank" BOOLEAN DEFAULT false,
  system BOOLEAN DEFAULT false,
  matched BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE escrow_ledger ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT now();

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

-- System module (AUD-006): audit log + app settings.
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT,
  role TEXT,
  action TEXT,
  object TEXT,
  field TEXT,
  before_val TEXT,
  after_val TEXT,
  sensitive BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);

CREATE TABLE IF NOT EXISTS app_settings (
  id SMALLINT PRIMARY KEY,
  company JSONB NOT NULL DEFAULT '{}',
  brand JSONB NOT NULL DEFAULT '{}',
  numbering JSONB NOT NULL DEFAULT '{}',
  notif JSONB NOT NULL DEFAULT '{}',
  fx JSONB NOT NULL DEFAULT '[]',
  vat JSONB NOT NULL DEFAULT '{}',
  banks JSONB NOT NULL DEFAULT '[]',
  templates JSONB NOT NULL DEFAULT '[]',
  retention JSONB NOT NULL DEFAULT '[]',
  pii JSONB NOT NULL DEFAULT '[]',
  integrations JSONB NOT NULL DEFAULT '[]'
);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS fx JSONB NOT NULL DEFAULT '[]';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS vat JSONB NOT NULL DEFAULT '{}';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS banks JSONB NOT NULL DEFAULT '[]';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS templates JSONB NOT NULL DEFAULT '[]';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS retention JSONB NOT NULL DEFAULT '[]';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS pii JSONB NOT NULL DEFAULT '[]';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS integrations JSONB NOT NULL DEFAULT '[]';

-- Finance module (AUD-006): collections ageing ledger, escrow drawdowns, invoice ledger.
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  buyer TEXT,
  unit_no TEXT,
  amount NUMERIC DEFAULT 0,
  days_due INT DEFAULT 0,
  stage TEXT DEFAULT 'Upcoming',        -- Upcoming / Reminder 1 / Reminder 2 / 30-day notice / Final notice
  action TEXT
);
ALTER TABLE collections ADD COLUMN IF NOT EXISTS last_contact DATE;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS promised_date DATE;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS promised_amount NUMERIC;
CREATE INDEX IF NOT EXISTS idx_collections_stage ON collections(stage);

CREATE TABLE IF NOT EXISTS drawdowns (
  id SERIAL PRIMARY KEY,
  ref TEXT UNIQUE,
  milestone TEXT,
  amount NUMERIC DEFAULT 0,
  cert TEXT,
  rera TEXT DEFAULT 'Submitted',        -- Submitted / Approved
  status TEXT DEFAULT 'Awaiting trustee' -- Awaiting trustee / Released
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  no TEXT UNIQUE,
  buyer TEXT,
  unit_no TEXT,
  milestone TEXT,
  due DATE,
  amount NUMERIC DEFAULT 0,
  paid BOOLEAN DEFAULT false
);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issued_at DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided_at DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- Construction module (PLINTH parity): work-package milestones with money release.
CREATE TABLE IF NOT EXISTS construction_milestones (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  milestone TEXT,
  planned DATE,
  forecast DATE,
  actual DATE,
  status TEXT DEFAULT 'pending',          -- certified / pending / forecast / scheduled
  weight INT DEFAULT 0,                    -- contribution to overall completion
  planned_pct INT DEFAULT 0,
  actual_pct INT DEFAULT 0,
  trigger_amt NUMERIC DEFAULT 0,           -- AED released to buyers when certified
  trigger_buyers INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_construction_project ON construction_milestones(project_id);

-- =====================================================================
-- Missing/To-Fix features (feat/audit-missing): Project wizard, Unit
-- Builder, Pricing manager, Buyer/Broker portals. All idempotent.
-- =====================================================================

-- New project 6-step wizard: legal/escrow compliance + setup config.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dld_no TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rera_permit TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS escrow_iban TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS escrow_bank TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS setup JSONB NOT NULL DEFAULT '{}';
-- setup: { towers[], unit_types[], payment_plan[], team[], compliance{...} }

-- Unit Builder + pricing: bulk price revisions with an approval gate.
CREATE TABLE IF NOT EXISTS price_revisions (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  change_type TEXT DEFAULT 'pct',         -- pct / flat
  pct NUMERIC DEFAULT 0,
  selection TEXT DEFAULT 'unsold',
  effective_date DATE,
  reason TEXT,
  status TEXT DEFAULT 'draft',            -- draft / pending_approval / approved / applied / rejected
  requested_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '[]',    -- [{unit_id, no, old_price, new_price}]
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_rev_project ON price_revisions(project_id);

CREATE TABLE IF NOT EXISTS release_phases (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  name TEXT NOT NULL,
  unit_count INT DEFAULT 0,
  release_date TIMESTAMPTZ,
  uplift_pct NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'live'              -- scheduled / live / closed
);
CREATE INDEX IF NOT EXISTS idx_release_phases_project ON release_phases(project_id);

CREATE TABLE IF NOT EXISTS price_rates (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  typology TEXT NOT NULL,
  band TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  UNIQUE (project_id, typology, band)
);

-- Portals: buyer + broker login accounts (PBKDF2-hashed like admins).
CREATE TABLE IF NOT EXISTS buyer_portal_accounts (
  id SERIAL PRIMARY KEY,
  buyer_id INT NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broker_portal_accounts (
  id SERIAL PRIMARY KEY,
  agency_id INT NOT NULL REFERENCES broker_agencies(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broker_reservations (
  id SERIAL PRIMARY KEY,
  agency_id INT REFERENCES broker_agencies(id),
  agency_name TEXT,
  agent TEXT,
  unit_id INT REFERENCES units(id),
  unit_no TEXT,
  project_code TEXT,
  buyer_name TEXT,
  buyer_mobile TEXT,
  buyer_email TEXT,
  commission_pct NUMERIC DEFAULT 2.0,
  status TEXT DEFAULT 'pending',          -- pending / approved / declined / cancelled
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_broker_res_agency ON broker_reservations(agency_id);

-- Pricing manager: persisted discount rules + leakage history.
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS pricing JSONB NOT NULL DEFAULT '[]';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM app_settings WHERE id = 1)
     AND NOT EXISTS (SELECT 1 FROM app_settings WHERE id = 1 AND pricing IS NOT NULL AND pricing::text <> '[]') THEN
    UPDATE app_settings
    SET pricing = '{
      "discount_rules": [
        {"role":"Sales agent","max_pct":3},
        {"role":"Sales manager","max_pct":5},
        {"role":"Sales director","max_pct":8},
        {"role":"Owner","max_pct":null}
      ],
      "leakage": [3.1,2.8,3.4,4.1,3.6,4.8,5.2,4.4,3.9,4.6,5.1,4.2]
    }'::jsonb
    WHERE id = 1;
  END IF;
END $$;

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
  IF NOT EXISTS (SELECT 1 FROM audit_log) THEN
    INSERT INTO audit_log (ts, actor, role, action, object, field, before_val, after_val, sensitive) VALUES
      (now() - interval '5 days 2 hours','Khalid Al Fahim','CEO','Approved','BLG III · Discount request','Discount %','—','5%',false),
      (now() - interval '5 days 3 hours','Sarah Mitchell','Sales Dir','Created','BLG III · Lead','—','—','Rajesh Menon',false),
      (now() - interval '6 days 4 hours','Ravi Kumar','Finance Mgr','Updated','H21 · Receipt RCP-H21-004789','Status','Unmatched','Matched',false),
      (now() - interval '6 days 5 hours','Ravi Kumar','Finance Mgr','Created','DDR-0004','—','—','Structure 60%',false),
      (now() - interval '6 days 6 hours','Khalid Al Fahim','CEO','Approved','WPK · Phase 2 release','—','—','12 units',false),
      (now() - interval '7 days 3 hours','Sarah Mitchell','Sales Dir','Updated','BLG III · Price list','Price/psf','AED 2,140','AED 2,200',true),
      (now() - interval '7 days 5 hours','Omar Saeed','Project Mgr','Created','BLG III · Snag SNG-0412','—','—','Paint crack',false),
      (now() - interval '8 days 1 hour','Ravi Kumar','Finance Mgr','Exported','Finance · Statement','—','—','47 rows CSV',true),
      (now() - interval '8 days 4 hours','Khalid Al Fahim','CEO','Updated','System · User','Status','Active','Suspended',true),
      (now() - interval '9 days 2 hours','Sarah Mitchell','Sales Dir','Created','BLG III · Booking BK-9042','—','—','Unit 0402',false),
      (now() - interval '10 days 3 hours','Ravi Kumar','Finance Mgr','Updated','Escrow · Reconciliation','Variance','AED 14,200','AED 0',false),
      (now() - interval '11 days 2 hours','Omar Saeed','Project Mgr','Updated','WPK · Milestone','Status','Pending','Certified',false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM app_settings) THEN
    INSERT INTO app_settings (id, company, brand, numbering, notif) VALUES (1,
      '{"Legal name":"Ellington Properties Development LLC","Trade licence":"CN-2847192","ORN":"21281","RERA":"1884","VAT TRN":"100234567800003"}'::jsonb,
      '{"Primary color":"#4F46F5","Currency":"AED","Date format":"DD MMM YYYY","Timezone":"Asia/Dubai (GMT+4)","Fiscal year":"Jan – Dec"}'::jsonb,
      '[{"object":"Unit","prefix":"{project}-T{tower}-{seq}","pattern":"WPK-T1-0402 — auto-increment per tower"},{"object":"Receipt","prefix":"RCP-{seq}","pattern":"RCP-000060 — row ID, zero-padded to 6 digits"},{"object":"Cheque","prefix":"CHQ-{seq}","pattern":"CHQ-884102 — row ID, zero-padded to 6 digits"},{"object":"Drawdown","prefix":"DDR-{seq}","pattern":"DDR-0004 — sequential"},{"object":"Escrow ref","prefix":"ESC-{year}-{seq}","pattern":"ESC-2026-9014 — yearly reset"},{"object":"Notice","prefix":"NTC-{type}-{unit}","pattern":"NTC-30D-WPK-T1-0210"}]'::jsonb,
      '[{"event":"New booking created","inapp":true,"email":true,"slack":false},{"event":"Payment received","inapp":true,"email":true,"slack":true},{"event":"Milestone certified","inapp":true,"email":true,"slack":false},{"event":"Drawdown request","inapp":true,"email":true,"slack":true},{"event":"Snag raised","inapp":false,"email":true,"slack":false},{"event":"Title deed issued","inapp":true,"email":true,"slack":false},{"event":"Unit price changed","inapp":true,"email":true,"slack":false},{"event":"User invited","inapp":true,"email":false,"slack":false}]'::jsonb);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM collections) THEN
    INSERT INTO collections (buyer, unit_no, amount, days_due, stage, action) VALUES
      ('Sunil Rathore','H21-T1-2705',4120000,118,'Final notice','Legal review · 28 Aug'),
      ('Elena Petrova','H21-T1-4102',2860000,104,'30-day notice','Notice issued 12 Aug'),
      ('Marcus Lindqvist','H21-T1-2404',1940000,96,'Reminder 2','Promise to pay 02 Sep'),
      ('Wei Chen','H21-T1-1602',1210000,92,'Reminder 2','Cheque bounced · re-present'),
      ('Nadia Khoury','H21-T1-2202',864000,61,'Reminder 1','Call scheduled 26 Aug'),
      ('Omar Al Suwaidi','H21-T1-3601',640000,44,'Reminder 1','Awaiting bank confirmation'),
      ('Grace Okonkwo','H21-T1-1103',412000,31,'Reminder 1','Email sent 22 Aug'),
      ('Priya Nair','H21-T1-0904',208000,18,'Upcoming','Auto-reminder 27 Aug');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM drawdowns) THEN
    INSERT INTO drawdowns (ref, milestone, amount, cert, rera, status) VALUES
      ('DDR-0004','Structure 40%',62400000,'WSP · A. Faruqi · 04 Aug 26','Submitted','Awaiting trustee'),
      ('DDR-0003','Substructure complete',48200000,'WSP · A. Faruqi · 12 May 26','Approved','Released'),
      ('DDR-0002','Enabling works',21600000,'WSP · A. Faruqi · 03 Feb 26','Approved','Released'),
      ('DDR-0001','Mobilisation',14800000,'WSP · A. Faruqi · 18 Nov 25','Approved','Released');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM invoices) THEN
    INSERT INTO invoices (no, buyer, unit_no, milestone, due, amount, paid) VALUES
      ('INV-0041','Nadia Khoury','WPK-T1-0402','Structure 40%','2026-08-01',1180000,false),
      ('INV-0040','Elena Petrova','H21-T1-4102','Substructure complete','2026-07-15',640000,true),
      ('INV-0039','Marcus Lindqvist','H21-T1-2404','Enabling works','2026-07-01',412000,false),
      ('INV-0038','Wei Chen','H21-T1-1602','Structure 20%','2026-06-20',960000,true),
      ('INV-0037','Sunil Rathore','H21-T1-2705','Structure 40%','2026-06-01',1236000,false),
      ('INV-0036','Priya Nair','H21-T1-0904','Enabling works','2026-05-25',208000,true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM escrow_ledger) THEN
    INSERT INTO escrow_ledger (reference, direction, amount, bank, "system", matched, received_at) VALUES
      ('MENON RM 3302','in',367875,true,false,false, now() - interval '17 days'),
      ('RCP-H21-004706 · M. Lindqvist','in',640000,false,true,false, now() - interval '18 days'),
      ('No reference quoted','in',112400,true,false,false, now() - interval '20 days'),
      ('RCP-H21-004689 · E. Petrova','in',1204000,false,true,false, now() - interval '21 days'),
      ('BLG-1602','in',84600,true,false,false, now() - interval '24 days'),
      ('CHQ-883964','in',268000,true,false,false, now() - interval '27 days');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM construction_milestones) AND EXISTS (SELECT 1 FROM projects WHERE code = 'BLG') THEN
    INSERT INTO construction_milestones (project_id, milestone, planned, forecast, actual, status, weight, planned_pct, actual_pct, trigger_amt, trigger_buyers)
    SELECT p.id, mk.milestone, mk.planned, mk.forecast, mk.actual, mk.status, mk.weight, mk.planned_pct, mk.actual_pct,
           ROUND(p.gdv * mk.share)::numeric, ROUND(p.units_total * 0.9)::int
    FROM projects p
    CROSS JOIN (VALUES
      ('Enabling works'::text, date '2026-02-14', date '2026-02-11', date '2026-02-11', 'certified'::text, 6, 100, 100, 0.16),
      ('Substructure complete', date '2026-05-18', date '2026-05-12', date '2026-05-12', 'certified', 14, 100, 100, 0.22),
      ('Structure 40%', date '2026-04-12', date '2026-04-18', NULL, 'pending', 32, 62, 54, 0.28),
      ('Structure 70%', date '2026-11-20', date '2026-11-28', NULL, 'forecast', 18, 24, 18, 0.20),
      ('Facade complete', date '2027-06-14', date '2027-07-02', NULL, 'forecast', 14, 8, 4, 0.14),
      ('Handover', date '2027-12-31', date '2027-12-31', NULL, 'forecast', 16, 0, 0, 0.00)
    ) AS mk(milestone, planned, forecast, actual, status, weight, planned_pct, actual_pct, share);
  END IF;
IF NOT EXISTS (SELECT 1 FROM bank_statements) THEN
    INSERT INTO bank_statements (value_date, reference, amount, description) VALUES
      ('2026-08-24','RCP-H21-004712',367875,'MENON RM 3302'),
      ('2026-08-24','RCP-H21-004711',512000,'AISHA AL MARRI'),
      ('2026-08-23','CHQ-883964',268000,'CHQ BOUNCED · RE-PRESENTED');
  END IF;
END $$;