# Nymph Customer Support API

REST API for authentication, customer-support conversations, messages, document
metadata, search, and dashboard statistics.

## URLs

- Local base URL: `http://localhost:8000`
- API prefix: `/api/v1`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI schema: `http://localhost:8000/openapi.json`

JSON endpoints expect `Content-Type: application/json`.

## Authentication

Except for signup, login, root, and health checks, implemented endpoints require a
JWT bearer token:

```http
Authorization: Bearer <access_token>
```

Tokens are returned by signup and login. A missing, invalid, or expired token
returns:

```json
{
  "detail": "Could not validate credentials"
}
```

with status `401 Unauthorized`.

Resources are scoped to the authenticated user. A conversation belonging to
another user is reported as `404 Not Found` rather than exposing its existence.

## Common validation errors

FastAPI returns `422 Unprocessable Entity` when a path, query, or body value is
invalid. The response follows FastAPI's validation-error format:

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "password"],
      "msg": "String should have at least 8 characters",
      "input": "short",
      "ctx": {
        "min_length": 8
      }
    }
  ]
}
```

## System

### Root

`GET /`

Returns a placeholder response:

```json
{
  "message": "Lorem ipsum dolor sit amet."
}
```

### Health check

`GET /health`

Returns `200 OK` with the same placeholder response. This currently confirms
only that the API process is responding; it does not test the database.

## Authentication endpoints

### Create an account

`POST /api/v1/auth/signup`

Authentication is not required.

Request:

```json
{
  "name": "Alex Smith",
  "email": "alex@example.com",
  "password": "password123"
}
```

Validation:

- `name`: 1–120 characters after trimming
- `email`: valid email address
- `password`: 8–128 characters

Success: `201 Created`

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
    "email": "alex@example.com",
    "name": "Alex Smith",
    "created_at": "2026-07-27T12:00:00Z"
  }
}
```

Duplicate email: `409 Conflict`

```json
{
  "detail": "An account with this email already exists"
}
```

### Log in

`POST /api/v1/auth/login`

Authentication is not required.

Request:

```json
{
  "email": "alex@example.com",
  "password": "password123"
}
```

Success: `200 OK`

The response has the same shape as signup.

Incorrect credentials: `401 Unauthorized`

```json
{
  "detail": "Incorrect email or password"
}
```

### Get the current user

`GET /api/v1/auth/me`

Success: `200 OK`

```json
{
  "id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
  "email": "alex@example.com",
  "name": "Alex Smith",
  "created_at": "2026-07-27T12:00:00Z"
}
```

## Conversation endpoints

Conversation object:

```json
{
  "id": "19237fe6-4240-410a-9ace-ec1341410dd3",
  "user_id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
  "title": "Billing assistance",
  "status": "active",
  "created_at": "2026-07-27T12:00:00Z",
  "updated_at": "2026-07-27T12:05:00Z"
}
```

Valid statuses are `active` and `completed`.

### List conversations

`GET /api/v1/conversations`

Optional query parameters:

- `limit`: 1–100; default `50`
- `offset`: zero or greater; default `0`

Active conversations are returned before completed conversations. Each group is
sorted by `updated_at` descending.

Success: `200 OK`

```json
[
  {
    "id": "19237fe6-4240-410a-9ace-ec1341410dd3",
    "user_id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
    "title": "Billing assistance",
    "status": "active",
    "created_at": "2026-07-27T12:00:00Z",
    "updated_at": "2026-07-27T12:05:00Z"
  }
]
```

### Create a conversation

`POST /api/v1/conversations`

Request:

```json
{
  "title": "Billing assistance"
}
```

The title must contain 1–200 non-whitespace characters. New conversations have
the `active` status.

Success: `201 Created`, returning the conversation object.

### Search conversations by message content

`GET /api/v1/conversations/search?query=billing`

Search uses case-insensitive literal substring matching against message content.
Only conversations containing at least one match are returned. Conversations
are sorted by `updated_at` descending, and matching messages within each
conversation are sorted oldest first.

The query must contain 1–200 characters and cannot contain only whitespace.

Success: `200 OK`

```json
[
  {
    "id": "19237fe6-4240-410a-9ace-ec1341410dd3",
    "user_id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
    "title": "Billing assistance",
    "status": "active",
    "created_at": "2026-07-27T12:00:00Z",
    "updated_at": "2026-07-27T12:05:00Z",
    "matched_messages": [
      {
        "id": "6a9c873a-7ec1-41ee-9161-798117f223ab",
        "conversation_id": "19237fe6-4240-410a-9ace-ec1341410dd3",
        "role": "user",
        "content": "I need help with billing.",
        "created_at": "2026-07-27T12:01:00Z"
      }
    ]
  }
]
```

