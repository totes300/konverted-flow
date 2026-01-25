# Konverted Flow - Implementation Plan

## Summary

Build an agency-focused task management and time tracking application using the existing foundation (Next.js 16, Convex, Clerk, shadcn/ui).

**Phase 1 Scope**: Core task management + time tracking + comments
**Deferred to Phase 2**: Reports, Invoicing, Számlázz.hu/Resend integrations

---

## Key Decisions

| Area | Decision |
|------|----------|
| MVP Scope | Phased - tasks + time tracking first |
| Multi-tenancy | Single org for now |
| Integrations | Skip for MVP |
| Comments | Full activity log + TipTap comments |
| Roles | Simple (Admin/Member/Viewer) |
| Adam Review | Dedicated queue view |
| Subtasks | Inherit client + assignees from parent |
| Timer | Server-side state in Convex |

---

## Phase 1 Implementation Order

### 1A: Foundation

1. **Deploy Convex schema** - users, tasks, timeEntries, activityEvents, clients, attachments
2. **Auth helpers** (`convex/auth.ts`) - getUser, requireAuth functions
3. **Clerk webhook** (`app/api/webhooks/clerk/route.ts`) - sync users to Convex
4. **Dashboard layout** (`app/(dashboard)/layout.tsx`) - sidebar + header + timer widget

### 1B: Core Task Management

5. **Task CRUD** (`convex/tasks/`) - mutations and queries with indexes
6. **Task table component** - Notion-like spreadsheet with inline editing
7. **Task row cells** - Editable status, priority, client, assignees
8. **Task filters** - URL-based filter state
9. **Task quick-add** - Fast inline creation

### 1C: Task Popup

10. **Task popup modal** - Split-view dialog (60/40)
11. **Left panel** - Task details + subtask list
12. **Subtask inheritance** - Auto-copy client + assignees from parent
13. **Right panel** - Activity feed (system events)

### 1D: Time Tracking

14. **Timer mutations** - startTimer, stopTimer, createManualEntry
15. **Auto-stop logic** - Stop previous timer when starting new one
16. **Timer widget** - Global display in header
17. **Time pill component** - Start/stop + manual presets (15m, 30m, 1h...)
18. **Task time aggregation** - Update totalTimeSeconds on entries

### 1E: Today View

19. **Today query** - Filter status="today" items
20. **Today list** - Flat list with priority sorting
21. **Drag-drop reorder** - Using @dnd-kit
22. **Context line** - Show parent task name for subtasks

### 1F: Comments & Activity

23. **TipTap setup** - Rich editor with @mentions
24. **Comment CRUD** - Create, edit, delete comments
25. **@mention detection** - Parse and store mentioned users
26. **Image attachments** - Upload to Convex storage
27. **Combined feed** - Merge system events + comments

### 1G: Clients & Review

28. **Client CRUD** (`convex/clients/`) - Manage clients + hourly rates
29. **Clients page** (`app/(dashboard)/clients/`) - Table + form
30. **Adam review page** (`app/(dashboard)/review/`) - Dedicated queue

---

## Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
    isAdam: v.boolean(),
    activeTimeEntryId: v.optional(v.id("timeEntries")),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  clients: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    defaultHourlyRate: v.optional(v.number()),
    isArchived: v.boolean(),
  })
    .index("by_name", ["name"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("backlog"), v.literal("todo"), v.literal("today"),
      v.literal("in_progress"), v.literal("adam_review"),
      v.literal("client_review"), v.literal("stuck"), v.literal("done")
    ),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    clientId: v.optional(v.id("clients")),
    assigneeIds: v.array(v.id("users")),
    createdById: v.id("users"),
    parentTaskId: v.optional(v.id("tasks")),
    sortOrder: v.number(),
    todaySortOrder: v.optional(v.number()),
    totalTimeSeconds: v.number(),
    isDeleted: v.boolean(),
  })
    .index("by_status", ["status"])
    .index("by_parentTaskId", ["parentTaskId"])
    .index("by_clientId", ["clientId"]),

  timeEntries: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    date: v.string(),
    startTime: v.optional(v.number()),
    durationSeconds: v.number(),
    isRunning: v.boolean(),
    hourlyRate: v.optional(v.number()),
    isBillable: v.boolean(),
  })
    .index("by_taskId", ["taskId"])
    .index("by_userId_and_isRunning", ["userId", "isRunning"])
    .index("by_userId_and_date", ["userId", "date"]),

  activityEvents: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    eventType: v.union(
      v.literal("task_created"), v.literal("task_updated"),
      v.literal("status_changed"), v.literal("time_logged"),
      v.literal("comment"), v.literal("mention")
    ),
    data: v.object({
      fromStatus: v.optional(v.string()),
      toStatus: v.optional(v.string()),
      durationSeconds: v.optional(v.number()),
      content: v.optional(v.string()),
      mentionedUserIds: v.optional(v.array(v.id("users"))),
      attachmentIds: v.optional(v.array(v.id("_storage"))),
    }),
    isDeleted: v.boolean(),
  })
    .index("by_taskId", ["taskId"]),

  attachments: defineTable({
    storageId: v.id("_storage"),
    activityEventId: v.id("activityEvents"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    uploadedById: v.id("users"),
  })
    .index("by_activityEventId", ["activityEventId"]),
});
```

---

## File Structure

```
app/
├── (dashboard)/
│   ├── layout.tsx              # Sidebar + header + timer
│   ├── page.tsx                # Redirect to /tasks
│   ├── tasks/
│   │   └── page.tsx            # Main task view
│   ├── today/
│   │   └── page.tsx            # Today view
│   ├── review/
│   │   └── page.tsx            # Adam review queue
│   └── clients/
│       └── page.tsx            # Client management
├── api/webhooks/clerk/
│   └── route.ts                # User sync webhook

components/
├── layout/
│   ├── app-sidebar.tsx
│   ├── header.tsx
│   └── timer-widget.tsx
├── tasks/
│   ├── task-table.tsx
│   ├── task-row.tsx
│   ├── task-popup.tsx
│   └── subtask-list.tsx
├── today/
│   ├── today-list.tsx
│   └── today-item.tsx
├── time/
│   ├── timer-controls.tsx
│   └── time-entry-form.tsx
├── activity/
│   ├── activity-feed.tsx
│   └── comment-form.tsx
└── clients/
    ├── client-list.tsx
    └── client-form.tsx

convex/
├── schema.ts
├── auth.ts
├── users/
├── tasks/
├── timeEntries/
├── activityEvents/
└── clients/

hooks/
├── use-timer.ts
├── use-task-filters.ts
└── use-optimistic-mutation.ts
```

---

## Dependencies to Install

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-mention @tiptap/extension-image @tiptap/extension-placeholder @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `convex/schema.ts` | Replace demo schema with full domain model |
| `middleware.ts` | Add protected routes: /tasks, /today, /review, /clients |
| `app/layout.tsx` | Keep as-is (already has providers) |

---

## Verification Plan

1. **Schema**: Run `npx convex dev` - should deploy without errors
2. **Auth**: Sign in via Clerk, verify user synced to Convex
3. **Tasks**: Create task in spreadsheet, verify real-time update
4. **Timer**: Start timer, refresh page, verify timer persists
5. **Subtasks**: Create subtask, verify client + assignees inherited
6. **Today**: Mark task as Today, verify appears in Today view
7. **Comments**: Add comment with @mention, verify in activity feed
8. **Adam Review**: Change status to Adam Review, verify in /review page
