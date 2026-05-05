# TaskFlow - Real-Time Kanban System

TaskFlow is a full-stack, real-time Kanban board inspired by Linear.  
It is built with a server-authoritative architecture, event-driven undo system, and realtime synchronization using Ably.

---

# Tech Stack

Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- dnd-kit (drag and drop)

Backend
- Next.js API Routes (Route Handlers)
- Prisma ORM
- PostgreSQL
- NextAuth (authentication)

Realtime
- Ably Realtime

State Architecture
- Server-authoritative state model
- Event-driven undo system
- Soft delete system
- Optimistic UI updates

---

# Project Structure

The project follows a modular Next.js full-stack architecture with clear separation between frontend UI, API routes, database layer, and realtime/event system.

```text
web/
├── src/
│
│   ├── app/
│   │
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   │       # Main Kanban board UI
│   │   │       # Drag & drop (dnd-kit)
│   │   │       # Realtime sync (Ably)
│   │   │       # Undo UI trigger
│   │   │
│   │   ├── api/
│   │   │
│   │   │   ├── tasks/
│   │   │   │   ├── route.ts
│   │   │   │   # GET: fetch tasks
│   │   │   │   # POST: create task
│   │   │   │
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   # PATCH: update task (title, status, description)
│   │   │   │   # DELETE: soft delete + create action log
│   │   │   │
│   │   │   │   └── reorder/
│   │   │   │       └── route.ts
│   │   │   │       # Server-authoritative drag reorder
│   │   │   │       # Bulk update positions + status
│   │   │   │
│   │   │   ├── actions/
│   │   │   │   └── undo/
│   │   │   │       └── route.ts
│   │   │   │       # Undo last action (DELETE rollback)
│   │   │   │       # Restores task from snapshot
│   │   │   │
│   │   │   └── health/
│   │   │       └── route.ts
│   │   │       # Optional system check endpoint
│   │
│   │   ├── layout.tsx
│   │   └── globals.css
│
│   ├── components/
│   │
│   │   ├── TaskCard.tsx
│   │   │   # Draggable task item
│   │   │
│   │   ├── TaskSidebar.tsx
│   │   │   # Create / edit / delete task UI
│   │   │   # Supports title, status, description
│   │   │
│   │   └── ui/
│   │       # (Optional reusable UI components)
│   │
│   ├── lib/
│   │
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   │   # Prisma client singleton
│   │   │
│   │   ├── auth.ts
│   │   │   # NextAuth configuration
│   │   │
│   │   ├── realtime.ts
│   │   │   # Ably publisher (publish("bulk_update"))
│   │   │
│   │   └── utils.ts
│   │
│   ├── types/
│   │   └── task.ts
│   │       # Task type definition (status, position, etc.)
│   │
│   └── middleware.ts
│       # Optional auth protection
│
├── prisma/
│
│   ├── schema.prisma
│   │
│   │   Models:
│   │   - User
│   │   - Task
│   │       - title
│   │       - description
│   │       - status
│   │       - position
│   │       - deletedAt (soft delete)
│   │   - Action
│   │       - type (DELETE)
│   │       - taskId
│   │       - userId
│   │       - expiresAt
│   │       - canceled
│   │
│   └── migrations/
│
├── .env
│   # DATABASE_URL
│   # NEXTAUTH_SECRET
│   # ABLY_API_KEY
│   # NEXT_PUBLIC_ABLY_KEY
│
├── next.config.js
├── package.json
└── tsconfig.json
```

---

# Architecture Overview

The system is designed using a **server-authoritative, event-driven architecture** similar to Linear.

---

## Frontend Layer

Located in `web/src/app` and `web/src/components`

Responsibilities:
- Kanban board rendering
- Drag-and-drop interactions (dnd-kit)
- Task creation, editing, deletion
- Optimistic UI updates
- Undo UI handling
- Realtime updates via Ably

The frontend never owns final state.

---

## API Layer (Next.js Route Handlers)

Located in `web/src/app/api`

Responsibilities:
- Task CRUD operations
- Drag-and-drop reorder logic
- Soft delete system
- Action logging for undo system
- Undo execution endpoint

All requests are validated against authenticated user session.

---

## Database Layer (Prisma + PostgreSQL)

Located in `prisma/schema.prisma`

### Core Models

User
- Authentication identity
- Owns tasks and actions

Task
- Core Kanban entity
- title
- description
- status (TODO, IN_PROGRESS, DONE)
- position (ordering)
- deletedAt (soft delete support)

Action
- Event log system for undo functionality
- Stores reversible operations
- Supports DELETE rollback via snapshot storage
- Extensible for CREATE, UPDATE, REORDER actions

---

## Realtime Layer (Ably)

Located in `web/src/lib/realtime.ts`

Used for:
- Broadcasting task updates
- Synchronizing multiple clients
- Real-time Kanban board sync

Events:
- bulk_update → full board refresh
- updated → single task update

---

## Undo System (Event-Based Architecture)

The undo system is implemented as an **event log**, not direct reversal.

### Flow:
1. User deletes a task
2. Task is soft-deleted
3. Action record is created with snapshot
4. Undo endpoint reads latest action
5. Task is restored from snapshot
6. Action is removed

### Benefits:
- Safe rollback of operations
- Foundation for multi-step undo stack
- Future event sourcing capability

---

## Drag & Drop System

Uses dnd-kit with server-authoritative ordering.

### Flow:
1. User drags task
2. Client computes tentative state
3. Server receives updated list
4. Server validates ownership
5. Server persists ordering
6. Server broadcasts via Ably

Server is always source of truth.

---

## Key Design Principles

- Server is the single source of truth
- Client state is optimistic only
- All mutations validated on backend
- Undo system is event-based
- Soft deletes instead of hard deletes
- Realtime sync ensures multi-user consistency

---

## Future Improvements

- Multi-step undo/redo (Linear-style)
- Full event sourcing architecture
- Conflict resolution for concurrent edits
- Task history timeline
- Collaborative cursors / presence system
- Role-based access control
- Background cleanup for expired actions
- Performance optimization for large boards