-- Add 'pending' status for registration approval flow.
-- Drop the inline CHECK constraint and re-add it with the new value.

DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc USING (constraint_name, constraint_schema)
  WHERE tc.table_schema = 'auth'
    AND tc.table_name   = 'users'
    AND cc.check_clause LIKE '%status%'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE auth.users DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END;
$$;

ALTER TABLE auth.users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'disabled', 'locked', 'pending'));

-- Efficient index for admin "pending approvals" query.
CREATE INDEX idx_users_pending
  ON auth.users (tenant_id, created_at DESC)
  WHERE status = 'pending';

-- Store the plain-text display name and email captured during registration
-- so the admin sees it even before approval.
-- (display_name already exists; just ensure NOT NULL default is fine)
