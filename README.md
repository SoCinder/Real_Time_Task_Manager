Project Structure

The project follows a modular Next.js full-stack architecture with clear separation between frontend UI, API routes, database layer, and realtime/event system.
...
web/
├── src/
│   ├── app/
│   │   ├── dashboard/                      # Kanban board UI (main page)
│   │   │   └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── tasks/                      # Task CRUD API
│   │   │   │   ├── route.ts               # GET / POST tasks
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts           # PATCH / DELETE task
│   │   │   │
│   │   │   ├── tasks/
│   │   │   │   └── reorder/
│   │   │   │       └── route.ts           # Drag-and-drop ordering (server-authoritative)
│   │   │   │
│   │   │   ├── actions/
│   │   │   │   └── undo/
│   │   │   │       └── route.ts           # Undo last action
│   │   │   │
│   │   │   └── health/                    # Optional health check endpoint
│   │   │
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── TaskCard.tsx                   # Draggable task card
│   │   ├── TaskSidebar.tsx                # Create / edit / delete task panel
│   │   └── ui/                            # Shared UI components
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   └── prisma.ts                  # Prisma client instance
│   │   │
│   │   ├── auth.ts                        # NextAuth config
│   │   ├── realtime.ts                    # Ably event publisher
│   │   └── utils.ts
│   │
│   ├── types/
│   │   └── task.ts                        # Task type definitions
│   │
│   └── middleware.ts                      # Route protection (if enabled)
│
├── prisma/
│   ├── schema.prisma                      # Database schema (User, Task, Action)
│   └── migrations/
│
├── .env
├── next.config.js
├── package.json
└── tsconfig.json
...

Architecture Overview

The system is designed with a server-authoritative, event-driven architecture similar to Linear.

Frontend Layer

Located in apps/web/app and components/

Responsibilities:

Kanban board rendering
Drag-and-drop interactions (dnd-kit)
Task creation, editing, deletion
Optimistic UI updates
Undo UI handling
Realtime updates via Ably

The frontend never owns final state.

API Layer (Next.js Route Handlers)

Located in:

apps/web/app/api/

Core responsibilities:

Task CRUD operations
Drag-and-drop reorder logic
Soft delete system
Action logging (undo system)
Undo execution endpoint

Each request is validated against the authenticated user before execution.

Database Layer (Prisma + PostgreSQL)

Located in:

prisma/schema.prisma
Core Models
User
Authentication identity
Owns tasks and actions
Task
Core Kanban entity
Supports:
title
description
status (TODO, IN_PROGRESS, DONE)
position (ordering)
deletedAt (soft delete)
Action
Event log system for undo functionality
Stores reversible operations
Supports DELETE rollback via snapshot storage
Extensible for CREATE / UPDATE / REORDER actions
Realtime Layer (Ably)

Located in:

lib/realtime.ts

Used for:

Broadcasting task updates
Synchronizing multiple clients
Keeping Kanban board in real-time sync

Events:

bulk_update → full board refresh
updated → single task update
Undo System (Action-Based Architecture)

The undo system works as an event log:

Flow:

User deletes a task
Task is soft-deleted in database
Action record is created with full snapshot
Undo endpoint reads last action
Task is restored from snapshot
Action is removed after execution

This enables:

Safe recovery of deleted tasks
Foundation for multi-step undo stack
Future event-sourced architecture
Drag & Drop System

Uses dnd-kit with server-authoritative ordering.

Flow:

User drags task in UI
Client computes tentative ordering
Server receives full updated list
Server validates ownership
Server persists final ordering
Server broadcasts updated state via Ably

The server is always the source of truth.

Key Design Principles
Server is the single source of truth
Client state is always optimistic
All mutations are validated on backend
Undo system is event-based (not direct mutation reversal)
Realtime sync ensures multi-user consistency
Soft deletes are preferred over hard deletes
Future Improvements
Multi-step undo/redo system (Linear-style)
Full event sourcing architecture
Conflict resolution for concurrent edits
Task version history timeline
Collaborative cursors / presence system
Role-based access control
Background cleanup for expired actions
Performance optimization for large boards