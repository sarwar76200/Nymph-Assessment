-- Stage 3: Connect existing data to organizations and users.

BEGIN;

UPDATE conversations AS conversation
SET
    organization_id = mapping.organization_id,
    created_by_user_id = conversation.user_id
FROM _migration_user_organization_map AS mapping
WHERE mapping.user_id = conversation.user_id;

UPDATE messages AS message
SET author_user_id = conversation.user_id
FROM conversations AS conversation
WHERE
    conversation.id = message.conversation_id
    AND message.role = 'user';

UPDATE documents AS document
SET uploaded_by_user_id = conversation.user_id
FROM conversations AS conversation
WHERE conversation.id = document.conversation_id;

-- Temporary constraints validate the backfill without a PL/pgSQL DO block.
-- They are dropped here because author/uploader references may later become
-- NULL when a user is deleted.
ALTER TABLE conversations
    ADD CONSTRAINT migration_conversations_organization_check
    CHECK (organization_id IS NOT NULL) NOT VALID;

ALTER TABLE conversations
    VALIDATE CONSTRAINT migration_conversations_organization_check;

ALTER TABLE conversations
    DROP CONSTRAINT migration_conversations_organization_check;

ALTER TABLE messages
    ADD CONSTRAINT migration_messages_author_check
    CHECK (role <> 'user' OR author_user_id IS NOT NULL) NOT VALID;

ALTER TABLE messages
    VALIDATE CONSTRAINT migration_messages_author_check;

ALTER TABLE messages
    DROP CONSTRAINT migration_messages_author_check;

ALTER TABLE documents
    ADD CONSTRAINT migration_documents_uploader_check
    CHECK (uploaded_by_user_id IS NOT NULL) NOT VALID;

ALTER TABLE documents
    VALIDATE CONSTRAINT migration_documents_uploader_check;

ALTER TABLE documents
    DROP CONSTRAINT migration_documents_uploader_check;

COMMIT;
