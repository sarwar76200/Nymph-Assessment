# Database Schema

The backend uses PostgreSQL on Aiven with a shared-schema, multi-organization
tenancy model. Users may belong to multiple organizations, while each
conversation belongs to exactly one organization.

## Relationships

- A user may belong to many organizations through `organization_memberships`.
- An organization may have many users through `organization_memberships`.
- An organization owns many conversations.
- A user may create conversations, author user messages, and upload documents.
- A conversation contains messages and document metadata.
- Messages and documents derive their organization from their conversation.

## Users

Table: `users`

- `id`: UUID primary key
- `email`: required, unique `VARCHAR(320)`
- `password_hash`: required `VARCHAR(255)`
- `name`: required `VARCHAR(120)`
- `created_at`, `updated_at`: timezone-aware timestamps

## Organizations

Table: `organizations`

- `id`: UUID primary key
- `name`: required `VARCHAR(200)`
- `created_at`, `updated_at`: timezone-aware timestamps

Organization UUIDs are used in API paths. There is no slug.

## Organization memberships

Table: `organization_memberships`

- `organization_id`: foreign key to `organizations.id`
- `user_id`: foreign key to `users.id`
- `joined_at`: timezone-aware timestamp

The composite primary key `(organization_id, user_id)` prevents duplicate
memberships. All members have equal permissions; there is no role column.

## Conversations

Table: `conversations`

- `id`: UUID primary key
- `organization_id`: required foreign key to `organizations.id`
- `created_by_user_id`: nullable foreign key to `users.id`
- `title`: required `VARCHAR(200)`
- `status`: required `VARCHAR(20)`, either `active` or `completed`
- `created_at`, `updated_at`: timezone-aware timestamps

Deleting an organization cascades to its conversations. Deleting a user sets
`created_by_user_id` to `NULL` so shared organization data is retained.

## Messages

Table: `messages`

- `id`: UUID primary key
- `conversation_id`: required foreign key to `conversations.id`
- `author_user_id`: nullable foreign key to `users.id`
- `role`: required `VARCHAR(20)`, either `user` or `assistant`
- `content`: required `TEXT`
- `created_at`: timezone-aware timestamp

New user messages store the authenticated user's ID. Assistant messages use a
`NULL` author. The reference may also become `NULL` when a user is deleted.

## Documents

Table: `documents`

- `id`: UUID primary key
- `conversation_id`: required foreign key to `conversations.id`
- `uploaded_by_user_id`: nullable foreign key to `users.id`
- `filename`: required `VARCHAR(255)`
- `file_type`: required `VARCHAR(10)`, one of `pdf`, `docx`, or `txt`
- `file_size`: required positive `BIGINT`, measured in bytes
- `uploaded_at`: timezone-aware timestamp

Documents do not store `organization_id`; it is derived through
`conversation_id`. Only metadata is stored, not file content.

## PostgreSQL DDL

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_memberships (
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX ix_organization_memberships_user_id
    ON organization_memberships (user_id);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT conversations_status_check
        CHECK (status IN ('active', 'completed'))
);

CREATE INDEX ix_conversations_organization_status_updated
    ON conversations (organization_id, status, updated_at DESC);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL
        REFERENCES conversations(id) ON DELETE CASCADE,
    author_user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT messages_role_check
        CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX ix_messages_conversation_id
    ON messages (conversation_id);

CREATE INDEX ix_messages_author_user_id
    ON messages (author_user_id);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL
        REFERENCES conversations(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT documents_file_type_check
        CHECK (file_type IN ('pdf', 'docx', 'txt')),
    CONSTRAINT documents_file_size_check
        CHECK (file_size > 0)
);

CREATE INDEX ix_documents_conversation_id
    ON documents (conversation_id);

CREATE INDEX ix_documents_uploaded_by_user_id
    ON documents (uploaded_by_user_id);
```

## Existing-data migration

Run the migration files in order:

1. `001_create_organization_tables.sql`
2. `002_add_multi_organization_columns.sql`
3. `003_backfill_multi_organization_data.sql`
4. `004_add_multi_organization_constraints.sql`
5. `005_remove_legacy_conversation_owner.sql`

The stages create one personal organization per existing user, add nullable
columns, backfill tenancy and attribution, validate the migrated values, apply
constraints, and finally remove `conversations.user_id`.

Back up the database first and deploy the organization-aware backend
immediately after the migration.
