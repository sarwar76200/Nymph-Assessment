-- Stage 5: Remove the old user-ownership model.
-- Run only when the organization-aware backend is ready to deploy.

BEGIN;

ALTER TABLE conversations
    DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;

DROP INDEX IF EXISTS ix_conversations_user_id;

ALTER TABLE conversations
    DROP COLUMN IF EXISTS user_id;

DROP TABLE IF EXISTS _migration_user_organization_map;

COMMIT;
