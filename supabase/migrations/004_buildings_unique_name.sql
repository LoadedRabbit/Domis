-- Prevent duplicate building names so seed re-runs are idempotent.
-- The original seed used ON CONFLICT DO NOTHING but there was no unique
-- constraint to trigger it, causing duplicates on every migration run.
ALTER TABLE buildings ADD CONSTRAINT buildings_name_unique UNIQUE (name);
