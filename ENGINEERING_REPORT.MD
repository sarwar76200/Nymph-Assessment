# Engineering Report

## 1. Project Overview

This project is a full-stack, customer-facing dashboard for working with
AI-assisted support conversations. A user can sign up, log in, work across
multiple organizations, create and manage conversations, exchange messages
with an AI assistant, search message history, and attach PDF, DOCX,
or TXT documents to a conversation.

The dashboard includes conversation and message statistics, recent
conversations, recent documents, user information, organization switching.
Assistant responses are streamed to the frontend to show the interaction
model that could later be connected to a real language model.

## 2. Architecture

The repository is organized as a small monorepo with separate frontend and
backend applications:

```text
.
├── frontend/                 Next.js application
│   └── src/
│       ├── app/              App Router pages and global styles
│       ├── components/       Dashboard, authentication, and chat UI
│       └── lib/              Authentication and organization helpers
├── backend/                  FastAPI application
│   ├── app/
│   │   ├── routes/           REST and SSE endpoints
│   │   ├── dependencies.py   Authentication and organization authorization
│   │   ├── models.py         SQLAlchemy database models
│   │   ├── schemas.py        Pydantic request and response models
│   │   └── security.py       Password hashing and JWT handling
│   └── migrations/           Multi-organization migration scripts
└── resources/                Assessment materials and assumptions
```

### Frontend

The frontend uses Next.js App Router, React, TypeScript, and Tailwind CSS.
Organization selection, conversations, and documents are separated into React
context providers. Authentication uses browser-storage helpers and an
authentication guard rather than a dedicated context. Components keep
transient UI state, such as open dialogs, chat input, and search results,
locally.

The access token, authenticated user, and selected organization ID are
stored in browser storage so the session and workspace can be restored
after a refresh. Protected pages use an authentication guard.

Messages are rendered optimistically. A submitted user message appears
immediately, while the frontend reads the assistant response from a streamed
HTTP body and progressively updates the assistant message.

### Backend

The backend uses FastAPI, SQLAlchemy, Pydantic, PostgreSQL, Psycopg, Argon2,
and JWT bearer authentication. Routes are separated by resource:
authentication, organizations, conversations, messages, documents, and
dashboard statistics.

FastAPI dependencies centralize authentication and organization membership
checks. A JWT identifies the user, while the organization UUID in the route
selects the current workspace. Resource queries also filter by organization,
preventing a conversation or document identifier from being used to access
another organization's data.

### Database

PostgreSQL stores all users and organizations in seperate tables. The
`organization_memberships` table connects users to organizations, allowing one
user to belong to several organizations. Each conversation belongs to one
organization, while messages and documents belong to a conversation.

Foreign keys enforce ownership and preserve relationships between records.
Valid status, role, file type, and file size values are checked by the backend
request schemas. Organization deletion cascades to its shared content, while
deleting a user sets author and uploader references to `NULL` so organization
data is retained.

## 3. Engineering Decisions


### Decision 1: React Context and local state instead of Redux

**What I chose**

I kept shared dashboard data in a few React context providers: one for
organizations, one for conversations, and one for documents. Temporary UI
state, such as open dialogs or the chat input, stays in the components itself.
When a user sends a message, the UI shows it right away instead of
waiting for the full page to reload.

**Alternatives considered**

- Using Redux for all shared state
- Passing state down through many component props
- Reloading the whole dashboard after every change
- Using a data-fetching library such as TanStack Query

**Why I selected it**

This app is not large enough to need Redux. The shared data is limited and
easy to split by topic, so React Context is enough. Updating only the parts
that changed also keeps the UI responsive. If the app grows and needs better
caching or offline support later, a library like TanStack Query would be a
good next step.


### Decision 2: Server-Sent Events for assistant responses

**What I chose**

The message creation endpoint returns a Server-Sent Events stream. The
frontend uses `fetch` and the Streams API to process the saved user message,
assistant chunks, final assistant message, and completion event.

**Alternatives considered**

- Waiting for a complete JSON response
- Polling for assistant progress
- Using a WebSocket connection

**Why I selected it**

An assistant response is primarily a one-way stream from the server to the
client. SSE provides incremental rendering and good performance
without the connection management required by WebSockets. A streamed `POST`
request also allows the original message body and bearer token to be sent
normally. Polling would add latency and unnecessary repeated requests, while a
single JSON response would make the interface feel unresponsive.

### Decision 3: Supporting users in multiple organizations

**What I chose**

I used an `organization_memberships` table to connect users and organizations.
This lets one user belong to several organizations and one organization have
several users. Organization-related API URLs include the organization ID, and
the backend checks that the current user belongs to that organization before
returning its data.

**Alternatives considered**

- Making a separate database or schema for every organization

**Why I selected it**


