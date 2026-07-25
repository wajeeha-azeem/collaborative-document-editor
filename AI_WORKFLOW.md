# AI Workflow

How AI tooling was used while building this take-home, and what was reviewed manually.

## Tools

- **Cursor** agent for scaffolding, feature implementation, refactors, and docs
- Project guidance from `Cursor.md`, `PLAN.md`, and `TASKS.md`
- Prisma / Next.js docs consulted when APIs or defaults changed (e.g. Prisma 7 vs 6)

## How AI was used

- Generate boilerplate (Next.js app, Prisma schema, route handlers, UI components)
- Propose implementation approaches and trade-offs before coding each task
- Debug issues (e.g. dashboard fetch loop, Vitest/Node compatibility)
- Draft documentation structure and copy

## What was not left to AI alone

- Scope control (no real-time collab, no complex auth, no Playwright unless spare time)
- Product decisions (share = edit, HTML storage, header-based demo auth)
- Downgrading Prisma 7 → 6 when the SQLite adapter failed to compile locally
- Pinning Vitest 3 after Vitest 4 required newer Node APIs

## Working pattern

For each `TASKS.md` item:

1. Restate approach, files, and trade-offs
2. Implement the smallest change that meets acceptance criteria
3. Verify with `lint` / `build` / `test` or manual UI checks
4. Mark the task complete

## Risks of AI-assisted work (and mitigations)

| Risk | Mitigation |
|------|------------|
| Over-building | Stick to `TASKS.md` order and MVP exclusions |
| Subtle bugs | Manual flows + Vitest for import/sharing |
| Dependency churn | Prefer stable majors that work in this environment |
| Generated clutter | Delete non-product folders; keep repo reviewable |

## Takeaway

AI accelerated implementation, but architecture and acceptance criteria stayed human-owned via the planning docs.
