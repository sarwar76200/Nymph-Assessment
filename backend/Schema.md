# Database Schema

The backend uses PostgreSQL on Aiven. Users and organizations are stored in
separate tables with a many-to-many relationship between them. Users may
belong to multiple organizations, while each conversation belongs to exactly
one organization.

## Relationships

- A user may belong to many organizations, and an organization may contain
  many users, through `organization_memberships`.
- An organization owns many conversations.
- A user may create conversations, send messages, and upload documents.
- A conversation contains messages and documents (metadata for now).
- Messages and documents derive their organization from their conversation.

## Users

Table: `users`

- `id`: UUID primary key
- `email`: required, unique, `VARCHAR(320)`
- `password_hash`: required, `VARCHAR(255)`
- `name`: required, `VARCHAR(120)`
- `created_at`, `updated_at`: timestamps

## Organizations

Table: `organizations`

- `id`: UUID primary key
- `name`: required, `VARCHAR(200)`
- `created_at`, `updated_at`: timestamps


## Organization memberships

Table: `organization_memberships`

- `organization_id`: foreign key to `organizations.id`
- `user_id`: foreign key to `users.id`
- `joined_at`: timezone-aware timestamp

The rows `(organization_id, user_id)` form a composite primary key.

## Conversations

Table: `conversations`

- `id`: UUID primary key
- `organization_id`: required, foreign key to `organizations.id`
- `created_by_user_id`: nullable, foreign key to `users.id`
- `title`: required, `VARCHAR(200)`
- `status`: required, `VARCHAR(20)`, either `active` or `completed`
- `created_at`, `updated_at`: timestamps

Deleting an organization cascades to its conversations. Deleting a user makes
`created_by_user_id` = `NULL`, so conversation history is retained.

## Messages

Table: `messages`

- `id`: UUID primary key
- `conversation_id`: required, foreign key to `conversations.id`
- `author_user_id`: nullable, foreign key to `users.id`
- `role`: required, `VARCHAR(20)`, either `user` or `assistant`
- `content`: required, `TEXT`
- `created_at`: timestamp

New user messages store the user's ID, assistant messages use
`NULL`. When a user is deleted, `author_user_id` becomes `NULL` as well.

## Documents

Table: `documents`

- `id`: UUID primary key
- `conversation_id`: required, foreign key to `conversations.id`
- `uploaded_by_user_id`: nullable, foreign key to `users.id`
- `filename`: required, `VARCHAR(255)`
- `file_type`: required, `VARCHAR(10)`, one of `pdf`, `docx`, or `txt`
- `file_size`: required, positive, `BIGINT`, stored in bytes
- `uploaded_at`: timestamp

Allowed conversation statuses, message roles, document types, and positive
file sizes are validated by the backend request schemas.
