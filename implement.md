# Konverted Flow - Detailed Implementation Plan

## Overview

This document breaks down the implementation into testable milestones with concrete acceptance criteria. Each milestone is self-contained and can be verified independently before moving to the next.

**Total Milestones**: 8
**Total Tasks**: 38

---

## Progress Tracking

> **Auto-update enabled**: After completing each milestone, Claude will check off completed acceptance criteria, mark milestone checklists, and add completion timestamps.

| Milestone | Status | Completed |
|-----------|--------|-----------|
| M0: Project Setup | ✅ Complete | 2026-01-24 |
| M1: Foundation & Auth | ✅ Complete | 2026-01-24 |
| M2: Client Management | ✅ Complete | 2026-01-24 |
| M3: Core Task Management | ✅ Complete | 2026-01-24 |
| M4: Task Popup & Subtasks | ✅ Complete | 2026-01-24 |
| M5: Time Tracking | ✅ Complete | 2026-01-24 |
| M6: Today View | ✅ Complete | 2026-01-25 |
| M7: Activity & Comments | Not started | - |
| M8: Admin Review Page | Not started | - |

---

## Key Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| Statuses | Today, Next up, In Progress, Admin Review, Client Review, Stuck, Done (7 total) |
| "Adam" meaning | Renamed to "Admin" - uses role-based check |
| Multi-tenancy | Add `orgId` to all tables now |
| Subtask deletion | Cascade delete (soft) with parent |
| Midnight timer | Split into two time entries (one per day) |
| Timezone | Organization timezone (stored in org settings) |
| Max timer duration | No limit (user responsibility) |
| Status naming | "Admin Review" (not "Adam Review") |

---

## Milestone 0: Project Setup & Prerequisites

### Goal
Ensure all dependencies and tools are installed before coding begins.

---

### Task 0.1: Install shadcn/ui CLI and Components

**Description**: Set up shadcn/ui and install required components.

**Commands to run**:
```bash
npx shadcn@latest init
npx shadcn@latest add button input label dialog select popover dropdown-menu avatar checkbox separator tabs tooltip switch progress command table badge sonner sheet sidebar
```

**Acceptance Criteria**:
- [x] `components/ui/` folder exists with all components
- [x] `components.json` configuration file created
- [x] Tailwind CSS configured for shadcn
- [x] Import paths work (`@/components/ui/button`)

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Import Button in a page | No TypeScript errors, renders correctly |
| Manual | Check `components/ui/` | All listed components present |

**Expected Outcome**: UI component library ready to use.

---

### Task 0.2: Install Additional Dependencies

**Description**: Add all required packages for the project.

**Commands to run**:
```bash
npm install svix @tiptap/react @tiptap/starter-kit @tiptap/extension-mention @tiptap/extension-image @tiptap/extension-placeholder @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Acceptance Criteria**:
- [x] `svix` installed (webhook signature verification)
- [x] TipTap packages installed (rich text editor)
- [x] dnd-kit packages installed (drag & drop)
- [x] No peer dependency warnings

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Run `npm ls svix` | Package found |
| Manual | Run `npm run dev` | No missing dependency errors |

**Expected Outcome**: All packages available for import.

---

### Milestone 0 Completion Checklist

- [x] shadcn/ui components installed (25 components in components/ui/)
- [x] All npm dependencies installed (svix, TipTap, dnd-kit, tw-animate-css)
- [x] Project runs without errors (build passes, dev server starts)

**Completed**: 2026-01-24

---

## Milestone 1: Foundation & Authentication

### Goal
Establish the backend schema, authentication flow, and base dashboard layout.

---

### Task 1.1: Deploy Convex Schema

**Description**: Create the complete Convex schema with all tables and indexes.

**Files to create/modify**:
- `convex/schema.ts` - Full schema definition

**Schema Definition**:
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    timezone: v.string(), // e.g., "Europe/Budapest"
    createdAt: v.number(),
  }),

  users: defineTable({
    clerkId: v.string(),
    orgId: v.id("organizations"),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
    activeTimeEntryId: v.optional(v.id("timeEntries")),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_orgId", ["orgId"])
    .index("by_email", ["email"]),

  clients: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    email: v.optional(v.string()),
    defaultHourlyRate: v.optional(v.number()),
    isArchived: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_name", ["orgId", "name"]),

  tasks: defineTable({
    orgId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("today"),
      v.literal("next_up"),
      v.literal("in_progress"),
      v.literal("admin_review"),
      v.literal("client_review"),
      v.literal("stuck"),
      v.literal("done")
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_status", ["orgId", "status"])
    .index("by_parentTaskId", ["parentTaskId"])
    .index("by_clientId", ["clientId"])
    .index("by_orgId_and_isDeleted", ["orgId", "isDeleted"]),

  timeEntries: defineTable({
    orgId: v.id("organizations"),
    taskId: v.id("tasks"),
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD in org timezone
    startTime: v.optional(v.number()), // Unix timestamp
    durationSeconds: v.number(),
    isRunning: v.boolean(),
    hourlyRate: v.optional(v.number()),
    isBillable: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_taskId", ["taskId"])
    .index("by_userId_and_isRunning", ["userId", "isRunning"])
    .index("by_userId_and_date", ["userId", "date"])
    .index("by_orgId_and_date", ["orgId", "date"]),

  activityEvents: defineTable({
    orgId: v.id("organizations"),
    taskId: v.id("tasks"),
    userId: v.id("users"),
    eventType: v.union(
      v.literal("task_created"),
      v.literal("task_updated"),
      v.literal("status_changed"),
      v.literal("assignee_changed"),
      v.literal("time_logged"),
      v.literal("comment"),
      v.literal("mention")
    ),
    data: v.object({
      field: v.optional(v.string()),
      fromValue: v.optional(v.string()),
      toValue: v.optional(v.string()),
      durationSeconds: v.optional(v.number()),
      content: v.optional(v.string()),
      mentionedUserIds: v.optional(v.array(v.id("users"))),
      attachmentIds: v.optional(v.array(v.id("_storage"))),
    }),
    isDeleted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_taskId", ["taskId"])
    .index("by_orgId", ["orgId"]),

  attachments: defineTable({
    orgId: v.id("organizations"),
    storageId: v.id("_storage"),
    activityEventId: v.id("activityEvents"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    uploadedById: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_activityEventId", ["activityEventId"]),
});
```

