-- ============================================================
-- Migration 002: Tenant Hub, Maintenance Tracker, Late Rent
-- Run in Supabase SQL Editor
-- ============================================================

-- Trigger function (may already exist — safe to re-create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id   UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  unit_number   TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT DEFAULT '',
  monthly_rent  NUMERIC(10,2) NOT NULL DEFAULT 0,
  lease_start   DATE,
  lease_end     DATE,
  clerk_user_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(building_id, unit_number)
);
CREATE INDEX IF NOT EXISTS idx_tenants_building_id   ON tenants(building_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email         ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_clerk_user_id ON tenants(clerk_user_id);

-- ============================================================
-- COMMUNICATION THREADS
-- ============================================================
CREATE TABLE IF NOT EXISTS communication_threads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  subject     TEXT NOT NULL,
  urgency     TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low','medium','high')),
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comm_threads_tenant_id   ON communication_threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comm_threads_building_id ON communication_threads(building_id);
CREATE INDEX IF NOT EXISTS idx_comm_threads_status      ON communication_threads(status);

-- ============================================================
-- COMMUNICATION MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS communication_messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id   UUID REFERENCES communication_threads(id) ON DELETE CASCADE NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('tenant','manager')),
  sender_name TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comm_messages_thread_id ON communication_messages(thread_id);

-- ============================================================
-- MAINTENANCE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  building_id        UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  description        TEXT NOT NULL,
  location_in_unit   TEXT DEFAULT '',
  urgency            TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low','medium','high')),
  ai_category        TEXT DEFAULT 'Routine' CHECK (ai_category IN ('Emergency','Routine')),
  status             TEXT NOT NULL DEFAULT 'submitted'
                       CHECK (status IN ('submitted','reviewed','contractor_contacted','in_progress','completed')),
  photo_url          TEXT DEFAULT '',
  contractor_name    TEXT DEFAULT '',
  contractor_contact TEXT DEFAULT '',
  scheduled_date     DATE,
  manager_notes      TEXT DEFAULT '',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maint_tenant_id   ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maint_building_id ON maintenance_requests(building_id);
CREATE INDEX IF NOT EXISTS idx_maint_status      ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maint_category    ON maintenance_requests(ai_category);

-- ============================================================
-- RENT LEDGER
-- ============================================================
CREATE TABLE IF NOT EXISTS rent_ledger (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  due_date    DATE NOT NULL,
  amount_due  NUMERIC(10,2) NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid')),
  paid_date   DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, due_date)
);
CREATE INDEX IF NOT EXISTS idx_rent_ledger_tenant_id   ON rent_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_ledger_building_id ON rent_ledger(building_id);
CREATE INDEX IF NOT EXISTS idx_rent_ledger_due_date    ON rent_ledger(due_date DESC);
CREATE INDEX IF NOT EXISTS idx_rent_ledger_status      ON rent_ledger(status);

-- ============================================================
-- RENT NOTICES
-- ============================================================
CREATE TABLE IF NOT EXISTS rent_notices (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_id      UUID REFERENCES rent_ledger(id) ON DELETE CASCADE NOT NULL,
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  notice_type    TEXT NOT NULL CHECK (notice_type IN ('first_notice','second_notice','lawyer_referral')),
  generated_text TEXT NOT NULL DEFAULT '',
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ledger_id, notice_type)
);
CREATE INDEX IF NOT EXISTS idx_rent_notices_ledger_id ON rent_notices(ledger_id);
CREATE INDEX IF NOT EXISTS idx_rent_notices_tenant_id ON rent_notices(tenant_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER comm_threads_updated_at
  BEFORE UPDATE ON communication_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER maint_requests_updated_at
  BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER rent_ledger_updated_at
  BEFORE UPDATE ON rent_ledger FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER rent_notices_updated_at
  BEFORE UPDATE ON rent_notices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DISABLE RLS (service role key only, consistent with existing)
-- ============================================================
ALTER TABLE tenants                DISABLE ROW LEVEL SECURITY;
ALTER TABLE communication_threads  DISABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests   DISABLE ROW LEVEL SECURITY;
ALTER TABLE rent_ledger            DISABLE ROW LEVEL SECURITY;
ALTER TABLE rent_notices           DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORAGE BUCKET (run separately in Supabase Dashboard > Storage)
-- Bucket name: maintenance-photos, Public: true
-- Cannot be created via SQL — do this manually.
-- ============================================================
