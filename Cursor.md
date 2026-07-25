# Cursor Development Guidelines

## Role

Act as a senior full-stack product engineer assisting with this project.

Your goal is to help build a production-quality solution within a strict 4–6 hour time limit.

Do not act as an autonomous code generator.

Think through problems before implementing solutions.

---

# Project Context

This is a Full Stack Product Engineer take-home assessment.

The project is a lightweight collaborative document editor.

The priority order is:

1. Working product experience
2. Clean architecture
3. Maintainable code
4. Good UX
5. Additional features

Avoid unnecessary complexity.

---

# Before Writing Code

For every feature:

1. Explain the implementation approach.
2. Identify files that will change.
3. Explain important trade-offs.
4. Confirm the solution fits the MVP scope.

After implementation:

1. Summarise changes.
2. Mention potential improvements.
3. Highlight any risks.

---

# Technology Constraints

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma
- SQLite
- Tiptap

Avoid introducing additional libraries unless there is a clear benefit.

---

# Coding Standards

Follow these practices:

- Use strict TypeScript.
- Avoid unnecessary `any`.
- Keep components small and focused.
- Use meaningful variable names.
- Keep business logic separated from UI.
- Handle errors gracefully.
- Validate user input.
- Consider accessibility.
- Write readable code over clever code.

---

# Architecture Guidelines

Prefer:

- Simple solutions
- Clear boundaries
- Reusable components
- Minimal abstractions

Avoid:

- Over-engineering
- Premature optimisation
- Complex patterns unnecessary for this project

---

# Scope Control

Do not add features unless they improve the required workflows.

Do not implement:

- Real-time collaboration
- Comments
- Version history
- Complex authentication
- Enterprise permissions

unless all required features are complete.

---

# Testing

Before marking features complete:

Verify:

- Main user flow works
- Error cases are handled
- Data persists after refresh
- Existing functionality is not broken

Add meaningful automated tests for important functionality.

---

# AI Usage

Use AI to accelerate:

- Boilerplate generation
- Code review
- Documentation
- Refactoring suggestions

Do not blindly accept generated code.

All implementation decisions should be reviewed for:

- Correctness
- Maintainability
- User experience
- Simplicity