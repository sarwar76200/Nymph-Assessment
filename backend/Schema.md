# Database Schema

The backend uses PostgreSQL on Aiven and SQLAlchemy ORM. The schema contains
four entities: users, conversations, messages, and document metadata.

## Relationships

- One user owns zero or more conversations.
- One conversation contains zero or more messages.
- One conversation has zero or more document metadata records.
- Deleting a user cascades to their conversations.
- Deleting a conversation cascades to its messages and documents.

## Users

Table: `users`

- `id`: UUID, primary key, defaults to `gen_random_uuid()`
- `email`: `VARCHAR(320)`, required and unique
- `password_hash`: `VARCHAR(255)`, required
- `name`: `VARCHAR(120)`, required
- `created_at`: timezone-aware timestamp, required, defaults to `NOW()`
- `updated_at`: timezone-aware timestamp, required, defaults to `NOW()`

The application normalizes email addresses to lowercase before storing them.
Passwords are never stored directly; `password_hash` contains an Argon2 hash.

Indexes:

- Unique index on `email`, created by the unique constraint

## Conversations

Table: `conversations`

- `id`: UUID, primary key, defaults to `gen_random_uuid()`
- `user_id`: UUID, required foreign key to `users.id`
- `title`: `VARCHAR(200)`, required
- `status`: `VARCHAR(20)`, required, defaults to `active`
- `created_at`: timezone-aware timestamp, required, defaults to `NOW()`
- `updated_at`: timezone-aware timestamp, required, defaults to `NOW()`

Constraints:

- `status` must be `active` or `completed`
- Deleting the owning user deletes the conversation

Indexes:

- Index on `user_id`

The application updates `updated_at` when the title, status, or message history
changes.

## Messages

Table: `messages`

- `id`: UUID, primary key, defaults to `gen_random_uuid()`
- `conversation_id`: UUID, required foreign key to `conversations.id`
- `role`: `VARCHAR(20)`, required
- `content`: `TEXT`, required
- `created_at`: timezone-aware timestamp, required, defaults to `NOW()`

Constraints:

- `role` must be `user` or `assistant`
- Deleting the parent conversation deletes the message

Indexes:

- Index on `conversation_id`

Messages are returned chronologically by `created_at`. Search uses
case-insensitive literal substring matching against `content`.

## Documents

Table: `documents`

- `id`: UUID, primary key, defaults to `gen_random_uuid()`
- `conversation_id`: UUID, required foreign key to `conversations.id`
- `filename`: `VARCHAR(255)`, required
- `file_type`: `VARCHAR(10)`, required
- `file_size`: `BIGINT`, required and measured in bytes
- `uploaded_at`: timezone-aware timestamp, required, defaults to `NOW()`

Constraints:

- `file_type` must be `pdf`, `docx`, or `txt`
- `file_size` must be greater than zero
- Deleting the parent conversation deletes the document metadata

Indexes:

- Index on `conversation_id`

Only metadata is stored. The application does not retain the file contents.

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

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT conversations_status_check
        CHECK (status IN ('active', 'completed'))
);

CREATE INDEX ix_conversations_user_id
    ON conversations (user_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL
        REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT messages_role_check
        CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX ix_messages_conversation_id
    ON messages (conversation_id);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL
        REFERENCES conversations(id) ON DELETE CASCADE,
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
```

## Timestamp behavior

PostgreSQL supplies initial timestamp values through `NOW()`. SQLAlchemy updates
`users.updated_at` and `conversations.updated_at` when those records are changed
through the application. Direct SQL updates must set `updated_at` explicitly if
the timestamp should change.
