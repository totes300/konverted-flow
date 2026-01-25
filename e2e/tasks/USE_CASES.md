# Tasks Page - Use Cases & Test Scenarios

## Overview
The `/tasks` page is a comprehensive task management interface supporting CRUD operations, filtering, batch actions, and detailed task views.

---

## Use Cases

### UC-01: View Tasks List
**Actor:** Authenticated User
**Precondition:** User is logged in and has access to the organization
**Description:** User navigates to the tasks page to view all tasks
**Expected Result:** Tasks are displayed in a table with columns for title, client, assignees, status, priority, and time

### UC-02: Create New Task
**Actor:** Authenticated User
**Precondition:** User is on the tasks page
**Description:** User uses the quick-add input to create a new task
**Expected Result:** New task is created and appears in the task list

### UC-03: Filter Tasks by Status
**Actor:** Authenticated User
**Precondition:** Tasks exist with various statuses
**Description:** User selects one or more status filters
**Expected Result:** Only tasks matching the selected statuses are displayed

### UC-04: Filter Tasks by Client
**Actor:** Authenticated User
**Precondition:** Tasks exist assigned to different clients
**Description:** User selects a client from the dropdown filter
**Expected Result:** Only tasks for the selected client are displayed

### UC-05: Filter Tasks by Assignee
**Actor:** Authenticated User
**Precondition:** Tasks exist with different assignees
**Description:** User selects an assignee from the dropdown filter
**Expected Result:** Only tasks assigned to the selected user are displayed

### UC-06: Search Tasks
**Actor:** Authenticated User
**Precondition:** Tasks exist with various titles
**Description:** User types in the search box and presses Enter
**Expected Result:** Tasks matching the search query are displayed

### UC-07: Group Tasks
**Actor:** Authenticated User
**Precondition:** Tasks exist
**Description:** User selects a grouping option (client, status, assignee, priority)
**Expected Result:** Tasks are grouped and displayed in sections

### UC-08: Open Task Details
**Actor:** Authenticated User
**Precondition:** At least one task exists
**Description:** User clicks on a task row
**Expected Result:** Task detail panel opens from the right side

### UC-09: Edit Task in Detail View
**Actor:** Authenticated User
**Precondition:** Task detail panel is open
**Description:** User modifies task title, description, status, or priority
**Expected Result:** Changes are saved and reflected immediately

### UC-10: Change Task Status Inline
**Actor:** Authenticated User
**Precondition:** Tasks are displayed in the table
**Description:** User clicks on status badge and selects a new status
**Expected Result:** Task status is updated immediately

### UC-11: Change Task Priority Inline
**Actor:** Authenticated User
**Precondition:** Tasks are displayed in the table
**Description:** User clicks on priority indicator and selects a new priority
**Expected Result:** Task priority is updated immediately

### UC-12: Select Multiple Tasks
**Actor:** Authenticated User
**Precondition:** Multiple tasks exist
**Description:** User clicks checkboxes on multiple task rows
**Expected Result:** Selected tasks are highlighted and batch action bar appears

### UC-13: Batch Update Status
**Actor:** Authenticated User
**Precondition:** Multiple tasks are selected
**Description:** User selects a status from the batch action dropdown
**Expected Result:** All selected tasks are updated to the new status

### UC-14: Batch Delete Tasks
**Actor:** Authenticated User
**Precondition:** Multiple tasks are selected
**Description:** User clicks the delete button in batch action bar
**Expected Result:** All selected tasks are soft-deleted

### UC-15: Delete Single Task
**Actor:** Authenticated User
**Precondition:** Task exists in the list
**Description:** User clicks delete from task actions menu
**Expected Result:** Task is soft-deleted and removed from list

### UC-16: Duplicate Task
**Actor:** Authenticated User
**Precondition:** Task exists in the list
**Description:** User clicks duplicate from task actions menu
**Expected Result:** New task is created with same properties

### UC-17: Clear All Filters
**Actor:** Authenticated User
**Precondition:** One or more filters are active
**Description:** User clicks the clear filters button
**Expected Result:** All filters are removed and full task list is displayed

### UC-18: URL Filter Persistence
**Actor:** Authenticated User
**Precondition:** Filters are applied
**Description:** User refreshes the page or shares the URL
**Expected Result:** Filters are restored from URL query parameters

### UC-19: Manage Subtasks
**Actor:** Authenticated User
**Precondition:** Task detail panel is open
**Description:** User adds, edits, or removes subtasks
**Expected Result:** Subtasks are updated in the task

### UC-20: Add Task Comment
**Actor:** Authenticated User
**Precondition:** Task detail panel is open
**Description:** User types and submits a comment
**Expected Result:** Comment appears in the activity feed

---

## Test Scenarios

### TS-01: Page Load & Display
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-01-01 | Page loads successfully | Navigate to /tasks | Page renders without errors |
| TS-01-02 | Loading skeleton shown | Navigate to /tasks | Skeleton UI shows during load |
| TS-01-03 | Empty state displayed | No tasks exist | Empty state message shown |
| TS-01-04 | Tasks displayed in table | Tasks exist | Table shows all tasks |
| TS-01-05 | Task columns visible | Tasks loaded | All columns (checkbox, thumbnail, title, client, assignees, status, priority, time, actions) visible |

