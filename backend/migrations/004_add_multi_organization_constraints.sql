-- Stage 4: Enforce organization tenancy and attribution relationships.

BEGIN;

ALTER TABLE conversations
    ALTER COLUMN organization_id SET NOT NULL,
    ADD CONSTRAINT conversations_organization_fk
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,
    ADD CONSTRAINT conversations_created_by_user_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL;

CREATE INDEX ix_conversations_organization_status_updated
    ON conversations (organization_id, status, updated_at DESC);

ALTER TABLE messages
    ADD CONSTRAINT messages_author_user_fk
        FOREIGN KEY (author_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL;

CREATE INDEX ix_messages_author_user_id
    ON messages (author_user_id);

ALTER TABLE documents
    ADD CONSTRAINT documents_uploaded_by_user_fk
        FOREIGN KEY (uploaded_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL;

CREATE INDEX ix_documents_uploaded_by_user_id
    ON documents (uploaded_by_user_id);

COMMIT;