The membership table supports users working in multiple organizations without
duplicating accounts. Keeping the organization ID out of the JWT allows users
to switch organizations without logging in again. Storing the data in the same
database is simpler for this application than creating a separate database for
every organization. Including the organization ID in API URLs also makes it
clear which organization's data is being requested.

## 4. AI Collaboration

### AI tools used

I used Cursor's AI coding agent throughout development for codebase
exploration, implementation assistance, debugging, and documentation.

### Typical workflow

My usual workflow was:

1. Describe a feature and provide the relevant API contract.
2. Ask the AI to inspect the existing implementation before changing it.
3. Review the proposed approach and clarify important UX or data-model choices.
4. Let the AI implement a focused change.
5. Review the resulting diff and test the behavior in the browser.
6. Run ESLint and the Next.js production build to catch lint, type, and
   rendering errors.
7. Iterate on issues rather than accepting the first generated solution.

### Example where AI significantly helped

AI was especially useful when the application changed from direct user
ownership to multi-organization ownership. This change affected the database
schema, authorization dependencies, route paths, response types, frontend
providers, local persistence, and every conversation, message, document,
search, and statistics request.

The AI helped trace those dependencies, create staged SQL migrations for
existing data, centralize organization URL construction, add an organization
provider and switcher, and identify stale organization-selection edge cases.
This reduced the chance of leaving an old unscoped endpoint or ownership field
in the codebase.

### Example where AI produced an incorrect solution

AI initially used smooth scrolling from the top of the conversation to the
newest message. This was technically functional but produced poor UX for
long conversations. After testing it manually, I changed the initial position
to start close to the latest messages while preserving smooth scrolling
for newly received messages.

### How I validated AI-generated code

I compared generated API calls with the documented request and response
contracts, reviewed database queries for organization filters, and checked
error paths such as `401`, `403`, `404`, and validation failures. Frontend
changes were validated with ESLint and a production Next.js build, which also
runs TypeScript checks. I also exercised the main flows in the browser during
development, including authentication, conversation operations, streaming
messages, search navigation, document metadata, and organization switching.

## 5. Challenges

The most difficult challenge was introducing multi-organization support after
the original implementation treated conversations as directly owned by one
user.

This was more than a schema rename. Existing users and conversations needed to
remain valid, shared content needed creator and author attribution, and every
request needed organization-aware authorization. Updating only the routes
would have risked cross-organization access, while applying non-null database
constraints before backfilling data would have broken the migration.

I solved this with a staged migration:

1. Create organizations and memberships.
2. Add nullable organization and attribution columns.
3. Create a personal organization for each existing user and backfill data.
4. Validate the migrated rows and add constraints and indexes.
5. Remove the legacy conversation owner column.

The backend now resolves the current organization through a reusable
dependency and filters every organization-owned resource. The frontend first
loads the user's organizations, restores a valid selection, and then mounts
the organization-scoped dashboard providers. Switching organizations remounts
that subtree so conversation, document, search, and open-chat state cannot
leak between workspaces.

## 6. Known Limitations

- Assistant responses are predefined Lorem Ipsum rather than generated by an
  AI model.
- Search uses case-insensitive substring matching rather than PostgreSQL
  full-text search or semantic/vector search.
- The backend can add an existing user to an organization by email, but the
  frontend has no member-management UI. Removing members, leaving, renaming,
  and deleting organizations are also not implemented.
- JWTs are stored in `localStorage` and there is no refresh-token flow.
- Conversation, message, and document list endpoints support pagination, but
  organization and search endpoints do not. The dashboard displays a limited
  recent subset and has no full pagination UI.
- SQL migrations are manually ordered scripts rather than being managed by a
  migration framework such as alembic.
- There is no unit, integration, or end-to-end tests.

## 7. Reflection

### What did I learn?

I learned how quickly a change in ownership semantics propagates through a
full-stack application. Multi-organization support affected more than the
database: API design, authorization, migration order, frontend state,
persistence, error handling, and UX all needed to follow the same organization
access rules.

I also gained practical experience processing SSE with the browser Streams
API. Correct streaming requires handling partial chunks, event boundaries,
optimistic state, final persisted records, interrupted responses, and scroll
behavior together.

### What would I improve with one additional day?

I would add organization member management to the frontend. The backend can
already add an existing user by email, but the dashboard does not expose this
operation and has no invitation flow for people without an account.

I would also consider introducing Alembic to manage future database changes.
I would review whether documents should be retained when a conversation is
deleted instead of always being deleted with it.

### What took the longest?

The conversation feature took the longest because it combined optimistic
messages, SSE parsing, a typing effect, document events, chronological
interlacing, targeted search-result scrolling, error recovery, and local
dashboard count and timestamp updates. The later multi-organization change
then required all of those operations to remain correctly scoped while users
switch organizations.