**Acceptance Criteria**:
- [x] Schema includes all 7 tables: organizations, users, clients, tasks, timeEntries, activityEvents, attachments
- [x] All tables have `orgId` field (except organizations)
- [x] Status values match PRD: today, next_up, in_progress, admin_review, client_review, stuck, done
- [x] All indexes are defined correctly
- [x] Schema deploys without errors via `npx convex dev`

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Run `npx convex dev` | No deployment errors |
| Manual | Check Convex dashboard | All 7 tables visible with correct fields |

**Expected Outcome**: Convex backend is ready to accept data.

---

### Task 1.2: Create Auth Helper Functions

**Description**: Build reusable authentication utilities for Convex functions.

**Files to create**:
- `convex/lib/auth.ts` - Auth helper functions

**Functions to implement**:
```typescript
// getUser(ctx): Returns current user or null
// requireAuth(ctx): Returns current user or throws
// requireAdmin(ctx): Returns admin user or throws
// getUserOrgId(ctx): Returns orgId for current user
```

**Acceptance Criteria**:
- [x] `getUser` returns user object when authenticated
- [x] `getUser` returns null when not authenticated
- [x] `requireAuth` throws ConvexError("Unauthorized") when not authenticated
- [x] `requireAdmin` throws ConvexError("Forbidden") for non-admin users
- [x] All functions properly query by Clerk ID from auth context
- [x] `getUserOrgId` returns the org ID for data scoping

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Unit | Call `getUser` with valid Clerk ID | Returns user object with orgId |
| Unit | Call `getUser` without auth | Returns null |
| Unit | Call `requireAuth` without auth | Throws "Unauthorized" error |
| Unit | Call `requireAdmin` as member | Throws "Forbidden" error |

**Expected Outcome**: Auth helpers can be used in all Convex functions.

---

### Task 1.3: Clerk Webhook for User Sync

**Description**: Create webhook endpoint to sync Clerk users to Convex.

**Files to create**:
- `app/api/webhooks/clerk/route.ts` - Webhook handler
- `convex/users.ts` - User upsert mutation

