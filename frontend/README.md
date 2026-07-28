# Nymph Customer Support Dashboard Frontend

This directory contains the Next.js App Router frontend for the customer
support dashboard. See the [root README](../README.md) for full backend,
database, and deployment instructions.

## Setup

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The FastAPI backend must
also be running.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run start
```

The main dashboard is implemented in `src/app/page.tsx`.
