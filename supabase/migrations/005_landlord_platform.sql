-- ============================================================
-- Migration 005: Landlord Platform — Invites, Rent Due Day, Expenses
-- Run in Supabase SQL Editor
-- ============================================================

-- Add invite fields to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_tenants_invite_token ON tenants(invite_token);

-- Add rent due day to buildings (1–28)
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS rent_due_day INT DEFAULT 1
  CHECK (rent_due_day BETWEEN 1 AND 28);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id BIGINT REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  category    TEXT NOT NULL CHECK (category IN (
    'mortgage','insurance','repairs','utilities','taxes','management_fees','other'
  )),
  description TEXT NOT NULL DEFAULT '',
  receipt_url TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date        ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category    ON expenses(category);
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO anon, authenticated, service_role;
