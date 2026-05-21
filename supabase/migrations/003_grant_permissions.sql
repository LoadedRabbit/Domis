-- Grant SELECT, INSERT, UPDATE, DELETE on all new tables to the roles
-- PostgREST uses. Tables created via CLI migrations do not get these
-- grants automatically (unlike tables created in the Supabase dashboard).

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tenants                TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE communication_threads  TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE communication_messages TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE maintenance_requests   TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rent_ledger            TO service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rent_notices           TO service_role, authenticated, anon;
