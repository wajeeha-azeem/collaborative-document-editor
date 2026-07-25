# Collaborative Docs

A lightweight collaborative document editor for creating, editing, importing, and sharing rich-text documents. Built as a full-stack product engineering take-home.

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **Prisma** + **SQLite**
- **Tiptap** rich text editor
- **Vitest** for automated tests

## Prerequisites

- Node.js **20.9+** (use `nvm use` — see `.nvmrc`)
- npm

## Setup

```bash
nvm use
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local app |
| `npm run build` | Production build |
| `npm test` | Run Vitest suite |
| `npm run db:seed` | Seed Alice & Bob |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | ESLint |

## Demo users

There is no password auth. On the home screen, pick a seeded user:

| User | Role in demos |
|------|----------------|
| **Alice** | Typical document owner |
| **Bob** | Collaborate via sharing |

Selection is stored in `localStorage` (`cde:current-user`).

## Features

- Select Alice or Bob and continue to the dashboard
- Create documents (default title: **Untitled document**)
- Rich text editing: bold, italic, underline, H1/H2, bullet & numbered lists
- Autosave for title and content, with save status
- Import `.txt` / `.md` / `.docx` (max 5 MB) into editable documents
- Share owned documents with another user (edit access)
- Dashboard separates **Your documents** and **Shared with you**

## Suggested review flow

1. Select **Alice** → Continue to dashboard  
2. Create a document → edit + rename → confirm **Saved** → refresh  
3. Share with **Bob**  
4. Switch user → **Bob** → open from **Shared with you** → edit  
5. Import a `.txt`, `.md`, or `.docx` file  
6. Run `npm test`

## Limitations

- Auth is demo-only (seeded users + `localStorage` / cookie / `x-user-id` header)
- Not real-time collaborative editing (no live cursors / CRDT); concurrent saves use optimistic `updatedAt` checks
- Markdown import is a lightweight converter, not a full Markdown engine
- SQLite is local-file based; serverless hosts need a different production DB strategy
- No document delete UI (optional scope)

## Future improvements

- Proper Hosted database
- Cookie-based session instead of client header auth
- View-only share role (currently share = edit)
- Document delete and richer import formats
- End-to-end browser tests (Playwright) if needed

## License

Private take-home submission.
