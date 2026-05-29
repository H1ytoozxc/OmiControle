DROP INDEX IF EXISTS auth.idx_users_pending;

ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE auth.users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'disabled', 'locked'));