**Acceptance Criteria**:
- [x] Webhook verifies Svix signature using `svix` package
- [x] Handles `user.created` event - creates new user in Convex
- [x] Handles `user.updated` event - updates existing user
- [x] Handles `user.deleted` event - soft deletes user (don't actually delete)
- [x] First user in org gets `admin` role, subsequent users get `member` role
- [x] Creates default organization on first user signup
- [x] Returns 200 on success, 400 on invalid signature, 500 on error

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Sign up new user via Clerk | User appears in Convex users table |
| Manual | Update user profile in Clerk | User updated in Convex |
| Manual | First signup | Organization created, user is admin |
| Integration | Send test webhook with invalid signature | Returns 400 |

**Expected Outcome**: Users automatically sync from Clerk to Convex.

---

### Task 1.4: Dashboard Layout with Sidebar

**Description**: Create the main dashboard layout with navigation sidebar.

**Files to create**:
- `app/(dashboard)/layout.tsx` - Dashboard layout wrapper
- `components/layout/app-sidebar.tsx` - Navigation sidebar
- `components/layout/header.tsx` - Top header bar
- `components/layout/timer-widget.tsx` - Global timer display (placeholder)

**Acceptance Criteria**:
- [x] Layout wraps all dashboard routes
- [x] Sidebar shows navigation links: Tasks, Today, Admin Review, Clients
- [x] Active route is highlighted in sidebar
- [x] Header shows user avatar and name from Clerk
- [x] Timer widget placeholder is visible in header
- [x] Layout is responsive (sidebar collapses on mobile)
- [x] Uses shadcn/ui Sidebar component
- [x] Shows loading skeleton while auth/data loads

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Navigate to /tasks | Sidebar shows "Tasks" as active |
| Manual | Click "Today" in sidebar | Navigates to /today |
| Manual | View on mobile viewport | Sidebar collapses to hamburger menu |
| Visual | Check header | User avatar and name displayed |

**Expected Outcome**: Basic navigation shell is functional.

---

### Task 1.5: Protected Routes Middleware

**Description**: Configure Clerk middleware to protect dashboard routes.

**Files to modify**:
- `middleware.ts` - Add protected route patterns

**Acceptance Criteria**:
- [x] `/tasks`, `/today`, `/review`, `/clients` require authentication
- [x] Unauthenticated users redirected to `/sign-in`
- [x] `/sign-in` and `/sign-up` are public
- [x] API routes `/api/webhooks/*` are public (for Clerk webhooks)
- [x] Root `/` redirects to `/tasks` when authenticated

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Access /tasks while logged out | Redirected to /sign-in |
| Manual | Access /tasks while logged in | Page loads |
| Manual | Access /sign-in while logged in | Redirects to /tasks |

**Expected Outcome**: Routes are properly protected.

---

### Milestone 1 Completion Checklist

- [x] Convex schema deployed with all 7 tables
- [x] Auth helpers working
- [x] User sync webhook functional
- [x] Dashboard layout renders
- [x] Route protection active
- [x] Can sign in and see empty dashboard

**Completed**: 2026-01-24

---

## Milestone 2: Client Management

### Goal
Implement client CRUD operations and management UI.

---

### Task 2.1: Client Convex Functions

**Description**: Create all client-related Convex queries and mutations.

**Files to create**:
- `convex/clients.ts` - All client functions

**Functions to implement**:
```typescript
// Queries
list(ctx): Client[] - Returns all non-archived clients for user's org
getById(ctx, { id }): Client | null - Returns single client

// Mutations
create(ctx, { name, email?, defaultHourlyRate? }): Id<"clients">
update(ctx, { id, name?, email?, defaultHourlyRate? }): void
archive(ctx, { id }): void - Sets isArchived = true
```

**Acceptance Criteria**:
- [x] All queries/mutations scope by `orgId` from auth context
- [x] `list` returns only non-archived clients
- [x] `list` is sorted alphabetically by name
- [x] `create` requires name, optional email and hourlyRate
- [x] `create` sets `createdAt` timestamp
- [x] `update` only modifies provided fields
- [x] `archive` sets isArchived flag (soft delete)
- [x] Archived clients cannot be selected for new tasks (enforced in UI)

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Unit | Create client with name only | Client created with null email/rate |
| Unit | Create client with all fields | All fields saved correctly |
| Unit | Update client name | Only name changes |
| Unit | Archive client | Client no longer in list() results |
| Unit | Call create without auth | Throws unauthorized error |

**Expected Outcome**: Client data layer is complete.

---

### Task 2.2: Clients Page UI

**Description**: Build the clients management page with table and form.

**Files to create**:
- `app/(dashboard)/clients/page.tsx` - Page component
- `components/clients/client-list.tsx` - Table component
- `components/clients/client-form.tsx` - Create/edit form
- `components/clients/client-dialog.tsx` - Dialog wrapper

**Acceptance Criteria**:
- [x] Displays all clients in table format
- [x] Columns: Name, Email, Hourly Rate, Actions
- [x] Empty state shows "No clients yet" with create button
- [x] Real-time updates when another user adds client
- [x] "New Client" button opens dialog with form
- [x] Edit button in actions column opens dialog with pre-filled form
- [x] Archive button in actions column
- [x] Archive shows confirmation dialog
- [x] Form validation: Name required, Email format if provided
- [x] Hourly rate accepts decimal numbers
- [x] Loading state during submission
- [x] Error handling with toast notifications
- [x] Dialog closes on successful save

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Load /clients with no clients | Empty state displayed |
| Manual | Add client in another tab | List updates in real-time |
| Manual | Submit empty form | Name field shows validation error |
| Manual | Create valid client | Client created, dialog closes, toast shows |
| Manual | Edit existing client | Changes saved, dialog closes |
| Manual | Click archive, confirm | Client removed from list |

**Expected Outcome**: Full client CRUD is functional.

---

### Milestone 2 Completion Checklist

- [x] Client Convex functions work
- [x] Clients page displays list
- [x] Can create new client
- [x] Can edit existing client
- [x] Can archive client
- [x] Real-time updates work

**Completed**: 2026-01-24

---

## Milestone 3: Core Task Management

### Goal
Implement the main task table with CRUD operations and inline editing.

---

### Task 3.1: Task Convex Functions

**Description**: Create all task-related Convex queries and mutations.

**Files to create**:
- `convex/tasks.ts` - All task functions

**Functions to implement**:
```typescript
// Queries
list(ctx, { status?, clientId?, assigneeId? }): Task[] - Main tasks only
getById(ctx, { id }): Task | null
getSubtasks(ctx, { parentTaskId }): Task[]
getByStatus(ctx, { status }): Task[] - Both main and subtasks

// Mutations
create(ctx, { title, clientId?, assigneeIds?, parentTaskId?, status?, priority? }): Id<"tasks">
update(ctx, { id, ...fields }): void
softDelete(ctx, { id }): void - Also cascade-deletes subtasks
reorder(ctx, { taskId, newSortOrder }): void
```

**Acceptance Criteria**:
- [x] All functions scope by `orgId`
- [x] `list` returns only main tasks (parentTaskId = undefined), excludes isDeleted
- [x] `list` supports filters: status (array), clientId, assigneeId
- [x] `list` returns tasks sorted by sortOrder
- [x] `getSubtasks` returns subtasks sorted by sortOrder, excludes isDeleted
- [x] `create` sets defaults: status="next_up", priority="medium", sortOrder=max+1, totalTimeSeconds=0
- [x] `create` with parentTaskId inherits clientId from parent automatically
- [x] `create` sets createdById from auth context
- [x] `update` logs activity event for status changes
- [x] `update` logs activity event for assignee changes
- [x] `softDelete` sets isDeleted=true on task AND all subtasks (cascade)
- [x] Reorder updates sortOrder field

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Unit | Create main task | Task created with parentTaskId=undefined |
| Unit | Create subtask | Inherits clientId from parent |
| Unit | List with status filter | Only matching tasks returned |
| Unit | Update status | Activity event created with from/to values |
| Unit | Delete parent task | Parent and all subtasks have isDeleted=true |
| Unit | Reorder task | sortOrder updated |

**Expected Outcome**: Task data layer is complete.

---

### Task 3.2: Task Table Component

**Description**: Build the Notion-like spreadsheet for main tasks.

**Files to create**:
- `app/(dashboard)/tasks/page.tsx` - Page component
- `components/tasks/task-table.tsx` - Main table container
- `components/tasks/task-table-header.tsx` - Column headers
- `components/tasks/task-row.tsx` - Single task row
- `components/tasks/task-quick-add.tsx` - Inline task creation

**Columns**:
1. Title (expandable)
2. Client (dropdown)
3. Assignees (multi-select avatars)
4. Status (dropdown)
5. Priority (dropdown with flags)
6. Time (time pill)
7. Subtasks (count indicator)

**Acceptance Criteria**:
- [x] Table displays all 7 columns
- [x] Rows are sorted by sortOrder
- [x] Rows are clickable (opens task popup)
- [ ] Keyboard navigation: Tab moves between cells in row
- [x] Quick add row at bottom of table
- [x] Empty state when no tasks: "No tasks yet. Create your first task!"
- [x] Loading skeleton while data fetches
- [ ] Error state with retry button

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Load /tasks with tasks | Table renders with all columns |
| Manual | Click row | Task popup opens |
| Manual | Press Tab in row | Focus moves to next cell |
| Manual | No tasks exist | Empty state displayed |

**Expected Outcome**: Task table renders and is navigable.

---

### Task 3.3: Inline Editable Cells

**Description**: Make each cell in the task table inline editable.

**Files to create**:
- `components/tasks/cells/title-cell.tsx` - Text input
- `components/tasks/cells/status-cell.tsx` - Dropdown select
- `components/tasks/cells/priority-cell.tsx` - Dropdown with icons
- `components/tasks/cells/client-cell.tsx` - Combobox
- `components/tasks/cells/assignee-cell.tsx` - Multi-select with avatars
- `components/tasks/cells/time-cell.tsx` - Time pill (placeholder)
- `components/tasks/cells/subtask-cell.tsx` - Count indicator

**Status dropdown options**:
- Today
- Next up
- In Progress
- Admin Review
- Client Review
- Stuck
- Done

**Priority dropdown options**:
- 🔴 High
- 🟡 Medium
- 🟢 Low

**Acceptance Criteria**:
- [x] Title: Click to edit, blur to save, Enter to save, Escape to cancel
- [x] Status: Click shows dropdown, select saves immediately
- [x] Priority: Click shows dropdown with colored indicators
- [x] Client: Combobox with search, shows non-archived clients only
- [x] Assignees: Multi-select popover with user list and avatars
- [x] All cells show optimistic updates (instant UI update)
- [x] Failed saves show error toast and revert value
- [x] Cells have hover state for discoverability

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Click title, type, blur | Title updated in DB |
| Manual | Click status, select "In Progress" | Status updates immediately |
| Manual | Click priority, select High | Priority shows red indicator |
| Manual | Select multiple assignees | All assignees saved |
| Manual | Disconnect network, edit cell | Error toast, value reverts |

**Expected Outcome**: All task fields are editable inline.

---

### Task 3.4: Task Filters

**Description**: Add filter controls to the task table.

**Files to create**:
- `components/tasks/task-filters.tsx` - Filter bar component
- `hooks/use-task-filters.ts` - URL state management

**Filter options**:
- Status (multi-select checkboxes)
- Client (single select)
- Assignee (single select)
- Search (text input, searches title)

**Acceptance Criteria**:
- [x] Filters are stored in URL query params (`?status=today,in_progress&client=abc123`)
- [x] Page reload preserves filters
- [x] Filters are combinable (AND logic)
- [x] Clear all button resets filters
- [x] Active filter count badge shown on filter button
- [x] Empty results show "No tasks match filters" with clear button

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Select status="In Progress" | Only in-progress tasks shown |
| Manual | Add client filter | Results narrowed further |
| Manual | Refresh page | Same filters applied |
| Manual | Click "Clear all" | All tasks shown, URL params cleared |

**Expected Outcome**: Tasks can be filtered efficiently.

---

### Task 3.5: Task Quick Add

**Description**: Fast inline task creation at bottom of table.

**Files to modify**:
- `components/tasks/task-quick-add.tsx`

**Acceptance Criteria**:
- [x] Always visible at bottom of task list
- [x] Placeholder text: "Add a new task..."
- [x] Single input field for title
- [x] Enter creates task with title only
- [x] Task inherits current filters (e.g., if filtered by client, new task gets that client)
- [x] New task gets status="next_up" by default
- [x] After creation, input clears and stays focused for rapid entry
- [x] Escape clears input

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Type title, press Enter | Task created, appears in list |
| Manual | Create task while client filter active | New task has that client |
| Manual | Press Escape while typing | Input cleared, nothing created |
| Manual | Create multiple tasks rapidly | All created correctly |

**Expected Outcome**: Tasks can be created with minimal friction.

---

### Milestone 3 Completion Checklist

- [x] Task CRUD functions work
- [x] Task table displays with all columns
- [x] All cells are inline editable
- [x] Filters work and persist in URL
- [x] Quick add creates tasks
- [x] Real-time updates across tabs

**Completed**: 2026-01-24

---

## Milestone 4: Task Popup & Subtasks

### Goal
Build the ClickUp-style task detail popup with subtask management.

---

### Task 4.1: Task Popup Modal

**Description**: Create the split-view task detail popup.

**Files to create**:
- `components/tasks/task-popup/index.tsx` - Main popup component
- `components/tasks/task-popup/task-popup-header.tsx` - Title and close button
- `components/tasks/task-popup/task-popup-left.tsx` - Details panel
- `components/tasks/task-popup/task-popup-right.tsx` - Activity panel (placeholder)

**Acceptance Criteria**:
- [x] Opens when clicking task row in table
- [x] Uses shadcn Sheet or Dialog component
- [x] 60/40 split layout (left panel / right sidebar)
- [x] Closes on Escape key
- [x] Closes on backdrop click (with unsaved changes warning if applicable)
- [x] URL updates with task ID: `/tasks?task=abc123` (shareable links)
- [x] Browser back closes popup and removes query param
- [x] Direct URL access opens popup immediately
- [x] Responsive: Full screen on mobile, stacked panels

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Click task row | Popup opens with task details |
| Manual | Press Escape | Popup closes |
| Manual | Copy URL with ?task=, open in new tab | Same task popup opens |
| Manual | Click browser back | Popup closes, URL clean |
| Visual | View on mobile | Full screen, panels stacked |

**Expected Outcome**: Task popup structure is functional.

---

### Task 4.2: Task Details Panel (Left Side)

**Description**: Build the left panel with editable task fields.

**Files to modify**:
- `components/tasks/task-popup/task-popup-left.tsx`

**Layout (top to bottom)**:
1. Title (large, editable)
2. Meta bar: Status | Priority | Client | Assignees
3. Description (expandable textarea)
4. Divider
5. Subtasks section

**Acceptance Criteria**:
- [x] Title: Large editable text field, auto-focus on open
- [x] Description: Expandable textarea, placeholder "Add a description..."
- [x] Status: Inline dropdown selector
- [x] Priority: Inline dropdown with icons
- [x] Client: Inline combobox selector
- [x] Assignees: Inline multi-select with avatars
- [x] All fields save on change (debounced 300ms for text fields)
- [ ] Shows subtle "Saved" indicator after successful save

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Edit title in popup | Title updates in table too |
| Manual | Change status | Status updates, activity logged |
| Manual | Edit description | Text saved after 300ms debounce |

**Expected Outcome**: Task can be fully edited in popup.

---

### Task 4.3: Subtask List Component

**Description**: Add subtask management section to task popup.

**Files to create**:
- `components/tasks/task-popup/subtask-list.tsx` - Subtask mini-table
- `components/tasks/task-popup/subtask-row.tsx` - Subtask row
- `components/tasks/task-popup/subtask-quick-add.tsx` - Inline creation

**Layout**:
- Header: "Subtasks" with count badge
- Mini-table with columns: Checkbox, Title, Status, Priority, Time
- Quick add input at bottom

**Acceptance Criteria**:
- [x] Shows all subtasks of current task
- [x] Subtasks sorted by sortOrder
- [x] Columns: Checkbox (completion), Title, Status, Priority, Time
- [x] Inline editable cells (same components as main table)
- [x] Quick add at bottom
- [x] Subtask inherits client from parent (shown but not editable)
- [ ] Subtask inherits assignees from parent by default (can be modified)
- [x] Clicking subtask does NOT open another popup (edit inline)
- [x] Checkbox marks status as "done"
- [x] Empty state: "No subtasks yet"

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | View task with subtasks | Subtasks displayed in list |
| Manual | Create subtask | Inherits client from parent |
| Manual | Edit subtask status | Status saved |
| Manual | Check subtask client field | Shows parent's client, not editable |
| Manual | Click checkbox | Status becomes "done" |

**Expected Outcome**: Subtasks can be managed within task popup.

---

### Task 4.4: Subtask Count Indicator

**Description**: Show subtask count in main task table.

**Files to modify**:
- `components/tasks/cells/subtask-cell.tsx`

**Acceptance Criteria**:
- [x] Shows subtask count (e.g., "3")
- [x] Shows icon (checklist) + count
- [x] Zero subtasks shows "-" or empty
- [x] Count updates in real-time when subtasks added/removed
- [x] Clicking cell opens task popup (same as clicking row)

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | View task with 3 subtasks | Shows "3" in subtask column |
| Manual | Create new subtask | Count increments |
| Manual | Delete subtask | Count decrements |

**Expected Outcome**: Subtask counts visible in main table.

---

### Milestone 4 Completion Checklist

- [x] Task popup opens and closes correctly
- [x] URL reflects open task (shareable)
- [x] All task fields editable in popup
- [x] Subtask list displays in popup
- [x] Subtasks can be created/edited
- [x] Subtask inheritance works
- [x] Subtask count shows in main table

**Completed**: 2026-01-24

---

## Milestone 5: Time Tracking

### Goal
Implement stopwatch timer and manual time entry functionality.

---

### Task 5.1: Time Entry Convex Functions

**Description**: Create time tracking backend functions.

**Files to create**:
- `convex/timeEntries.ts` - All time entry functions
- `convex/lib/timezone.ts` - Timezone helpers

**Functions to implement**:
```typescript
// Queries
getRunning(ctx): TimeEntry | null - Get user's running timer
getByTask(ctx, { taskId }): TimeEntry[] - Get all entries for task
getByUserAndDate(ctx, { userId, date }): TimeEntry[] - Daily entries

// Mutations
startTimer(ctx, { taskId }): Id<"timeEntries"> - Start new timer
stopTimer(ctx): void - Stop current timer
createManual(ctx, { taskId, date, durationSeconds }): Id<"timeEntries">
update(ctx, { id, durationSeconds?, date? }): void
delete(ctx, { id }): void
```

**Midnight Split Logic**:
When stopping a timer that crossed midnight:
1. Calculate time before midnight → create entry for start date
2. Calculate time after midnight → create entry for next date
3. Repeat for each day if timer ran multiple days

**Acceptance Criteria**:
- [x] `startTimer` stops any existing running timer first (auto-stop)
- [x] `startTimer` creates entry with isRunning=true, startTime=Date.now()
- [x] `stopTimer` calculates duration from startTime to now
- [x] `stopTimer` handles midnight crossing (creates multiple entries)
- [x] `stopTimer` updates task's totalTimeSeconds
- [x] `createManual` allows adding time to any date
- [x] `createManual` uses org timezone for date interpretation
- [x] Only one running timer per user at a time (enforced)
- [x] Deleting entry recalculates task totalTimeSeconds

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Unit | Start timer on task A | Entry created with isRunning=true |
| Unit | Start timer on task B while A running | A stopped, B started |
| Unit | Stop timer after 10 min | Duration = 600 seconds |
| Unit | Stop timer that crossed midnight | Two entries created |
| Unit | Create manual 30min entry | Entry created, task total updated |

**Expected Outcome**: Time tracking backend is complete.

---

### Task 5.2: Timer Hook

**Description**: Create React hook for managing timer state.

**Files to create**:
- `hooks/use-timer.ts` - Timer state management

**Hook interface**:
```typescript
function useTimer(): {
  runningEntry: TimeEntry | null;
  runningTask: Task | null;
  elapsedSeconds: number; // Live counter
  isRunning: boolean;
  startTimer: (taskId: Id<"tasks">) => Promise<void>;
  stopTimer: () => Promise<void>;
}
```

**Acceptance Criteria**:
- [x] Subscribes to running entry via Convex useQuery
- [x] `elapsedSeconds` calculated from startTime, updates every second
- [x] Uses setInterval for live counter (clears on unmount)
- [x] Handles page refresh (timer state from server)
- [x] Handles multi-tab (Convex realtime keeps tabs in sync)
- [x] `startTimer` is optimistic (shows immediately)
- [x] Error handling shows toast

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Start timer, watch counter | Counter increments every second |
| Manual | Refresh page with running timer | Timer continues from correct time |
| Manual | Start timer in tab 1, check tab 2 | Tab 2 shows same timer |
| Manual | Stop timer | Counter stops, entry saved |

**Expected Outcome**: Timer state is reactive and synced.

---

### Task 5.3: Timer Widget (Global)

**Description**: Build the global timer display in header.

**Files to modify**:
- `components/layout/timer-widget.tsx`

**Acceptance Criteria**:
- [x] Shows currently running task title (truncated if long)
- [x] Shows elapsed time in HH:MM:SS format
- [x] Stop button (square icon) stops timer
- [x] Click on task title opens task popup
- [x] Hidden completely when no timer running
- [x] Pulsing/glowing indicator when active
- [x] Positioned in header, right side

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Start timer | Widget appears in header |
| Manual | Stop timer | Widget disappears |
| Manual | Click task title in widget | Task popup opens |
| Visual | Timer running | Subtle pulsing animation |

**Expected Outcome**: Users always know if timer is running.

---

### Task 5.4: Time Pill Component

**Description**: Build the time tracking cell for task rows with popover for quick time add and entry management.

**Files created**:
- `components/time/time-pill.tsx` - Main pill with play/stop button + popover trigger
- `components/time/time-popover.tsx` - Popover content with Quick Add and Time Entries
- `components/time/time-entry-list.tsx` - List of time entries with expand/collapse
- `components/time/time-entry-row.tsx` - Individual entry row with actions
- `components/time/time-entry-actions.tsx` - Edit/Delete dropdown menu
- `components/time/time-edit-dialog.tsx` - Dialog for editing entry duration/date

**UI Design**:
```
┌─────────────────────────────────────────────┐
│  Total Time                          6h 52m │
├─────────────────────────────────────────────┤
│  QUICK ADD                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 15m │ │ 30m │ │ 45m │ │ 1h  │ │ 2h  │   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 3h  │ │ 4h  │ │ 6h  │ │ 8h  │           │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
│  ┌─────────────────────────────┐ ┌───────┐ │
│  │ e.g. 1h 30m                 │ │  Add  │ │
│  └─────────────────────────────┘ └───────┘ │
├─────────────────────────────────────────────┤
│  ▼ TIME ENTRIES (collapsible)               │
│  ┌─────────────────────────────────────────┐│
│  │ 01:30:00  Jan 25 · 8:16-9:46 AM · John  ││
│  │ 02:15:00  Jan 24 · 2:00-4:15 PM · Jane  ││
│  │ 00:45:00  Jan 24 · manual entry · John  ││
│  └─────────────────────────────────────────┘│
│         Show all entries (X more)           │
└─────────────────────────────────────────────┘
```

**Time Pill Design**:
- Green circular play/stop button (emerald-500)
- Time display with dropdown chevron
- Running state: emerald text + pulse animation

**Acceptance Criteria**:
- [x] Shows total logged time for task (formatted: "2h 30m" or "45m")
- [x] Play button starts timer, Stop button stops timer
- [x] Visual indicator when this task's timer is running (green pulse)
- [x] Click on time opens popover with Quick Add at top (one-click adding)
- [x] Preset buttons: 15m, 30m, 45m, 1h, 2h, 3h, 4h, 6h, 8h
- [x] Custom input with inline Add button
- [x] Time Entries section is collapsible (collapsed by default)
- [x] Shows last 3 entries, "Show all" button for more
- [x] Entry rows show: duration (HH:MM:SS), date, time range, user name
- [x] Entry actions: Edit (dialog), Delete
- [x] Edit dialog allows changing duration and date
- [x] Time displays "-" for tasks with no time logged

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Click play | Timer starts for this task |
| Manual | Click 30m preset | 30 minutes added immediately |
| Manual | Enter "1h 30m", click Add | 1.5 hours added |
| Manual | Expand Time Entries | Shows recent entries |
| Manual | Click "..." on entry | Edit/Delete menu appears |
| Manual | Edit entry duration | Dialog opens, saves correctly |
| Manual | Delete entry | Entry removed, total updated |
| Visual | Timer running | Green pill with pulse animation |

**Expected Outcome**: Time can be tracked from any task row with one-click presets and full entry management.

---

### Task 5.5: Task Time Aggregation

**Description**: Ensure task totalTimeSeconds stays in sync.

**Files to modify**:
- `convex/timeEntries.ts` - Add recalculation logic
- `convex/tasks.ts` - Add helper to recalculate

**Acceptance Criteria**:
- [x] Creating time entry adds to task.totalTimeSeconds
- [x] Updating time entry recalculates task total
- [x] Deleting time entry recalculates task total
- [x] Subtask time tracked separately (NOT rolled up to parent)
- [x] Running timer's elapsed time shown in real-time (client-side addition)
- [x] Aggregation is atomic (uses Convex transactions)

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Unit | Add 30min entry | Task total increases by 1800 |
| Unit | Delete entry | Task total decreases correctly |
| Unit | Update entry from 30min to 1h | Total adjusts correctly |
| Unit | Check parent task total | Does NOT include subtask time |

**Expected Outcome**: Time totals are always accurate.

---

### Milestone 5 Completion Checklist

- [x] Timer start/stop works
- [x] Only one timer per user
- [x] Midnight split works
- [x] Manual time entry works
- [x] Timer widget shows in header
- [x] Time pill shows in task rows
- [x] Task totals update correctly
- [x] Timer persists across refresh

**Completed**: 2026-01-24

---

## Milestone 6: Today View

### Goal
Build the daily execution view showing all items marked "Today".

---

### Task 6.1: Today Query

**Description**: Create query for Today view items.

**Files to modify**:
- `convex/tasks.ts` - Add `getTodayItems` query

**Query specification**:
```typescript
getTodayItems(ctx, { assigneeId? }): (Task & { parentTask?: Task })[]
// Returns all tasks AND subtasks where status = "today"
// Optionally filter by assignee
// For subtasks, include parent task data for context line
// Sort: Priority (high first), then todaySortOrder, then createdAt
```

**Acceptance Criteria**:
- [x] Returns both main tasks and subtasks with status="today"
- [x] Excludes isDeleted tasks
- [x] Includes parent task info for subtasks (joined data)
- [x] Sorted by: priority desc, todaySortOrder asc, createdAt asc
- [x] Optional assignee filter works
- [x] Scoped by orgId

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Unit | Mark task as Today | Appears in query results |
| Unit | Mark subtask as Today | Appears with parent info |
| Unit | Change status from Today | Disappears from results |
| Unit | Filter by assignee | Only that user's tasks |
| Unit | Check sort | High priority first |

**Expected Outcome**: Today data is queryable.

---

### Task 6.2: Today Page & List Component

**Description**: Build the Today view page and list interface.

**Files to create**:
- `app/(dashboard)/today/page.tsx` - Page component
- `components/today/today-list.tsx` - List container
- `components/today/today-item.tsx` - Single item card

**Layout per item**:
```
┌─────────────────────────────────────────────────────┐
│ ▶ │ 2h 15m │ Task Title Here                        │
│   │        │ Client Name · High Priority            │
└─────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [x] Flat list (no hierarchy/indentation)
- [x] Each item shows: Play/Pause, Time pill, Title, Context line
- [x] Context line for main task: "Client"
- [x] Context line for subtask: "Parent Task → Client"
- [x] Click on item opens task popup
- [x] Empty state: "Nothing planned for today. Mark some tasks as Today to get started!"
- [x] Filter by assignee dropdown (default: current user)
- [x] "Show all" toggle to see everyone's Today items

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | View Today with items | List renders correctly |
| Manual | View subtask | Shows "Parent Task →" in context |
| Manual | Click item | Task popup opens |
| Manual | No Today items | Empty state shown |

**Expected Outcome**: Today view displays items correctly.

---

### Task 6.3: Today View Actions

**Description**: Add interaction capabilities to Today view.

**Files to modify**:
- `components/today/today-item.tsx`

**Acceptance Criteria**:
- [x] Play/Pause button starts/stops timer
- [x] Click on time opens manual entry popover
- [x] Status dropdown visible on hover/focus
- [x] Changing status away from "Today" animates item out
- [x] Inline edit title on double-click
- [x] All changes sync in real-time

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Start timer | Timer starts, widget shows |
| Manual | Change status to "Done" | Item animates out, disappears |
| Manual | Double-click title | Inline edit mode |
| Manual | Add 30m via time popover | Time added |

**Expected Outcome**: Full task interaction in Today view.

---

### Task 6.4: Drag & Drop Reorder

**Description**: Allow reordering items in Today view.

**Files to modify**:
- `components/today/today-list.tsx` - Add dnd-kit

**Acceptance Criteria**:
- [x] Drag handle visible on left side of each item
- [x] Items can be dragged to reorder
- [x] Drop updates todaySortOrder for affected items
- [x] Visual feedback during drag (item elevates, placeholder shows)
- [x] Keyboard accessible: Space to pick up, arrows to move, Space to drop
- [x] Order persists after refresh
- [x] Reordering works across priority groups

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Drag item to new position | Order updates, saves |
| Manual | Refresh page | Order preserved |
| Manual | Use keyboard to reorder | Works correctly |

**Expected Outcome**: Today view is manually reorderable.

---

### Milestone 6 Completion Checklist

- [x] Today query returns correct items
- [x] Today list renders flat list
- [x] Context lines show correctly
- [x] Timer and time entry work
- [x] Status changes work (item removal)
- [x] Drag & drop reordering works
- [x] Order persists

**Completed**: 2026-01-25

---

## Milestone 7: Activity & Comments

### Goal
Implement activity feed and TipTap comments in task popup.

---

### Task 7.1: Activity Event Logging

**Description**: Ensure all task changes are logged as activity events.

**Files to modify**:
- `convex/activityEvents.ts` - Event creation helpers
- `convex/tasks.ts` - Trigger events on changes

**Events to log**:
| Event Type | Trigger | Data Stored |
|------------|---------|-------------|
| task_created | Task created | - |
| status_changed | Status updated | fromValue, toValue |
| assignee_changed | Assignees modified | fromValue (ids), toValue (ids) |
| time_logged | Manual time added | durationSeconds |

**Acceptance Criteria**:
- [ ] Events created atomically with the change (same transaction)
- [ ] All events linked to task, user, and org
- [ ] Status change stores from/to values as strings
- [ ] Events are immutable (no update, only soft delete)
- [ ] Events sorted by createdAt descending (newest first)

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Unit | Create task | task_created event logged |
| Unit | Change status | status_changed with from/to |
| Unit | Add manual time | time_logged with duration |

**Expected Outcome**: System events are tracked.

---

### Task 7.2: Activity Feed Component

**Description**: Display activity events in task popup right panel.

**Files to create**:
- `components/tasks/task-popup/activity-feed.tsx` - Feed container
- `components/tasks/task-popup/activity-item.tsx` - Single event
- `components/tasks/task-popup/activity-icon.tsx` - Event type icons

**Event display formats**:
- task_created: "John created this task"
- status_changed: "John changed status from Next up to In Progress"
- assignee_changed: "John assigned this to Sarah, Mike"
- time_logged: "John logged 2h 30m"

**Acceptance Criteria**:
- [ ] Shows all activity for current task
- [ ] Toggle to include/exclude subtask activity
- [ ] Each event type has distinct icon
- [ ] Shows user avatar and name
- [ ] Shows relative time ("2 hours ago", "Yesterday")
- [ ] Real-time updates when new events added
- [ ] Scrollable with newest at top

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | View task with activity | Events displayed in feed |
| Manual | Change status in popup | New event appears at top |
| Manual | View time_logged event | Shows formatted duration |

**Expected Outcome**: Activity history is visible.

---

### Task 7.3: TipTap Editor Setup

**Description**: Configure TipTap for rich text comments.

**Files to create**:
- `components/tasks/task-popup/comment-editor.tsx` - TipTap editor
- `components/tasks/task-popup/mention-list.tsx` - @mention dropdown

**TipTap extensions**:
- StarterKit (bold, italic, lists, etc.)
- Mention (with custom render)
- Image (paste/upload)
- Placeholder

**Acceptance Criteria**:
- [ ] Basic formatting toolbar: Bold, Italic, Bullet List
- [ ] @mention triggers on @ character
- [ ] Mention dropdown shows org users with search
- [ ] Selecting mention inserts styled chip
- [ ] Image paste from clipboard works
- [ ] Placeholder: "Add a comment..."
- [ ] Submit button and Cmd/Ctrl+Enter shortcut
- [ ] Editor clears after submit
- [ ] Disabled state while submitting

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Type @jo | Dropdown shows users matching "jo" |
| Manual | Select user from dropdown | Mention chip inserted |
| Manual | Paste image | Image appears in editor |
| Manual | Press Cmd+Enter | Comment submitted, editor clears |

**Expected Outcome**: Rich text editor is functional.

---

### Task 7.4: Comment CRUD

**Description**: Implement comment creation and management.

**Files to create**:
- `convex/activityEvents.ts` - Add comment functions
- `components/tasks/task-popup/comment-item.tsx` - Comment display

**Functions**:
```typescript
createComment(ctx, { taskId, content, mentionedUserIds, attachmentIds? })
updateComment(ctx, { id, content })
deleteComment(ctx, { id }) // Soft delete
```

**Acceptance Criteria**:
- [ ] Comments saved as activityEvents with eventType="comment"
- [ ] Content stored as HTML string
- [ ] Mentioned user IDs extracted and stored
- [ ] User can edit their own comments (shows "edited" indicator)
- [ ] User can delete their own comments
- [ ] Admins can delete any comment
- [ ] Comments display with formatted HTML
- [ ] Mentions render as clickable links

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Create comment | Appears in feed |
| Manual | Edit own comment | Content updated, "edited" shown |
| Manual | Delete comment | Removed from feed |
| Manual | Comment with @mention | Mentioned users stored |

**Expected Outcome**: Comments fully functional.

---

### Task 7.5: Image Attachments

**Description**: Support image uploads in comments.

**Files to create**:
- `convex/attachments.ts` - Upload functions
- `components/tasks/task-popup/image-upload.tsx` - Upload UI

**Functions**:
```typescript
generateUploadUrl(ctx): string // Convex storage URL
saveAttachment(ctx, { storageId, activityEventId, fileName, fileType, fileSize })
```

**Acceptance Criteria**:
- [ ] Images uploaded to Convex storage
- [ ] Max file size: 5MB
- [ ] Allowed types: image/jpeg, image/png, image/gif, image/webp
- [ ] Upload progress indicator
- [ ] Drag & drop into editor supported
- [ ] Paste from clipboard supported
- [ ] Images display inline in comment
- [ ] Click image opens in lightbox/modal

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Drag image into editor | Uploads, shows in comment |
| Manual | Paste screenshot | Uploads, shows in comment |
| Manual | Try uploading 10MB file | Error: file too large |
| Manual | Click image in comment | Opens larger view |

**Expected Outcome**: Image attachments work.

---

### Task 7.6: Combined Activity + Comments Feed

**Description**: Merge system events and comments into unified feed.

**Files to modify**:
- `components/tasks/task-popup/activity-feed.tsx`

**Acceptance Criteria**:
- [ ] System events and comments interleaved by timestamp
- [ ] Comments have different visual style (card-like, more prominent)
- [ ] System events are compact single-line
- [ ] Comments show edit/delete buttons on hover (for allowed users)
- [ ] System events are display-only (no actions)
- [ ] Load more / infinite scroll for long histories (>50 items)

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Create status change, then comment | Both appear in order |
| Manual | Hover own comment | Edit/delete buttons appear |
| Visual | Compare comment vs event | Visually distinct |

**Expected Outcome**: Unified activity feed complete.

---

### Milestone 7 Completion Checklist

- [ ] System events logging works
- [ ] Activity feed displays events
- [ ] TipTap editor functional
- [ ] @mentions work
- [ ] Comments CRUD works
- [ ] Image attachments work
- [ ] Combined feed renders correctly

---

## Milestone 8: Admin Review Page

### Goal
Build dedicated page for admin to review tasks.

---

### Task 8.1: Admin Review Query

**Description**: Create query for admin review items.

**Files to modify**:
- `convex/tasks.ts` - Add `getAdminReviewItems` query

**Acceptance Criteria**:
- [ ] Returns all tasks with status="admin_review"
- [ ] Includes both main tasks and subtasks
- [ ] Sorted by createdAt (oldest first - FIFO queue)
- [ ] Shows who assigned task to review and when

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Unit | Task with admin_review status | Appears in results |
| Unit | Change status away | Disappears from results |

---

### Task 8.2: Admin Review Page

**Description**: Build the admin review page UI.

**Files to create**:
- `app/(dashboard)/review/page.tsx` - Page component
- `components/review/review-list.tsx` - List component
- `components/review/review-item.tsx` - Item component

**Acceptance Criteria**:
- [ ] Only accessible by admin users (redirect others)
- [ ] Shows list of tasks pending admin review
- [ ] Each item shows: Task title, Client, Assignee, Time in review
- [ ] Click opens task popup
- [ ] Quick actions: Approve (→ Done), Request Changes (→ In Progress)
- [ ] Empty state: "No tasks pending review"
- [ ] Badge count in sidebar shows pending review count

**Tests**:
| Test Type | Description | Expected Result |
|-----------|-------------|-----------------|
| Manual | Non-admin visits /review | Redirected to /tasks |
| Manual | Admin visits /review | Page loads |
| Manual | Click "Approve" | Status changes to Done |
| Manual | Check sidebar | Badge shows count |

**Expected Outcome**: Admin has dedicated review workflow.

---

### Milestone 8 Completion Checklist

- [ ] Admin review query works
- [ ] Page only accessible to admins
- [ ] Quick approve/reject actions work
- [ ] Sidebar badge shows count

---

## Final Integration Testing

After all milestones complete, run these end-to-end scenarios:

### E2E Test Scenarios

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | Full task lifecycle | Create task → Add subtask → Track time → Add comment → Change to Admin Review → Admin approves | All data persists correctly |
| 2 | Multi-user timer | User A starts timer → User B starts on same task | Both entries tracked separately |
| 3 | Real-time sync | User A edits task → User B viewing same task | B sees changes immediately |
| 4 | Today workflow | Mark task Today → Reorder → Track time → Complete | Workflow smooth |
| 5 | Subtask cascade | Delete parent task | All subtasks also deleted |
| 6 | Midnight timer | Start timer at 11pm → Stop at 1am | Two entries created |
| 7 | Comment with mention | @mention user in comment | User ID stored in event |

---

## Definition of Done

A milestone is complete when:

1. All acceptance criteria checkboxes are checked
2. No console errors in development
3. No TypeScript errors (`npm run build` passes)
4. UI is responsive (test at 375px and 1440px)
5. Real-time updates work across browser tabs
6. Loading and error states are handled

---

## Technical Patterns to Follow

### Convex Function Organization
```
convex/
├── schema.ts           # Schema definition
├── lib/
│   ├── auth.ts        # Auth helpers
│   └── timezone.ts    # Timezone utilities
├── tasks.ts           # Task queries & mutations
├── clients.ts         # Client queries & mutations
├── timeEntries.ts     # Time entry queries & mutations
├── activityEvents.ts  # Activity queries & mutations
├── attachments.ts     # Attachment mutations
└── users.ts           # User queries & mutations
```

### Component Organization
```
components/
├── ui/                # shadcn components (don't modify)
├── layout/            # App shell components
├── tasks/
│   ├── task-table.tsx
│   ├── task-row.tsx
│   ├── cells/         # Cell components
│   └── task-popup/    # Popup components
├── today/             # Today view components
├── time/              # Time tracking components
│   ├── time-pill.tsx          # Main pill (play/stop + popover trigger)
│   ├── time-popover.tsx       # Popover with Quick Add + entries
│   ├── time-entry-list.tsx    # Entry list with expand/collapse
│   ├── time-entry-row.tsx     # Single entry row
│   ├── time-entry-actions.tsx # Edit/Delete dropdown
│   └── time-edit-dialog.tsx   # Edit entry dialog
├── clients/           # Client management components
└── review/            # Admin review components
```

### State Management
- Server state: Convex useQuery/useMutation
- URL state: nuqs or manual searchParams
- Local UI state: useState/useReducer
- No global client state library needed

### Error Handling Pattern
```typescript
const mutation = useMutation(api.tasks.update);

async function handleUpdate(data) {
  try {
    await mutation(data);
    toast.success("Saved");
  } catch (error) {
    toast.error("Failed to save. Please try again.");
    // Revert optimistic update if applicable
  }
}
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Schema migrations | Schema is frozen after M1; plan carefully |
| Timer accuracy | Server timestamps only; client just displays |
| Race conditions | Convex handles via optimistic concurrency |
| Large task lists | Implement pagination in M3 if needed |
| TipTap bundle size | Dynamic import in M7 |

---

## Out of Scope (Phase 2)

- Reports view (time aggregation)
- Invoice generation
- Számlázz.hu integration
- Email notifications (Resend)
- Multi-organization switching
- Data export
