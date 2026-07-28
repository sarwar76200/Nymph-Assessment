# AI-Ready Customer Support Dashboard

A full-stack customer-support dashboard built with Next.js, FastAPI, SQLAlchemy,
and PostgreSQL. Users can work across multiple organizations, manage
conversations and documents, search message history, and receive streamed assistant responses.

## Features

- JWT signup, login, client-side logout, and session restoration
- Multi-organization membership and organization switching
- Organization-scoped conversation creation, listing, renaming, status updates,
  and deletion
- User and assistant message history
- Server-Sent Events (SSE) for simulated streaming assistant responses
- Case-insensitive substring search across an organization's conversations;
  per-conversation search is available through the backend API
- PDF, DOCX, and TXT files uploads
- Organization-scoped message totals and counts from the loaded conversation
  and document lists
- Responsive Next.js interface


## Assumptions

The assessment had several ambiguities, therefore I had to make a few assumptions
- This is a customer-facing dashboard where organization members manage
   shared AI support conversations and document metadata in their workspace.
- Documents are associated with a conversation [clarified].
- Title of the conversation is entered manually for now.
- Messages are stored under a conversation with roles and timestamps.
- Use only substring matching for searching.

#### New requirement - Organizations

- All members in an organization have equal permissions for now.

## Architecture

The repository contains two applications:

- `frontend/`: Next.js App Router application
- `backend/`: FastAPI REST and SSE API

PostgreSQL stores all users and organization information in seperate tables.
An user may belong to multiple organizations, but each conversation belongs to
exactly one organization. Messages and documents belong to an organization
through their conversation.

JWTs identify users only. The selected organization UUID is included in scoped
API paths, allowing users to switch organizations without logging in again.

### ER diagram

![ER diagram](backend/ER%20Diagram%20Updated.svg)

## Technology

Frontend:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide React

Backend:

- FastAPI
- SQLAlchemy 2
- PostgreSQL
- Psycopg 3
- Pydantic
- Argon2 password hashing
- PyJWT

## Repository structure

```text
.
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── security.py
│   ├── migrations/
│   ├── API Docs.md
│   ├── Schema.md
│   └── requirements.txt
├── frontend/
│   └── src/
└── resources/
```

## Prerequisites

- Node.js 20 or newer
- npm
- Python 3.11 or newer
- PostgreSQL database

## Database setup

For a new database, create tables that match the definitions in
[`backend/Schema.md`](backend/Schema.md).

For an existing single-user database, back it up and run these migrations in
order during a maintenance window:

1. `backend/migrations/001_create_organization_tables.sql`
2. `backend/migrations/002_add_multi_organization_columns.sql`
3. `backend/migrations/003_backfill_multi_organization_data.sql`
4. `backend/migrations/004_add_multi_organization_constraints.sql`
5. `backend/migrations/005_remove_legacy_conversation_owner.sql`

Do not run both the fresh-database DDL and the existing-data migrations against
the same database.

## Backend setup

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://user:password@host:port/database?sslmode=require
JWT_SECRET_KEY=replace-with-a-random-secret-of-at-least-32-characters
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

Install dependencies and start the API:

```bash
cd backend
python -m venv .venv
```

Activate the environment on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Activate it on macOS or Linux:

```bash
source .venv/bin/activate
```

Then run:

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`.

Interactive documentation:

- Swagger UI: `http://localhost:8000/docs`

## Frontend setup

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Install dependencies and start Next.js:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Organization-scoped API

Protected requests use:

```http
Authorization: Bearer <access_token>
```

Organization resources include the selected UUID:

```text
/api/v1/organizations/{organization_id}/conversations
/api/v1/organizations/{organization_id}/documents
/api/v1/organizations/{organization_id}/dashboard/messages/count
```

On signup, the backend creates a personal organization automatically. Users can
create additional organizations in the dashboard. The backend API can add an
existing user to an organization by email, but this operation is not exposed
in the frontend.

See [`backend/API Docs.md`](backend/API%20Docs.md) for endpoint details,
validation rules, status codes, and SSE events.

## Useful commands

Frontend:

```bash
npm run dev
npm run lint
npm run build
npm run start
```

Backend:

```bash
uvicorn app.main:app --reload
```

## Deployment

Recommended deployment:

- Frontend: Vercel
- Backend: Render
- Database: Aiven PostgreSQL

Set `NEXT_PUBLIC_API_URL` to the deployed backend URL. Configure the backend
environment variables on Render and ensure its CORS allowlist contains the
deployed frontend origin.

Suggested Render commands:

```text
Build: pip install -r requirements.txt
Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
Health check: /health
```

## Current limitations

- Assistant responses are simulated Lorem Ipsum rather than generated by an AI
  model.
- Search uses database substring matching rather than full-text or vector
  search.
- Conversation and document cards count the records loaded by the frontend,
  up to 100, rather than using dedicated total-count endpoints.
- Organization member management and the "View all" list pages are not
  implemented in the frontend.
- Database migrations are SQL scripts and are not managed by Alembic.

## Documentation

- [API documentation](backend/API%20Docs.md)
- [Database schema](backend/Schema.md)
- [ER diagram](backend/ER%20Diagram%20Updated.svg)
- [Assessment assumptions](resources/assumptions.txt)