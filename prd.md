# Konverted Flow – Application Specification 

## 1. What Konverted Flow Is

Konverted Flow is an **agency-focused task management, time tracking, reporting, and invoicing application**.
Konverted Flow is a time-centric task management application that combines a Notion-style spreadsheet UI with ClickUp-like task detail views to measure agency tsaks, subtasks, turn daily work directly into measurable reports and invoices. Its core value is making time tracking effortless and structurally correct so that reporting and billing become a natural by-product of work, not an extra admin task.

It is designed for service teams that:
- work with tasks and subtasks
- track billable time (often retroactively)
- generate client reports
- invoice clients based on hourly rates

The system connects **daily work execution** directly to **reports and invoices**, without requiring separate tools.

---

## 2. Core Concepts

### 2.1 Task Model

There is a **single Task model** in the system.

- A task can optionally have a `parentTaskId`
- Tasks with `parentTaskId = null` are **main tasks**
- Tasks with `parentTaskId != null` are **subtasks**

Main tasks and subtasks:
- have identical fields
- support identical functionality
- differ only in **where they appear in the UI**

---

### 2.2 Status System

Tasks and subtasks have a **manual status**.

Allowed statuses:
- Today
- Next up
- In Progress
- Adam Review
- Client Review
- Stuck
- Done

Rules:
- Any task or subtask with `status = Today` appears in the **Today view**
- Items remain in Today until the user manually changes the status
- Status is not date-based (no automatic rollover)

---

## 3. Main Views Overview

Konverted Flow consists of the following primary views:

1. Main Task View (notion like Spreadsheet)
2. Task Popup (Clickup like Detail View)
3. Today View
4. Reports View
5. Invoice View
6. cleints - manage and set up client details 

Each view has a specific purpose and set of allowed interactions.

---

## 4. Main Task View (Spreadsheet)

### Purpose
Used for **creating, editing, and organizing main tasks**.

### Layout
- Notion-like spreadsheet interface
- Each row represents a **main task**
- Inline editable cells
- No explicit save action

### Fields per Task
Each task row contains:
- Title
- Description
- Client
- Assignee(s)
- Status
- Priority (3 flags: High / Medium / Low)
- Time pill (stopwatch)
- Subtask indicator (icon + number) + if new since last login a DOT to express unseen change

### Time Pill Behavior
Each task has:
- Start/stop stopwatch button
- One-click manual time additions:
  - 15 minutes
  - 30 minutes
  - 45 minutes
  - 1 hour
  - 2 hours
  - 3 hours
  - up to 8 hours

Rules:
- Only one active timer per user
- Starting a new timer automatically stops the previous one
- Time is tracked per calendar day

### Subtask Indicator
- Displays how many subtasks belong to the main task
- Clicking the row opens the **Task Popup**

---

## 5. Task Popup (Detail View)

### Purpose
Used for **detailed task management and subtask creation**.

### Trigger
- Opens when clicking a main task row

### Layout
Split-view popup (ClickUp-style):

#### Left Side (Task Details)
All fields are inline editable:
- Title
- Description
- Priority
- Status
- Assignees
- Time tracking (same time pill behavior)

Below task fields:
- A large subtask surface (mini spreadsheet)

#### Subtasks Section
- Inline creation (same UX as main task table)
- Same fields as main tasks
- Subtasks inherit client from parent
- Subtasks can be marked as Today here
- Subtasks are not visible in the main task table

#### Right Side (Sidebar)
- Activity log (system events)
- Chat/comments (future-ready, optional MVP)
- This is using a TipTap text editor.You can tag people. You can attach images.Also, every change regarding that task and its subtask is reflected in the activity log.

---

## 6. Today View (Daily Execution View)

### Purpose
Shows **all work planned for today**, regardless of hierarchy.

### Inclusion Rule
Any task or subtask with:
- `status = Today`

### Layout
- Flat list (no hierarchy / no indentation)
- Tasks and subtasks appear equally. 

Each row shows:
- Time pill
- Task or subtask name
- Context line:
  - Main task: `Client · Priority`
  - Subtask: `Parent task name · Client · Priority`

### Sorting
1. Priority (High → Medium → Low)
2. Active timers appear first within priority

### Allowed Actions
- Start/stop timer
- Add manual time
- Edit task fields
- Open task popup
- Change status
- Create new tasks inline
- Reorder by dragging



---

## 7. Time Tracking System

### Core Rules
- Time is tracked **per task or subtask**
- Time entries are **per user**
- Time is associated with a calendar day (YYYY-MM-DD)

### Entry Methods
1. Stopwatch (start/stop)
2. Manual time entry

### Manual Time Entry UX
Quick-select values:
- 15m
- 30m
- 45m
- 1h
- 2h
- 3h
- 4h
- 6h
- 8h
- Custom value

### Editing
- Past time entries can be edited freely
- Manual correction is expected and supported

---

## 8. Reports View

### Purpose
Review and correct time data before invoicing.

### Report Creation
Filters:
- Client
- Date range

### Report Structure
Hierarchical:
- Main task
  - Subtasks

Displays:
- Time per item
- Aggregated totals

### Behavior
- Reports are editable
- Used as a review surface
- Stored as snapshots

---

## 9. Invoice View

### Purpose
Generate invoices from reviewed reports.

### Rules
- Hourly rate is defined per client
- Invoice is generated from a report
- Invoice stores:
  - Report reference
  - Total amount
  - PDF URL

### Post-Invoice Behavior
- Reports remain editable
- Editing an invoiced report shows a warning
- Edits are not blocked

---

## 10. User Stories (Primary)

### As a team member
- I can create tasks and subtasks quickly
- I can mark what I work on today
- I can track time without friction
- I can add time retroactively

### As a manager
- I can review all work done for a client
- I can correct time before billing
- I can generate accurate reports

### As an admin
- I can set hourly rates per client
- I can generate invoices from reports
- I can track billable work reliably

---

##Technical Requirements

### 5.1 Tech Stack
- Frontend: Next.js (App Router), React, shadcn/ui
- Backend: Convex (realtime backend)
- Auth: Clerk
- Database: Convex managed storage
- Infrastructure: Vercel + Convex Cloud

### 5.2 Integrations
- Számlázz.hu (invoice generation)
- Resend (email notifications)

### 5.3 Data Requirements
Core entities:
- Organization
- User
- Task (parent and subtask)
- TimeEntry
- ActivityEvent
- Client
- Report
- Invoice

All domain data is scoped by `orgId`.

### 5.4 Security & Compliance
- Clerk-based authentication
- Role-based authorization (admin, member, viewer)
- Org-level data isolation
- No sensitive secrets stored in client code

### 5.5 Performance Requirements
- Inline edits <100ms perceived latency
- Realtime updates across users
- Report generation <2 seconds for typical datasets

