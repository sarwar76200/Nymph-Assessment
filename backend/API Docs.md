# Nymph Customer Support API

## Basics

- Local base URL: `http://localhost:8000`
- API prefix: `/api/v1`
- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI schema: `/openapi.json`

JSON requests use `Content-Type: application/json`.

## Authentication and organization context

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

The JWT identifies only the user. Organization-scoped endpoints include the
selected organization UUID in the path:

```text
/api/v1/organizations/{organization_id}/...
```

The same token may be used to switch organizations. The server verifies
membership on every scoped request.

- Missing, invalid, or expired token: `401 Unauthorized`
- User is not an organization member: `403 Forbidden`
- Resource is outside the selected organization: `404 Not Found`
- Invalid body, path, or query value: `422 Unprocessable Entity`

## Response objects

User:

```json
{
  "id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
  "email": "alex@example.com",
  "name": "Alex Smith",
  "created_at": "2026-07-28T12:00:00Z"
}
```

Organization:

```json
{
  "id": "ff8a3d86-d702-44ef-a1f7-c369528cfe2d",
  "name": "Alex Smith's Organization",
  "created_at": "2026-07-28T12:00:00Z",
  "updated_at": "2026-07-28T12:00:00Z"
}
```

Conversation:

```json
{
  "id": "19237fe6-4240-410a-9ace-ec1341410dd3",
  "organization_id": "ff8a3d86-d702-44ef-a1f7-c369528cfe2d",
  "created_by_user_id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
  "title": "Billing assistance",
  "status": "active",
  "created_at": "2026-07-28T12:00:00Z",
  "updated_at": "2026-07-28T12:05:00Z"
}
```

Message:

```json
{
  "id": "6a9c873a-7ec1-41ee-9161-798117f223ab",
  "conversation_id": "19237fe6-4240-410a-9ace-ec1341410dd3",
  "author_user_id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
  "role": "user",
  "content": "I need help with billing.",
  "created_at": "2026-07-28T12:01:00Z"
}
```

Assistant messages have `"author_user_id": null`.

Document metadata:

```json
{
  "id": "fa32e818-0d09-4448-bb64-326bcadbb2aa",
  "conversation_id": "19237fe6-4240-410a-9ace-ec1341410dd3",
  "uploaded_by_user_id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
  "filename": "billing-guide.pdf",
  "file_type": "pdf",
  "file_size": 245760,
  "uploaded_at": "2026-07-28T12:10:00Z"
}
```

## Authentication

### Signup

`POST /api/v1/auth/signup`

```json
{
  "name": "Alex Smith",
  "email": "alex@example.com",
  "password": "password123"
}
```