### Rename a conversation

`PATCH /api/v1/conversations/{conversation_id}/title`

Request:

```json
{
  "title": "Updated billing question"
}
```

Success: `200 OK`, returning the updated conversation.

Conversation unavailable: `404 Not Found`

```json
{
  "detail": "Conversation not found"
}
```

### Change conversation status

`PATCH /api/v1/conversations/{conversation_id}/status`

Request:

```json
{
  "status": "completed"
}
```

Success: `200 OK`, returning the updated conversation.

### Delete a conversation

`DELETE /api/v1/conversations/{conversation_id}`

Success: `204 No Content`

Deleting a conversation also deletes its associated messages and document
metadata when the database foreign keys use `ON DELETE CASCADE`.

### Get one conversation

`GET /api/v1/conversations/{conversation_id}`

This route currently returns placeholder data and is not yet a functional
conversation-detail endpoint.

## Message endpoints

Message object:

```json
{
  "id": "6a9c873a-7ec1-41ee-9161-798117f223ab",
  "conversation_id": "19237fe6-4240-410a-9ace-ec1341410dd3",
  "role": "user",
  "content": "I need help with billing.",
  "created_at": "2026-07-27T12:01:00Z"
}
```

Valid roles are `user` and `assistant`.

### List conversation messages

`GET /api/v1/conversations/{conversation_id}/messages`

Optional query parameters:

- `limit`: 1–200; default `100`
- `offset`: zero or greater; default `0`

Messages are returned oldest first.

Success: `200 OK`, returning an array of message objects.

### Search within one conversation

`GET /api/v1/conversations/{conversation_id}/messages/search?query=billing`

Uses case-insensitive literal substring matching and returns matching messages
oldest first.

Success: `200 OK`, returning an array of message objects.

### Send a message and stream the assistant response

`POST /api/v1/conversations/{conversation_id}/messages`

Request:

```json
{
  "content": "How can I update my billing information?"
}
```

The content cannot be blank. The server stores the user message, generates and
stores a simulated assistant message, and returns an SSE stream.

Success: `200 OK`

Response content type:

```text
text/event-stream
```

Event sequence:

```text
event: user_message
data: {"id":"...","conversation_id":"...","role":"user","content":"How can I update my billing information?","created_at":"..."}

event: assistant_chunk
data: {"content":"Lorem ipsum dolor sit amet "}

event: assistant_chunk
data: {"content":"consectetur adipiscing elit sed do "}

event: assistant_message
data: {"id":"...","conversation_id":"...","role":"assistant","content":"<complete response>","created_at":"..."}

event: done
data: {}

```

`assistant_chunk` events contain display chunks. The final
`assistant_message` event contains the complete persisted message and should
replace the temporary streaming message in the client.

Because this is a `POST` request, clients should use `fetch()` and read
`response.body`; the browser `EventSource` API supports only `GET`.

## Document metadata endpoints

Only metadata is stored. The API does not upload or retain file contents.

Document object:

```json
{
  "id": "fa32e818-0d09-4448-bb64-326bcadbb2aa",
  "conversation_id": "19237fe6-4240-410a-9ace-ec1341410dd3",
  "filename": "billing-guide.pdf",
  "file_type": "pdf",
  "file_size": 245760,
  "uploaded_at": "2026-07-27T12:10:00Z"
}
```

### List documents

`GET /api/v1/documents`

Returns documents from all conversations owned by the authenticated user,
newest first.

Optional query parameters:

- `limit`: 1–100; default `50`
- `offset`: zero or greater; default `0`

Success: `200 OK`, returning an array of document objects.

### Add document metadata

`POST /api/v1/conversations/{conversation_id}/documents`

Request:

```json
{
  "filename": "billing-guide.pdf",
  "file_type": "pdf",
  "file_size": 245760
}
```

Validation:

- `filename`: 1–255 non-whitespace characters
- `file_type`: `pdf`, `docx`, or `txt` (input is normalized to lowercase)
- `file_size`: positive integer in bytes

Success: `201 Created`, returning the document object.

## Dashboard endpoints

### Count messages

`GET /api/v1/dashboard/messages/count`

Counts user and assistant messages across all conversations owned by the
authenticated user.

Success: `200 OK`

```json
{
  "total_messages": 42
}
```

### Dashboard root

`GET /api/v1/dashboard`

This route currently returns placeholder data and is not yet a functional
dashboard-summary endpoint.