### TS-02: Task Creation
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-02-01 | Create task via quick-add | Type title, press Enter | Task created, appears in list |
| TS-02-02 | Cancel task creation | Type title, press Escape | Input cleared, no task created |
| TS-02-03 | Empty title rejected | Press Enter with empty input | No task created |

### TS-03: Status Filter
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-03-01 | Single status filter | Select "In Progress" | Only in-progress tasks shown |
| TS-03-02 | Multiple status filter | Select "Today" and "Next Up" | Tasks with either status shown |
| TS-03-03 | Clear status filter | Click selected status again | Filter removed |
| TS-03-04 | URL reflects status | Select status | URL contains status param |

### TS-04: Client Filter
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-04-01 | Filter by client | Select client from dropdown | Only client's tasks shown |
| TS-04-02 | Clear client filter | Select "All Clients" | All tasks shown |
| TS-04-03 | URL reflects client | Select client | URL contains clientId param |

### TS-05: Assignee Filter
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-05-01 | Filter by assignee | Select user from dropdown | Only user's tasks shown |
| TS-05-02 | Clear assignee filter | Select "All Assignees" | All tasks shown |
| TS-05-03 | URL reflects assignee | Select assignee | URL contains assigneeId param |

### TS-06: Search
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-06-01 | Search by title | Type query, press Enter | Matching tasks shown |
| TS-06-02 | No results | Search non-existent term | Empty/no results state |
| TS-06-03 | Clear search | Clear input, press Enter | All tasks shown |
| TS-06-04 | Case insensitive | Search with different case | Matches found |

### TS-07: Grouping
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-07-01 | Group by client | Select "Client" from group dropdown | Tasks grouped by client |
| TS-07-02 | Group by status | Select "Status" from group dropdown | Tasks grouped by status |
| TS-07-03 | Group by assignee | Select "Assignee" from group dropdown | Tasks grouped by assignee |
| TS-07-04 | Group by priority | Select "Priority" from group dropdown | Tasks grouped by priority |
| TS-07-05 | Remove grouping | Select "None" | Flat list displayed |

### TS-08: Task Detail Panel
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-08-01 | Open panel | Click task row | Panel slides in from right |
| TS-08-02 | Close panel | Click X or outside | Panel closes |
| TS-08-03 | URL reflects task | Open task | URL contains task param |
| TS-08-04 | Direct link works | Navigate to /tasks?task=<id> | Panel opens automatically |
| TS-08-05 | Edit title | Change title, blur | Title updated |
| TS-08-06 | Edit description | Modify description | Description saved |
| TS-08-07 | Change status | Select new status | Status updated |
| TS-08-08 | Change priority | Select new priority | Priority updated |

### TS-09: Inline Editing
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-09-01 | Change status inline | Click status badge, select new | Status updated immediately |
| TS-09-02 | Change priority inline | Click priority, select new | Priority updated immediately |
| TS-09-03 | Dropdown closes | Select option | Dropdown closes after selection |

### TS-10: Selection & Batch Actions
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-10-01 | Select single task | Click checkbox | Task highlighted, count shows 1 |
| TS-10-02 | Select all tasks | Click header checkbox | All tasks selected |
| TS-10-03 | Deselect all | Click header checkbox again | All deselected |
| TS-10-04 | Batch bar appears | Select task | Batch action bar visible |
| TS-10-05 | Batch status update | Select tasks, change status | All selected updated |
| TS-10-06 | Batch delete | Select tasks, click delete | All selected removed |
| TS-10-07 | Clear selection | Click clear button | Selection cleared |

### TS-11: Single Task Actions
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-11-01 | Delete task | Click delete in actions menu | Task removed from list |
| TS-11-02 | Duplicate task | Click duplicate in actions menu | New task created |
| TS-11-03 | Actions menu opens | Click more button | Menu appears |

### TS-12: Filter Persistence
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-12-01 | Filters persist on refresh | Apply filters, refresh | Filters still active |
| TS-12-02 | Combined filters | Apply multiple filters | All filters in URL |
| TS-12-03 | Clear all filters | Click clear button | URL cleared, all tasks shown |

### TS-13: Empty States
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-13-01 | No tasks empty state | No tasks in org | Appropriate message shown |
| TS-13-02 | Filtered empty state | Filter returns no results | "No matching tasks" message |

### TS-14: Accessibility
| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS-14-01 | Keyboard navigation | Tab through elements | Focus visible, logical order |
| TS-14-02 | Enter submits | Focus on button, press Enter | Action executed |
| TS-14-03 | Escape closes | Modal open, press Escape | Modal closes |

---

## Priority Matrix

| Priority | Test Scenarios |
|----------|---------------|
| P0 (Critical) | TS-01-01, TS-01-04, TS-02-01, TS-08-01, TS-08-05 |
| P1 (High) | TS-03-01, TS-04-01, TS-05-01, TS-06-01, TS-10-05, TS-11-01 |
| P2 (Medium) | TS-07-*, TS-09-*, TS-10-*, TS-12-* |
| P3 (Low) | TS-13-*, TS-14-* |