Creates the user, a personal organization, and membership in one transaction.
Returns `201 Created` with:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
    "email": "alex@example.com",
    "name": "Alex Smith",
    "created_at": "2026-07-28T12:00:00Z"
  }
}
```

Duplicate email returns `409 Conflict`.

### Login

`POST /api/v1/auth/login`

```json
{
  "email": "alex@example.com",
  "password": "password123"
}
```

Returns `200 OK` with the same token response as signup. Incorrect credentials
return `401 Unauthorized`.

### Current user

`GET /api/v1/auth/me`

Returns the authenticated user.

## Organizations

All organization members have equal permissions.

### List organizations

`GET /api/v1/organizations`

Returns the organizations the current user belongs to, sorted by name.

### Create organization

`POST /api/v1/organizations`

```json
{
  "name": "Nymph Support"
}
```

Returns `201 Created`. The creator is automatically added as a member.

### Add an existing user

`POST /api/v1/organizations/{organization_id}/members`

```json
{
  "email": "member@example.com"
}
```

The caller must already belong to the organization.

Success: `201 Created`

```json
{
  "organization_id": "ff8a3d86-d702-44ef-a1f7-c369528cfe2d",
  "user_id": "338760e5-6cbd-46ad-8f24-82fd4c1fc647",
  "joined_at": "2026-07-28T12:20:00Z"
}
```

- User does not exist: `404 Not Found`
- User is already a member: `409 Conflict`

## Conversations

Base path:

```text
/api/v1/organizations/{organization_id}/conversations
```

### List conversations

`GET {base_path}?limit=50&offset=0`

Returns only the selected organization's conversations. Active conversations
come first; each status group is sorted by most recent update.

- `limit`: 1–100, default `50`
- `offset`: zero or greater, default `0`

### Create conversation

`POST {base_path}`

```json
{
  "title": "Billing assistance"
}
```

Returns `201 Created`. The status defaults to `active`, the path supplies
`organization_id`, and authentication supplies `created_by_user_id`.

### Search conversations

`GET {base_path}/search?query=billing`

Uses case-insensitive literal substring matching against message content.
Returns conversations with their matching messages, newest conversation first.

### Get conversation

`GET {base_path}/{conversation_id}`

Returns the conversation when it belongs to the selected organization.

### Rename conversation

`PATCH {base_path}/{conversation_id}/title`

```json
{
  "title": "Updated billing question"
}
```

### Change status

`PATCH {base_path}/{conversation_id}/status`

```json
{
  "status": "completed"
}
```

Valid statuses are `active` and `completed`.

### Delete conversation

`DELETE {base_path}/{conversation_id}`

Returns `204 No Content`. Database cascades remove associated messages and
document metadata.

## Messages

### Get a message author

`GET /api/v1/organizations/{organization_id}/messages/{message_id}/author`

Returns the user who authored a user message. The message must belong to a
conversation in the selected organization.

Assistant messages, missing messages, and messages outside the selected
organization return `404 Not Found`:

```json
{
  "detail": "Message author not found"
}
```

### List messages

`GET {base_path}/{conversation_id}/messages?limit=100&offset=0`

Messages are returned oldest first.

- `limit`: 1–200, default `100`
- `offset`: zero or greater, default `0`

### Search within a conversation

`GET {base_path}/{conversation_id}/messages/search?query=billing`

Uses case-insensitive literal substring matching and returns matches oldest
first.

### Send a message and stream the assistant response

`POST {base_path}/{conversation_id}/messages`

```json
{
  "content": "How can I update my billing information?"
}
```

Returns `200 OK` with `Content-Type: text/event-stream`. The user message stores
the authenticated user as `author_user_id`; the assistant message has no author.

Event sequence:

```text
event: user_message
data: {"id":"...","author_user_id":"...","role":"user","content":"..."}

event: assistant_chunk
data: {"content":"Lorem ipsum dolor sit amet "}

event: assistant_message
data: {"id":"...","author_user_id":null,"role":"assistant","content":"..."}

event: done
data: {}

```

Use `fetch()` and consume `response.body`; browser `EventSource` supports only
GET requests.

## Documents

Documents derive organization ownership through their conversation. They do not
store `organization_id`, and only metadata is retained.

### Get a document uploader

`GET /api/v1/organizations/{organization_id}/documents/{document_id}/uploader`

Returns the user who uploaded the document metadata. Missing documents,
documents without a retained uploader, and documents outside the selected
organization return `404 Not Found`.

### List documents

`GET /api/v1/organizations/{organization_id}/documents?limit=50&offset=0`

Returns metadata from conversations in the selected organization, newest first.

- `limit`: 1–100, default `50`
- `offset`: zero or greater, default `0`

### Add document metadata

`POST /api/v1/organizations/{organization_id}/conversations/{conversation_id}/documents`

```json
{
  "filename": "billing-guide.pdf",
  "file_type": "pdf",
  "file_size": 245760
}
```

The conversation must belong to the selected organization. The authenticated
user is stored as `uploaded_by_user_id`.

- `file_type`: `pdf`, `docx`, or `txt`
- `file_size`: positive integer in bytes
- Success: `201 Created`

## Dashboard

### Message count

`GET /api/v1/organizations/{organization_id}/dashboard/messages/count`

Counts user and assistant messages across the selected organization's
conversations.

```json
{
  "total_messages": 42
}
```

### Dashboard root

`GET /api/v1/organizations/{organization_id}/dashboard`

Currently returns placeholder data after validating membership.

## System

- `GET /` — placeholder root response
- `GET /health` — process-level health check; does not query PostgreSQL

