# Architecture

## Overview

The app is a Next.js App Router product with:

- **UI** in React Server and Client Components
- **API** via Route Handlers under `src/app/api`
- **Persistence** via Prisma + SQLite
- **Editing** via Tiptap on the client, with HTML stored in the database

```text
Browser
  ├─ User selection (localStorage session)
  ├─ Dashboard (lists owned + shared docs)
  └─ Document editor (Tiptap + autosave)
        │
        ▼
Next.js Route Handlers
  ├─ /api/documents
  ├─ /api/documents/[id]
  ├─ /api/documents/[id]/shares
  └─ /api/users
        │
        ▼
Prisma Client ──► SQLite (prisma/dev.db)
```

## Key directories

```text
src/
  app/                 # Routes (pages + API)
  components/          # UI (editor, dashboard, share, import)
  hooks/               # Client hooks (current user session)
  lib/                 # Domain helpers (access, import, errors, prisma)
prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Data model

- **User** — seeded demo identities (`Alice`, `Bob`)
- **Document** — `title`, HTML `content`, `ownerId`
- **DocumentShare** — unique `(documentId, userId)`; shared users get edit access

## Auth model (intentionally simple)

1. User picks Alice/Bob on `/`
2. Session `{ id, name }` is stored in `localStorage`
3. API calls send `x-user-id`
4. Server validates the user exists, then enforces ownership / share rules

This avoids building a full auth system while keeping clear authorization boundaries for the MVP.

## Document access

`userCanAccessDocument` allows:

- the document **owner**, or
- any user with a **DocumentShare** row

Used by document GET/PATCH so shared collaborators can open and save.

## Editing & persistence

- Tiptap StarterKit provides required formatting
- Content is saved as **HTML** (good round-trip for this editor set)
- Title and content autosave through `PATCH /api/documents/[id]`
- Save status is shown in the editor chrome

## File import

Client-side validation and read (`.txt` / `.md` / `.docx`), conversion to simple HTML in `src/lib/file-import.ts` (Word via mammoth), then `POST /api/documents` with title + content.

## Testing

Vitest covers:

- file import validation / conversion
- sharing access + duplicate-share DB constraint

Tests use an isolated SQLite file (`prisma/test.db`), not the dev database.

## Design choices

| Choice | Why |
|--------|-----|
| SQLite | Fast local setup for the assessment |
| localStorage session | Matches “seeded users”, minimal ceremony |
| HTML content | Simple Tiptap save/load |
| Share = edit | Matches product plan; no advanced ACL |
| No real-time sync | Explicitly out of scope |
