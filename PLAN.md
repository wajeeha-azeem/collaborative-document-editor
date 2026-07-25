# Collaborative Document Editor - Project Plan

## Goal

Build a lightweight collaborative document editor inspired by Google Docs.

The goal is not to recreate Google Docs completely. The focus is delivering a polished product slice that demonstrates:

- Document creation and editing
- Rich text editing experience
- File import workflow
- Document sharing
- Persistent storage
- Good engineering practices

## Target Users

Teams that need a simple way to create, edit, and share documents internally.

## MVP Features

### 1. Document Management

Users can:

- Create new documents
- Rename documents
- View their documents
- Reopen saved documents
- Delete documents (optional if time allows)

### 2. Rich Text Editing

The editor supports:

- Bold
- Italic
- Underline
- Headings
- Bullet lists
- Numbered lists

Document formatting should persist after saving.

### 3. File Upload

Supported file types:

- `.txt`
- `.md`

Workflow:

Upload file → Extract content → Create editable document

Unsupported file types should display a clear validation message.

### 4. Sharing

Users can:

- Share documents with another user
- View documents shared with them
- See distinction between owned and shared documents

Sharing model:

- One document owner
- Shared users have edit access

Authentication is simplified using seeded users.

### 5. Persistence

Store:

- Users
- Documents
- Document content
- Sharing relationships

Data should remain available after refresh.

---

# Technical Approach

## Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Tiptap rich text editor

## Backend

- Next.js Route Handlers
- Prisma ORM

## Database

- PostgreSQL (Neon recommended for local + Vercel)

Reason:

Postgres works on serverless hosts. Neon’s free tier keeps setup simple while matching a real deployment path.

---

# Scope Decisions

## Included

✅ Document CRUD  
✅ Rich text editing  
✅ File import  
✅ Sharing  
✅ Persistence  
✅ Automated test  

## Intentionally Excluded

❌ Real-time collaboration  
❌ Comments  
❌ Version history  
❌ Advanced permissions  
❌ Full authentication system  
❌ DOCX parsing  

Reason:

The goal is depth and quality in core workflows rather than incomplete implementation of many features.

---

# Implementation Milestones

## Milestone 1 - Project Setup

- Create Next.js application
- Configure styling
- Configure Prisma
- Setup database

## Milestone 2 - User Flow

- Seed users
- Implement simple user selection
- Create dashboard

## Milestone 3 - Document Editor

- Create documents
- Load documents
- Save documents
- Add Tiptap editor

## Milestone 4 - File Import

- Upload files
- Parse content
- Create documents

## Milestone 5 - Sharing

- Share documents
- Display owned/shared documents

## Milestone 6 - Quality

- Add validation
- Add automated test
- Deploy
- Complete documentation

---

# Success Criteria

The project is successful when a reviewer can:

1. Open the deployed application
2. Select a user
3. Create a document
4. Edit formatted content
5. Refresh and see saved data
6. Upload a text file
7. Share a document with another user
8. Access the shared document