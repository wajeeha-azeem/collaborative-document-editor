# Collaborative Docs

A lightweight collaborative document editor for creating, editing, importing, and sharing rich-text documents. Built as a full-stack product engineering take-home.

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **Prisma** + **PostgreSQL** (Neon recommended)
- **Tiptap** rich text editor
- **Vitest** for automated tests

## Prerequisites

- Node.js **20.9+** (use `nvm use` — see `.nvmrc`)
- npm
- A Postgres database (free [Neon](https://neon.tech) project works)

## Setup

1. Create a Neon project and copy the connection string.
2. Configure env and install:

```bash
nvm use
npm install
cp .env.example .env
# Paste your Neon URL into DATABASE_URL in .env
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local app |
| `npm run build` | Migrate + production build (Vercel-friendly) |
| `npm test` | Run Vitest suite |
| `npm run db:seed` | Seed Alice & Bob |
| `npm run db:deploy` | Apply migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | ESLint |

## Deploy on Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set **Node.js 20.x** in project settings.
4. Add env var `DATABASE_URL` = your Neon connection string (pooled URL is fine).
5. Deploy. Build runs `prisma migrate deploy && next build`.
6. Seed demo users once (from your machine):

```bash
DATABASE_URL="your-neon-url" npm run db:seed
```

## Demo users

There is no password auth. On the home screen, pick a seeded user:

| User | Role in demos |
|------|----------------|
| **Alice** | Typical document owner |
| **Bob** | Collaborate via sharing |

Selection is stored in `localStorage` (`cde:current-user`) and synced to a cookie for server authz.

## Features

- Select Alice or Bob and continue to the dashboard
- Create documents (default title: **Untitled document**)
- Rich text editing: bold, italic, underline, H1/H2, bullet & numbered lists
- Autosave for title and content, with save status
- Import `.txt` / `.md` / `.docx` (max 5 MB) into editable documents
- Share owned documents with another user (edit access)
- Version history (manual Save version + restore)
- Dashboard separates **Your documents** and **Shared with you**

## Suggested review flow

1. Select **Alice** → Continue to dashboard  
2. Create a document → edit + rename → confirm **Saved** → refresh  
3. Share with **Bob**  
4. Switch user → **Bob** → open from **Shared with you** → edit  
5. Import a `.txt`, `.md`, or `.docx` file  
6. Click **Save version**, then restore an older checkpoint  
7. Run `npm test`

## Limitations

- Auth is demo-only (seeded users + `localStorage` / cookie / `x-user-id` header)
- Not real-time collaborative editing (no live cursors / CRDT); concurrent saves use optimistic `updatedAt` checks
- Markdown import is a lightweight converter, not a full Markdown engine
- No document delete UI (optional scope)

## Future improvements

- Cookie-only session (drop client header auth)
- View-only share role (currently share = edit)
- Document delete and richer import formats
- End-to-end browser tests (Playwright) if needed

## License

Private take-home submission.
