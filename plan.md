# Konverted Flow – Product Requirements Document

## 1. Executive Summary
Konverted Flow is a time-centric task management application that combines a Notion-style spreadsheet UI with ClickUp-like task detail views to measure agency tsaks, subtasks, turn daily work directly into measurable reports and invoices. Its core value is making time tracking effortless and structurally correct so that reporting and billing become a natural by-product of work, not an extra admin task.

---

## 2. Business Context

### 2.1 Problem Statement
Service teams manage tasks, subtasks, and time across fragmented tools (Notion, ClickUp, time trackers, invoicing software). Time tracking is often inaccurate or skipped because it interrupts work, leading to unreliable reports and manual invoicing. This causes revenue leakage, admin overhead, and poor visibility into actual work performed.

### 2.2 Business Objectives
- Reduce time spent on manual time tracking and reporting by **50%**
- Increase accuracy of billable time capture to **>95%**
- Enable invoice generation directly from tracked work without external tools

### 2.3 Success Metrics
- % of tasks with logged time
- Average time to log work on a task
- Number of reports generated per month
- Time from report creation to invoice generation
- Weekly active users (WAU)

---

## 3. User Context

### 3.1 Target Users
- Small to mid-sized service teams (agencies, consultants, internal delivery teams)
- Teams billing clients based on time or effort
- Users familiar with Notion-style tables but frustrated by poor time tracking

### 3.2 User Stories
- As a team member, I want to add and edit tasks inline so that I don’t lose focus.
- As a team member, I want time tracking to be one click so that I actually use it.
- As a manager, I want accurate time-based reports per client so that billing is correct.
- As an admin, I want to generate invoices directly from reports so that billing is fast and reliable.

### 3.3 User Journey
1. User opens the task table (spreadsheet view)
2. User adds tasks inline and starts timers while working
3. User opens a task to break it down into subtasks
4. Time is tracked automatically or manually
5. User generates a report for a client and time period
6. User generates an invoice from the report

---

## 4. Functional Requirements

### 4.1 Core Features

| Feature | Description | Priority |
|------|-----------|----------|
| Task Spreadsheet View | Notion-like table with inline editing | P0 |
| Inline Task Creation | Create tasks by typing in new rows | P0 |
| Image Field | Paste images directly into task rows | P0 |
| Time Tracking | Start/stop timer + manual time entry | P0 |
| Task Popup | Split view with details and activity | P0 |
| Subtasks (Popup Only) | Inline mini-spreadsheet inside task popup | P0 |
| Activity Log | Event-based audit trail per task | P0 |
| Reports | Client + time-range based aggregation | P0 |
| Invoice Generation | Create invoices via Számlázz.hu API | P1 |

---

### 4.2 Feature Details

#### Task Table View (Main Board)
- Spreadsheet-style UI (rows = tasks, columns = fields)
- Inline editing with no explicit save
- Supported fields:
  - Name
  - Image (pasteable)
  - Time pill (start/stop)
  - Priority (flag)
  - Assignee
  - Configurable text fields
- Enter creates a new task row

#### Task Popup (Split View)
- Opens when clicking a task row
- Left panel:
  - Parent task details
  - Subtasks section (inline mini-spreadsheet)
- Right panel:
  - Activity board (collapsible & closable)
  - Logs every change in the task or subtasks

#### Subtasks (Corrected Model)
- Subtasks are **not visible in the main board**
- Subtasks exist **only inside the parent task popup**
- Rendered as a mini spreadsheet under the parent task
- Same fields as main tasks:
  - Name
  - Image (paste)
  - Time pill
  - Priority
  - Assignee
  - Description
- Data-wise, subtasks are tasks with `parentTaskId`

#### Time Tracking (Critical Feature)
- Time pill available on parent tasks and subtasks
- Manual time addition supported
- Global timer widget appears if a timer is running and the user navigates away
- Parent task time = parent direct time + all subtask time
- Hovering parent time shows breakdown between parent and subtasks

#### Reports
- Filter by:
  - Client
  - Date range
- Shows:
  - Tasks and subtasks
  - Logged time
  - Totals
- Reports are saved as immutable snapshots

#### Invoicing
- Generate invoice from a saved report
- Uses Számlázz.hu API
- Stores invoice metadata and PDF link
- Invoice is linked to client and report

---

### 4.3 Out of Scope
- Client login / client portal
- Subscription billing
- Advanced automation rules
- Gantt charts or calendar views
- Public sharing of tasks or reports

---

## 5. Technical Requirements

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

---

## 6. UI/UX Requirements

### 6.1 Key Screens/Views
- Task Table View
- Task Popup (Split View)
- Reports Page
- Invoice View

### 6.2 Design Guidelines
- Notion-like density and clarity
- Minimal modals, keyboard-first interactions
- Clear visual state for running timers

### 6.3 Wireframes/Mockups
- To be added (initial implementation driven by functional UX)

---

## 7. Constraints & Assumptions

### 7.1 Constraints
- MVP focused on internal team usage only
- No offline support initially

### 7.2 Assumptions
- Users are familiar with spreadsheet-style tools
- Time-based billing is the primary reporting driver

### 7.3 Dependencies
- Clerk availability
- Számlázz.hu API stability

---

## 8. Implementation Guidance for Claude Code

### 8.1 Recommended Approach
- Event-based activity logging
- Realtime optimistic UI using Convex
- Single task model with `parentTaskId` for subtasks
- Rollup calculations done server-side

### 8.2 File Structure (Optional)
- `app/` – routes and layouts
- `components/` – UI components
- `convex/` – schema, queries, mutations
- `lib/` – shared utilities

### 8.3 Implementation Phases
1. Phase 1: Auth, orgs, base task model
2. Phase 2: Task table + popup + subtasks
3. Phase 3: Time tracking + reports
4. Phase 4: Invoicing + polish

### 8.4 Testing Strategy
- Unit tests for time aggregation logic
- Integration tests for report generation
- Manual UX testing for inline editing flows

---

## 9. Open Questions
- Should subtasks ever be optionally shown in the main board?
- Should time tracking auto-pause on browser close?
- Should reports support hourly rates per user or per client?

---

## 10. Appendix
- Comparable tools: Notion, ClickUp, Harvest
- Core inspiration: spreadsheet speed + billing accuracy
