# Architecture

## Overview

The app is a Next.js App Router product with:

- **UI** in React Server and Client Components
- **API** via Route Handlers under `src/app/api`
- **Persistence** via Prisma + PostgreSQL
- **Editing** via Tiptap on the client, with HTML stored in the database

```text
Browser
  ├─ User selection (localStorage session + cookie)
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
Prisma Client ──► PostgreSQL (Neon)
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
3. The selected user id is also synced to a `cde-user-id` cookie so Server Components can authorize
4. API calls send `x-user-id` (cookie is a fallback)
5. Server validates the user exists, then enforces ownership / share rules

This avoids building a full auth system while keeping clear authorization boundaries for the MVP — including the document page, which previously loaded content without an access check.

## Document access

`userCanAccessDocument` allows:

- the document **owner**, or
- any user with a **DocumentShare** row

Used by document GET/PATCH so shared collaborators can open and save.

## Editing & persistence

- Tiptap StarterKit provides required formatting
- Content is saved as **HTML** (good round-trip for this editor set)
- Title and content share one debounced save queue through `PATCH /api/documents/[id]`
- Saves send `expectedUpdatedAt`; stale clients receive **409** and reload the latest version
- Pending saves flush on tab close / navigation (`beforeunload` + keepalive)
- Content size is capped (`MAX_DOCUMENT_CONTENT_LENGTH`)
- Save status is shown in the editor chrome

No real-time merge: concurrent editors are last-write-wins with conflict detection, not CRDT.

## File import

Client-side validation and read (`.txt` / `.md` / `.docx`), conversion to simple HTML in `src/lib/file-import.ts` (Word via mammoth), then `POST /api/documents` with title + content.

## Testing

Vitest covers:

- file import validation / conversion
- document title/content helpers
- sharing access + duplicate-share DB constraint (requires `DATABASE_URL` Postgres)

Sharing DB tests create uniquely named users and clean them up afterward so they are safe against a shared Neon database.

## Design choices

| Choice | Why |
|--------|-----|
| PostgreSQL (Neon) | Works on Vercel; free tier is enough for the assessment |
| localStorage + cookie session | Matches “seeded users”, enables server-side authz |
| HTML content | Simple Tiptap save/load |
| Share = edit | Matches product plan; no advanced ACL |
| No real-time sync | Explicitly out of scope |

## Share roles

`DocumentShare.role` is `VIEW` or `EDIT`. Owners always have edit access. View-only users can open documents but cannot PATCH content or rename.

