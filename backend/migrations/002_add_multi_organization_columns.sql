-- Stage 2: Expand the existing tables without changing current behavior.
-- The columns are nullable until existing rows are backfilled in stage 3.
--
-- Do not use static defaults here:
-- - organization_id differs for each existing user.
-- - author/uploader IDs must identify the user who performed the action.

BEGIN;

ALTER TABLE conversations
    ADD COLUMN organization_id UUID,
    ADD COLUMN created_by_user_id UUID;

ALTER TABLE messages
    ADD COLUMN author_user_id UUID;

ALTER TABLE documents
    ADD COLUMN uploaded_by_user_id UUID;

COMMIT;
