-- Property Management Platform — Initial database schema

-- Buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  total_units INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  building_name TEXT NOT NULL,
  building_address TEXT NOT NULL,
  report_month INTEGER NOT NULL CHECK (report_month BETWEEN 1 AND 12),
  report_year INTEGER NOT NULL CHECK (report_year >= 2020),
  total_rent_collected NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_income NUMERIC(12, 2) GENERATED ALWAYS AS (total_rent_collected - total_expenses) STORED,
  vacant_units INTEGER NOT NULL DEFAULT 0,
  maintenance_issues TEXT DEFAULT '',
  tenant_issues TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  generated_report TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'error')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_reports_building_id ON reports (building_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports (created_by);
CREATE INDEX IF NOT EXISTS idx_reports_year_month ON reports (report_year DESC, report_month DESC);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS — API routes use service role key
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

-- Seed sample buildings
INSERT INTO buildings (name, address, total_units) VALUES
  ('Tower A',        '1201 Main Street, Los Angeles, CA 90001',      20),
  ('Tower B',        '1205 Main Street, Los Angeles, CA 90001',      15),
  ('Residences',     '847 Oak Avenue, Los Angeles, CA 90015',        18),
  ('Heights',        '321 Pine Road, Pasadena, CA 91101',            12),
  ('Gardens',        '654 Elm Street, Glendale, CA 91201',           10),
  ('Square',         '987 Cedar Lane, Burbank, CA 91501',             8),
  ('Park View',      '111 Willow Way, Culver City, CA 90230',        14),
  ('Manor',          '222 Birch Boulevard, Santa Monica, CA 90401',  16),
  ('Plaza',          '333 Walnut Avenue, Long Beach, CA 90802',      22),
  ('Suites',         '444 Ash Court, Torrance, CA 90501',            11),
  ('Terrace',        '555 Maple Drive, Compton, CA 90220',           13),
  ('Palms',          '666 Palm Avenue, Inglewood, CA 90301',         17),
  ('Vista',          '777 Vista Road, Hawthorne, CA 90250',          19),
  ('Commons',        '888 Common Lane, Gardena, CA 90247',           9),
  ('Court',          '999 Court Street, Lawndale, CA 90260',         15)
ON CONFLICT DO NOTHING;
