# Submission

## Project

Collaborative Docs — lightweight Google Docs–inspired slice with create/edit, import, share, and persistence.

## How to run locally

See [README.md](./README.md).

```bash
nvm use
npm install
cp .env.example .env
# Set DATABASE_URL to your Neon Postgres connection string
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## Demo credentials

No passwords. Use the home-screen user picker:

- **Alice**
- **Bob**

## What to review

1. Select Alice → create/edit document → refresh (persistence)
2. Share with Bob → switch to Bob → open shared doc → edit
3. Import `.txt` / `.md` / `.docx`
4. `npm test` (unit + sharing tests when `DATABASE_URL` is Postgres)

## Deliverables status

| Area | Status |
|------|--------|
| Core product flows | Complete |
| Automated tests | Complete (`npm test`) |
| Documentation | Complete (README, ARCHITECTURE, AI_WORKFLOW, SUBMISSION) |
| Deployment | Ready for Vercel + Neon — set `DATABASE_URL`, deploy, then seed |

## Known limitations

- Demo auth only (localStorage + cookie + `x-user-id`)
- No real-time multiplayer editing (optimistic concurrency via `updatedAt`)
- Lightweight Markdown import

## Time / process notes

Built task-by-task from `TASKS.md` with approach/trade-off notes before each change. Prioritized working product experience over extra features.

## Contact / repo

Local repository only unless a remote URL is provided separately. **Do not assume code was pushed** unless explicitly shared.
