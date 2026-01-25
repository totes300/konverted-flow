# Critical Fixes Implementation Plan

## Overview

This document contains fixes for critical issues identified in the code review. Each fix is broken into small, testable chunks with acceptance criteria and test cases.

**Total Fixes**: 28
**Estimated Effort**: High

---

## Progress Tracking

| Section | Status | Completed |
|---------|--------|-----------|
| F1: Security Fixes | Not started | - |
| F2: Performance Fixes | Not started | - |
| F3: Correctness Fixes | Not started | - |
| F4: Missing Features | Not started | - |

---

## F1: Security Fixes (CRITICAL - Do First)

### F1.1: Convert Public User Mutations to Internal

**Problem**: `upsertFromClerk` and `deleteFromClerk` are public mutations anyone can call.

**Files to modify**:
- `convex/users.ts`
- `app/api/webhooks/clerk/route.ts`

**Changes**:
```typescript
// convex/users.ts - Change from mutation to internalMutation
import { internalMutation } from "./_generated/server";

export const upsertFromClerk = internalMutation({
  // ... same args and handler
});

export const deleteFromClerk = internalMutation({
  // ... same args and handler
});
```

```typescript
// app/api/webhooks/clerk/route.ts - Use internal client
import { fetchMutation } from "convex/nextjs";
import { internal } from "@/convex/_generated/api";

// Replace:
await convex.mutation(api.users.upsertFromClerk, {...});
// With:
await fetchMutation(internal.users.upsertFromClerk, {...});
```

**Acceptance Criteria**:
- [ ] `upsertFromClerk` is `internalMutation`
- [ ] `deleteFromClerk` is `internalMutation`
- [ ] Webhook still creates users successfully
- [ ] Direct API call to `api.users.upsertFromClerk` fails (function not exported)

**Tests**:
```typescript
// convex/users.test.ts
describe("F1.1: Internal mutations security", () => {
  it("should not expose upsertFromClerk in public API", () => {
    // Verify api.users does not have upsertFromClerk
    expect((api.users as any).upsertFromClerk).toBeUndefined();
  });

  it("should expose upsertFromClerk in internal API", () => {
    expect(internal.users.upsertFromClerk).toBeDefined();
  });

  it("webhook should still create users", async () => {
    // Integration test: POST to webhook endpoint with valid signature
    // Verify user created in database
  });
});
```

---

### F1.2: Fix Race Condition in Admin Assignment

**Problem**: Two simultaneous signups can both become admin.

**Files to modify**:
- `convex/users.ts`

**Changes**:
```typescript
// convex/users.ts - Add atomic check using unique constraint or lock
export const upsertFromClerk = internalMutation({
  handler: async (ctx, args) => {
    // ... existing code ...

    // Use a deterministic admin selection based on Clerk ID
    // The first user alphabetically by clerkId becomes admin
    const existingUsersInOrg = await ctx.db
      .query("users")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();

    // Check if any existing user is admin
    const hasAdmin = existingUsersInOrg.some((u) => u.role === "admin");

    // If no admin exists, this user becomes admin only if they have the
    // lowest clerkId (deterministic tie-breaker)
    let role: "admin" | "member" = "member";
    if (!hasAdmin) {
      const allClerkIds = [...existingUsersInOrg.map(u => u.clerkId), args.clerkId];
      allClerkIds.sort();
      if (allClerkIds[0] === args.clerkId) {
        role = "admin";
      }
    }

    // ... rest of code ...
  },
});
```

**Acceptance Criteria**:
- [ ] Only one user becomes admin even with concurrent signups
- [ ] Admin is deterministically assigned (lowest clerkId)
- [ ] Existing orgs with admins don't get new admins

**Tests**:
```typescript
// convex/users.test.ts
describe("F1.2: Admin race condition", () => {
  it("should assign admin to lowest clerkId when concurrent", async () => {
    // Simulate two concurrent user creations
    const user1 = { clerkId: "user_zzz", email: "z@test.com", name: "Z" };
    const user2 = { clerkId: "user_aaa", email: "a@test.com", name: "A" };

    // Create both (simulating race)
    await Promise.all([
      ctx.mutation(internal.users.upsertFromClerk, user1),
      ctx.mutation(internal.users.upsertFromClerk, user2),
    ]);

    // Verify only user_aaa is admin
    const users = await ctx.query(api.users.listByOrg);
    const admins = users.filter(u => u.role === "admin");
    expect(admins).toHaveLength(1);
    expect(admins[0].clerkId).toBe("user_aaa");
  });

  it("should not create new admin if org already has one", async () => {
    // Create first user (becomes admin)
    await ctx.mutation(internal.users.upsertFromClerk, {
      clerkId: "user_first",
      email: "first@test.com",
      name: "First",
    });

    // Create second user
    await ctx.mutation(internal.users.upsertFromClerk, {
      clerkId: "user_second",
      email: "second@test.com",
      name: "Second",
    });

    const users = await ctx.query(api.users.listByOrg);
    const admins = users.filter(u => u.role === "admin");
    expect(admins).toHaveLength(1);
  });
});
```

---

### F1.3: Implement Proper Soft Delete for Users

**Problem**: "Soft delete" just updates `lastSeenAt`, user remains functional.

**Files to modify**:
- `convex/schema.ts` - Add `isDeleted` field
- `convex/users.ts` - Update delete logic
- `convex/lib/auth.ts` - Check for deleted users

**Changes**:
```typescript
// convex/schema.ts
users: defineTable({
  // ... existing fields ...
  isDeleted: v.optional(v.boolean()), // New field, optional for migration
})

// convex/users.ts
export const deleteFromClerk = internalMutation({
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      // Stop any running timers
      const runningEntry = await ctx.db
        .query("timeEntries")
        .withIndex("by_userId_and_isRunning", (q) =>
          q.eq("userId", existingUser._id).eq("isRunning", true)
        )
        .first();

      if (runningEntry) {
        await ctx.db.patch(runningEntry._id, {
          isRunning: false,
          durationSeconds: Math.floor((Date.now() - (runningEntry.startTime || Date.now())) / 1000),
        });
      }

      // Soft delete user
      await ctx.db.patch(existingUser._id, {
        isDeleted: true,
        lastSeenAt: Date.now(),
      });
    }
  },
});

// convex/lib/auth.ts
export async function getUser(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  // Check if user is deleted
  if (user?.isDeleted) {
    return null;
  }

  return user;
}
```

**Acceptance Criteria**:
- [ ] Schema has `isDeleted` field on users
- [ ] `deleteFromClerk` sets `isDeleted: true`
- [ ] Deleted users cannot authenticate (getUser returns null)
- [ ] Running timers are stopped when user is deleted

**Tests**:
```typescript
// convex/users.test.ts
describe("F1.3: Proper soft delete", () => {
  it("should set isDeleted flag when deleted", async () => {
    // Create user
    await ctx.mutation(internal.users.upsertFromClerk, {
      clerkId: "user_delete_test",
      email: "delete@test.com",
      name: "Delete Me",
    });

    // Delete user
    await ctx.mutation(internal.users.deleteFromClerk, {
      clerkId: "user_delete_test",
    });

    // Verify isDeleted is true
    const user = await ctx.db.query("users")
      .withIndex("by_clerkId", q => q.eq("clerkId", "user_delete_test"))
      .unique();
    expect(user?.isDeleted).toBe(true);
  });

  it("should prevent deleted user from authenticating", async () => {
    // Setup: user with isDeleted: true trying to access
    // getUser should return null
  });

  it("should stop running timer when user deleted", async () => {
    // Create user, start timer, delete user
    // Timer should be stopped
  });
});
```

---

### F1.4: Add Rate Limiting to Mutations

**Problem**: No rate limiting allows DoS attacks.

**Files to create**:
- `convex/lib/rateLimit.ts`

**Files to modify**:
- `convex/tasks.ts`
- `convex/timeEntries.ts`
- `convex/clients.ts`

**Changes**:
```typescript
// convex/lib/rateLimit.ts
import { ConvexError } from "convex/values";
import { MutationCtx } from "../_generated/server";

// Simple in-memory rate limiter using Convex's built-in caching
// For production, use Convex's rate limiting or external service

const RATE_LIMITS = {
  create: { requests: 30, windowMs: 60000 }, // 30 per minute
  update: { requests: 60, windowMs: 60000 }, // 60 per minute
  delete: { requests: 20, windowMs: 60000 }, // 20 per minute
  timer: { requests: 10, windowMs: 60000 },  // 10 per minute
} as const;

// Note: This is a simplified version. For production, use:
// - Convex rate limiting: https://docs.convex.dev/production/rate-limiting
// - Or store rate limit state in a dedicated table

export function checkRateLimit(
  operation: keyof typeof RATE_LIMITS,
  userId: string
): void {
  // Placeholder - implement with Convex rate limiting
  // For now, just log
  console.log(`Rate limit check: ${operation} for ${userId}`);
}
```

**Acceptance Criteria**:
- [ ] Rate limit helper created
- [ ] Mutations check rate limits before executing
- [ ] Exceeding rate limit throws ConvexError

**Tests**:
```typescript
// convex/lib/rateLimit.test.ts
describe("F1.4: Rate limiting", () => {
  it("should allow requests within limit", () => {
    // Make 10 requests
    // All should succeed
  });

  it("should block requests exceeding limit", () => {
    // Make 100 rapid requests
    // Should throw after limit exceeded
  });
});
```

---

### F1.5: Validate File Uploads

**Problem**: No file type/size validation on uploads.

**Files to modify**:
- `convex/tasks.ts` (image upload)

**Changes**:
```typescript
// convex/tasks.ts
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const updateTaskImage = mutation({
  args: {
    id: v.id("tasks"),
    storageId: v.id("_storage"),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);

    if (!task || task.orgId !== user.orgId) {
      throw new ConvexError("Task not found");
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(args.fileType)) {
      // Delete the uploaded file
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(
        `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`
      );
    }

    // Validate file size
    if (args.fileSize > MAX_IMAGE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError("File too large. Maximum size is 5MB");
    }

    // Delete old image if exists
    if (task.imageStorageId) {
      await ctx.storage.delete(task.imageStorageId);
    }

    await ctx.db.patch(args.id, {
      imageStorageId: args.storageId,
      updatedAt: Date.now(),
    });
  },
});
```

**Acceptance Criteria**:
- [ ] Only allowed image types accepted
- [ ] Files over 5MB rejected
- [ ] Invalid uploads are deleted from storage
- [ ] Client passes fileType and fileSize to mutation

**Tests**:
```typescript
// convex/tasks.test.ts
describe("F1.5: File upload validation", () => {
  it("should accept valid image types", async () => {
    // Upload JPEG, PNG, GIF, WebP
    // All should succeed
  });

  it("should reject invalid file types", async () => {
    // Try to upload .exe, .pdf, .svg
    // Should throw error
  });

  it("should reject files over 5MB", async () => {
    // Upload 10MB file
    // Should throw error
  });

  it("should delete rejected files from storage", async () => {
    // Upload invalid file
    // Verify storage.delete was called
  });
});
```

---

## F2: Performance Fixes

### F2.1: Add Pagination to Task List

**Problem**: `list()` loads all tasks into memory.

**Files to modify**:
- `convex/tasks.ts`

**Changes**:
```typescript
// convex/tasks.ts
export const list = query({
  args: {
    status: v.optional(v.array(statusValidator)),
    clientId: v.optional(v.id("clients")),
    assigneeId: v.optional(v.id("users")),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const limit = Math.min(args.limit || 50, 100); // Max 100

    let query = ctx.db
      .query("tasks")
      .withIndex("by_orgId_and_isDeleted", (q) =>
        q.eq("orgId", orgId).eq("isDeleted", false)
      );

    // Apply cursor for pagination
    if (args.cursor) {
      query = query.filter((q) =>
        q.gt(q.field("_id"), args.cursor)
      );
    }

    let tasks = await query.take(limit + 1); // +1 to check if more exist

    // Filter to main tasks only
    tasks = tasks.filter((task) => task.parentTaskId === undefined);

    // Apply filters
    if (args.status && args.status.length > 0) {
      tasks = tasks.filter((task) => args.status!.includes(task.status));
    }
    if (args.clientId) {
      tasks = tasks.filter((task) => task.clientId === args.clientId);
    }
    if (args.assigneeId) {
      tasks = tasks.filter((task) =>
        task.assigneeIds.includes(args.assigneeId!)
      );
    }

    // Check if more results exist
    const hasMore = tasks.length > limit;
    if (hasMore) {
      tasks = tasks.slice(0, limit);
    }

    return {
      tasks: tasks.sort((a, b) => a.sortOrder - b.sortOrder),
      nextCursor: hasMore ? tasks[tasks.length - 1]._id : null,
    };
  },
});
```

**Acceptance Criteria**:
- [ ] Returns paginated results with cursor
- [ ] Default limit is 50, max is 100
- [ ] Filters still work with pagination
- [ ] `hasMore` indicates if more results exist

**Tests**:
```typescript
// convex/tasks.test.ts
describe("F2.1: Task pagination", () => {
  beforeEach(async () => {
    // Create 150 tasks
  });

  it("should return default 50 tasks", async () => {
    const result = await ctx.query(api.tasks.list, {});
    expect(result.tasks).toHaveLength(50);
    expect(result.nextCursor).toBeDefined();
  });

  it("should respect limit parameter", async () => {
    const result = await ctx.query(api.tasks.list, { limit: 20 });
    expect(result.tasks).toHaveLength(20);
  });

  it("should cap limit at 100", async () => {
    const result = await ctx.query(api.tasks.list, { limit: 500 });
    expect(result.tasks).toHaveLength(100);
  });

  it("should paginate with cursor", async () => {
    const page1 = await ctx.query(api.tasks.list, { limit: 50 });
    const page2 = await ctx.query(api.tasks.list, {
      limit: 50,
      cursor: page1.nextCursor
    });

    // No overlap
    const page1Ids = new Set(page1.tasks.map(t => t._id));
    const overlap = page2.tasks.filter(t => page1Ids.has(t._id));
    expect(overlap).toHaveLength(0);
  });
});
```

---

### F2.2: Add Pagination to Clients List

**Problem**: `clients.list()` returns all clients.

**Files to modify**:
- `convex/clients.ts`

**Changes**:
```typescript
// convex/clients.ts
export const list = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const limit = Math.min(args.limit || 50, 100);

    let query = ctx.db
      .query("clients")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId));

    if (!args.includeArchived) {
      query = query.filter((q) => q.eq(q.field("isArchived"), false));
    }

    let clients = await query.collect();

    // Sort alphabetically
    clients.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    // Apply cursor-based pagination on sorted results
    const startIndex = args.cursor
      ? clients.findIndex((c) => c._id === args.cursor) + 1
      : 0;

    const paginatedClients = clients.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedClients.length > limit;

    return {
      clients: paginatedClients.slice(0, limit),
      nextCursor: hasMore ? paginatedClients[limit - 1]._id : null,
    };
  },
});

// Also add a simple list for dropdowns (limited)
export const listForSelect = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getUserOrgId(ctx);

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .take(500); // Hard limit for selects

    return clients.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  },
});
```

**Acceptance Criteria**:
- [ ] Main list is paginated
- [ ] `listForSelect` exists for dropdowns (limited to 500)
- [ ] Optional `includeArchived` flag

**Tests**:
```typescript
// convex/clients.test.ts
describe("F2.2: Client pagination", () => {
  it("should paginate client list", async () => {
    // Create 100 clients
    // Verify pagination works
  });

  it("should have listForSelect with hard limit", async () => {
    // Create 600 clients
    const result = await ctx.query(api.clients.listForSelect);
    expect(result.length).toBeLessThanOrEqual(500);
  });
});
```

---

### F2.3: Fix N+1 Query in getSubtaskCounts

**Problem**: Separate query for each task ID.

**Files to modify**:
- `convex/tasks.ts`

**Changes**:
```typescript
// convex/tasks.ts
export const getSubtaskCounts = query({
  args: { taskIds: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    // Validate all taskIds belong to org in one query
    const tasks = await Promise.all(
      args.taskIds.map((id) => ctx.db.get(id))
    );

    const validTaskIds = tasks
      .filter((t) => t && t.orgId === orgId && !t.isDeleted)
      .map((t) => t!._id);

    if (validTaskIds.length === 0) {
      return Object.fromEntries(args.taskIds.map((id) => [id, 0]));
    }

    // Get ALL subtasks for the org in ONE query, then count in memory
    const allSubtasks = await ctx.db
      .query("tasks")
      .withIndex("by_orgId_and_isDeleted", (q) =>
        q.eq("orgId", orgId).eq("isDeleted", false)
      )
      .filter((q) => q.neq(q.field("parentTaskId"), undefined))
      .collect();

    // Count subtasks per parent
    const counts: Record<string, number> = {};
    for (const taskId of args.taskIds) {
      counts[taskId] = 0;
    }

    for (const subtask of allSubtasks) {
      if (subtask.parentTaskId && counts[subtask.parentTaskId] !== undefined) {
        counts[subtask.parentTaskId]++;
      }
    }

    return counts;
  },
});
```

**Acceptance Criteria**:
- [ ] Single query for all subtasks
- [ ] O(1) lookup per taskId after initial query
- [ ] Returns 0 for invalid/deleted tasks

**Tests**:
```typescript
// convex/tasks.test.ts
describe("F2.3: Subtask counts optimization", () => {
  it("should return counts in single query", async () => {
    // Create 10 tasks with varying subtask counts
    // Call getSubtaskCounts with all 10 IDs
    // Verify counts are correct
    // Verify only 1-2 DB queries made (check Convex logs)
  });
});
```

---

### F2.4: Fix Timezone Calculation Performance

**Problem**: `getStartOfDayTimestamp` uses while loops with ms precision.

**Files to modify**:
- `convex/lib/timezone.ts`

**Changes**:
```typescript
// convex/lib/timezone.ts

/**
 * Get the start of day (midnight) timestamp for a given date in a timezone.
 * Uses binary search instead of linear iteration.
 */
export function getStartOfDayTimestamp(
  dateString: string,
  timezone: string
): number {
  const [year, month, day] = dateString.split("-").map(Number);

  // Start with UTC midnight as initial guess
  let low = Date.UTC(year, month - 1, day, 0, 0, 0) - 14 * 60 * 60 * 1000; // -14h for safety
  let high = Date.UTC(year, month - 1, day, 0, 0, 0) + 14 * 60 * 60 * 1000; // +14h for safety

  // Binary search to find the exact millisecond where the date changes
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    const midDate = getDateInTimezone(mid, timezone);

    if (midDate < dateString) {
      low = mid;
    } else {
      high = mid;
    }
  }

  // high is now the first millisecond of the target date
  // Verify and adjust if needed
  if (getDateInTimezone(high, timezone) !== dateString) {
    high++;
  }

  return high;
}

/**
 * Get the end of day timestamp (last millisecond of the day).
 */
export function getEndOfDayTimestamp(
  dateString: string,
  timezone: string
): number {
  const nextDay = getNextDay(dateString);
  return getStartOfDayTimestamp(nextDay, timezone) - 1;
}
```

**Acceptance Criteria**:
- [ ] O(log n) instead of O(n) iterations
- [ ] Handles all timezone offsets (-12 to +14)
- [ ] Results match previous implementation

**Tests**:
```typescript
// convex/lib/timezone.test.ts
describe("F2.4: Timezone performance", () => {
  const testCases = [
    { tz: "UTC", date: "2024-01-15" },
    { tz: "America/New_York", date: "2024-01-15" },
    { tz: "Asia/Tokyo", date: "2024-01-15" },
    { tz: "Pacific/Auckland", date: "2024-01-15" }, // +13
    { tz: "Pacific/Honolulu", date: "2024-01-15" }, // -10
  ];

  testCases.forEach(({ tz, date }) => {
    it(`should find midnight for ${tz} efficiently`, () => {
      const start = performance.now();
      const result = getStartOfDayTimestamp(date, tz);
      const elapsed = performance.now() - start;

      // Should complete in under 1ms (was taking 100ms+ before)
      expect(elapsed).toBeLessThan(1);

      // Verify correctness
      expect(getDateInTimezone(result, tz)).toBe(date);
      expect(getDateInTimezone(result - 1, tz)).not.toBe(date);
    });
  });

  it("should handle DST transitions", () => {
    // Test dates around DST changes
    const dstDate = "2024-03-10"; // US DST starts
    const result = getStartOfDayTimestamp(dstDate, "America/New_York");
    expect(getDateInTimezone(result, "America/New_York")).toBe(dstDate);
  });
});
```

---

### F2.5: Optimize reorderToday to Minimal Updates

**Problem**: Updates ALL tasks even when moving one position.

**Files to modify**:
- `convex/tasks.ts`

**Changes**:
```typescript
// convex/tasks.ts
export const reorderToday = mutation({
  args: {
    taskId: v.id("tasks"),
    newIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const now = Date.now();

    // Get the task being moved
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== orgId || task.isDeleted) {
      throw new ConvexError("Task not found");
    }

    // Get all today tasks sorted
    const todayTasks = await ctx.db
      .query("tasks")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", orgId).eq("status", "today")
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    todayTasks.sort((a, b) =>
      (a.todaySortOrder ?? 0) - (b.todaySortOrder ?? 0)
    );

    const currentIndex = todayTasks.findIndex((t) => t._id === args.taskId);
    if (currentIndex === -1 || currentIndex === args.newIndex) {
      return; // No change needed
    }

    // Only update tasks between old and new position
    const minIndex = Math.min(currentIndex, args.newIndex);
    const maxIndex = Math.max(currentIndex, args.newIndex);

    for (let i = minIndex; i <= maxIndex; i++) {
      const targetTask = todayTasks[i];
      let newOrder: number;

      if (targetTask._id === args.taskId) {
        newOrder = args.newIndex + 1;
      } else if (currentIndex < args.newIndex) {
        // Moving down: shift items up
        newOrder = i;
      } else {
        // Moving up: shift items down
        newOrder = i + 2;
      }

      if (targetTask.todaySortOrder !== newOrder) {
        await ctx.db.patch(targetTask._id, {
          todaySortOrder: newOrder,
          updatedAt: now,
        });
      }
    }
  },
});
```

**Acceptance Criteria**:
- [ ] Moving one position only updates affected tasks
- [ ] Moving from position 1 to 2 updates ~2 tasks, not all
- [ ] Maintains correct ordering

**Tests**:
```typescript
// convex/tasks.test.ts
describe("F2.5: Optimized reorder", () => {
  it("should only update affected tasks", async () => {
    // Create 10 today tasks
    // Move task from position 2 to position 4
    // Verify only tasks 2-4 were updated (check updatedAt)
  });

  it("should maintain correct order after move", async () => {
    // Create tasks A, B, C, D, E
    // Move C to position 1
    // Verify order is C, A, B, D, E
  });
});
```

---

## F3: Correctness Fixes

### F3.1: Fix Manual Time Entry Timezone

**Problem**: Uses UTC instead of org timezone.

**Files to modify**:
- `components/time/time-pill.tsx`
- `components/time/time-popover.tsx`

**Changes**:
```typescript
// components/time/time-pill.tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function TimePill({ taskId, totalTimeSeconds, className }: TimePillProps) {
  // ... existing code ...

  // Get org timezone
  const currentUser = useQuery(api.users.getCurrentUser);
  const org = useQuery(
    api.organizations.getById,
    currentUser?.orgId ? { id: currentUser.orgId } : "skip"
  );

  const handleAddTime = async (seconds: number) => {
    try {
      // Get today's date in ORG timezone, not local
      const timezone = org?.timezone || "UTC";
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      await createManualEntry({
        taskId,
        date: today,
        durationSeconds: seconds,
      });
      toast.success(`Added ${formatDuration(seconds)}`);
    } catch {
      toast.error("Failed to add time");
    }
  };

  // ... rest of component
}
```

Also need to create the organizations query:
```typescript
// convex/organizations.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./lib/auth";

export const getById = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user || user.orgId !== args.id) {
      return null;
    }
    return await ctx.db.get(args.id);
  },
});

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return null;
    return await ctx.db.get(user.orgId);
  },
});
```

**Acceptance Criteria**:
- [ ] Manual time entries use org timezone
- [ ] User in Tokyo adding time at 2am Jan 26 records Jan 26 (not Jan 25 UTC)
- [ ] organizations.getCurrent query exists

**Tests**:
```typescript
// Manual test case
describe("F3.1: Timezone for manual entries", () => {
  it("should use org timezone for date calculation", () => {
    // Mock org timezone to "Asia/Tokyo"
    // Current UTC time: Jan 25 17:00 (which is Jan 26 02:00 in Tokyo)
    // Add manual time
    // Verify entry date is "2024-01-26", not "2024-01-25"
  });
});
```

---

### F3.2: Fix Race Condition in startTimer

**Problem**: Two concurrent starts can create two running timers.

**Files to modify**:
- `convex/timeEntries.ts`

**Changes**:
```typescript
// convex/timeEntries.ts
export const startTimer = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    // Use a transaction-safe approach: check, stop, create atomically
    // Convex mutations are already atomic, but we need to double-check

    // CRITICAL: Use index query and verify no running timer exists after stop
    let runningEntry = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId_and_isRunning", (q) =>
        q.eq("userId", user._id).eq("isRunning", true)
      )
      .first();

    if (runningEntry) {
      await stopTimerInternal(ctx, user._id, orgId, Date.now(), org.timezone);
    }

    // Double-check no running timer (handles race condition)
    runningEntry = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId_and_isRunning", (q) =>
        q.eq("userId", user._id).eq("isRunning", true)
      )
      .first();

    if (runningEntry) {
      throw new ConvexError("Timer already running. Please try again.");
    }

    // ... rest of creation logic
  },
});
```

**Acceptance Criteria**:
- [ ] Double-check after stop prevents race
- [ ] Concurrent starts result in error for second request
- [ ] Only one running timer per user guaranteed

**Tests**:
```typescript
// convex/timeEntries.test.ts
describe("F3.2: Timer race condition", () => {
  it("should prevent concurrent timer starts", async () => {
    // Simulate two concurrent startTimer calls
    const results = await Promise.allSettled([
      ctx.mutation(api.timeEntries.startTimer, { taskId: task1Id }),
      ctx.mutation(api.timeEntries.startTimer, { taskId: task2Id }),
    ]);

    // One should succeed, one should fail or both succeed but only one timer running
    const runningEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId_and_isRunning", q =>
        q.eq("userId", userId).eq("isRunning", true)
      )
      .collect();

    expect(runningEntries).toHaveLength(1);
  });
});
```

---

### F3.3: Add batchUpdate Validation

**Problem**: batchUpdate skips clientId and assigneeIds validation.

**Files to modify**:
- `convex/tasks.ts`

**Changes**:
```typescript
// convex/tasks.ts
export const batchUpdate = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    updates: v.object({
      status: v.optional(statusValidator),
      priority: v.optional(priorityValidator),
      clientId: v.optional(v.id("clients")),
      assigneeIds: v.optional(v.array(v.id("users"))),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;
    const now = Date.now();

    // Validate clientId if provided
    if (args.updates.clientId) {
      const client = await ctx.db.get(args.updates.clientId);
      if (!client || client.orgId !== orgId) {
        throw new ConvexError("Client not found");
      }
      if (client.isArchived) {
        throw new ConvexError("Cannot assign archived client");
      }
    }

    // Validate assigneeIds if provided
    if (args.updates.assigneeIds) {
      for (const assigneeId of args.updates.assigneeIds) {
        const assignee = await ctx.db.get(assigneeId);
        if (!assignee || assignee.orgId !== orgId) {
          throw new ConvexError("Assignee not found");
        }
      }
    }

    // Now update tasks
    for (const taskId of args.taskIds) {
      const task = await ctx.db.get(taskId);
      if (!task || task.isDeleted || task.orgId !== orgId) continue;

      const updates: Partial<Doc<"tasks">> = { updatedAt: now };

      if (args.updates.status !== undefined) {
        updates.status = args.updates.status;
      }
      if (args.updates.priority !== undefined) {
        updates.priority = args.updates.priority;
      }
      if (args.updates.clientId !== undefined) {
        // Don't update subtask client
        if (!task.parentTaskId) {
          updates.clientId = args.updates.clientId;
        }
      }
      if (args.updates.assigneeIds !== undefined) {
        updates.assigneeIds = args.updates.assigneeIds;
      }

      await ctx.db.patch(taskId, updates);
    }
  },
});
```

**Acceptance Criteria**:
- [ ] Invalid clientId throws error
- [ ] Archived client throws error
- [ ] Invalid assigneeId throws error
- [ ] Subtask client not updated (inherits from parent)

**Tests**:
```typescript
// convex/tasks.test.ts
describe("F3.3: batchUpdate validation", () => {
  it("should reject invalid clientId", async () => {
    await expect(
      ctx.mutation(api.tasks.batchUpdate, {
        taskIds: [taskId],
        updates: { clientId: "invalid_id" as any },
      })
    ).rejects.toThrow("Client not found");
  });

  it("should reject archived client", async () => {
    // Archive client, then try to batch update
  });

  it("should reject cross-org clientId", async () => {
    // Use clientId from different org
  });
});
```

---

### F3.4: Fix batchDelete to Cascade Subtasks

**Problem**: batchDelete doesn't delete subtasks like softDelete does.

**Files to modify**:
- `convex/tasks.ts`

**Changes**:
```typescript
// convex/tasks.ts
export const batchDelete = mutation({
  args: { taskIds: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;
    const now = Date.now();

    for (const taskId of args.taskIds) {
      const task = await ctx.db.get(taskId);
      if (!task || task.orgId !== orgId) continue;
      if (task.isDeleted) continue;

      // Cascade delete to subtasks (same as softDelete)
      const subtasks = await ctx.db
        .query("tasks")
        .withIndex("by_parentTaskId", (q) => q.eq("parentTaskId", taskId))
        .collect();

      for (const subtask of subtasks) {
        if (!subtask.isDeleted) {
          await ctx.db.patch(subtask._id, { isDeleted: true, updatedAt: now });
        }
      }

      // Delete the task
      await ctx.db.patch(taskId, {
        isDeleted: true,
        updatedAt: now,
      });
    }
  },
});
```

**Acceptance Criteria**:
- [ ] Batch delete cascades to subtasks
- [ ] Same behavior as softDelete

**Tests**:
```typescript
// convex/tasks.test.ts
describe("F3.4: batchDelete cascade", () => {
  it("should delete subtasks when parent batch deleted", async () => {
    // Create parent with 3 subtasks
    // Batch delete parent
    // Verify all 4 tasks have isDeleted: true
  });
});
```

---

### F3.5: Add Max Duration Validation

**Problem**: No upper limit on time entry duration.

**Files to modify**:
- `convex/timeEntries.ts`

**Changes**:
```typescript
// convex/timeEntries.ts
const MAX_DURATION_SECONDS = 24 * 60 * 60; // 24 hours max per entry

export const createManual = mutation({
  args: {
    taskId: v.id("tasks"),
    date: v.string(),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    // ... existing validation ...

    // Validate duration
    if (args.durationSeconds <= 0) {
      throw new ConvexError("Duration must be positive");
    }
    if (args.durationSeconds > MAX_DURATION_SECONDS) {
      throw new ConvexError("Duration cannot exceed 24 hours per entry");
    }

    // ... rest of handler
  },
});

export const update = mutation({
  args: {
    id: v.id("timeEntries"),
    durationSeconds: v.optional(v.number()),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ... existing validation ...

    if (args.durationSeconds !== undefined) {
      if (args.durationSeconds <= 0) {
        throw new ConvexError("Duration must be positive");
      }
      if (args.durationSeconds > MAX_DURATION_SECONDS) {
        throw new ConvexError("Duration cannot exceed 24 hours per entry");
      }
      // ... rest of duration handling
    }

    // ... rest of handler
  },
});
```

**Acceptance Criteria**:
- [ ] Cannot create entry > 24 hours
- [ ] Cannot update entry to > 24 hours
- [ ] Clear error message

**Tests**:
```typescript
// convex/timeEntries.test.ts
describe("F3.5: Max duration validation", () => {
  it("should reject duration over 24 hours", async () => {
    await expect(
      ctx.mutation(api.timeEntries.createManual, {
        taskId,
        date: "2024-01-15",
        durationSeconds: 25 * 60 * 60, // 25 hours
      })
    ).rejects.toThrow("Duration cannot exceed 24 hours");
  });

  it("should allow exactly 24 hours", async () => {
    await expect(
      ctx.mutation(api.timeEntries.createManual, {
        taskId,
        date: "2024-01-15",
        durationSeconds: 24 * 60 * 60,
      })
    ).resolves.toBeDefined();
  });
});
```

---

### F3.6: Validate Date Format Properly

**Problem**: Date regex allows invalid dates like 2024-13-45.

**Files to modify**:
- `convex/timeEntries.ts`
- `convex/lib/validation.ts` (new file)

**Changes**:
```typescript
// convex/lib/validation.ts
export function isValidDate(dateString: string): boolean {
  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  // Parse and validate
  const [year, month, day] = dateString.split("-").map(Number);

  // Month must be 1-12
  if (month < 1 || month > 12) {
    return false;
  }

  // Day must be valid for the month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return false;
  }

  // Verify the date parses correctly
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

// convex/timeEntries.ts
import { isValidDate } from "./lib/validation";

// In createManual and update handlers:
if (!isValidDate(args.date)) {
  throw new ConvexError("Invalid date. Use YYYY-MM-DD format with valid date.");
}
```

**Acceptance Criteria**:
- [ ] Rejects 2024-13-01 (invalid month)
- [ ] Rejects 2024-02-30 (invalid day)
- [ ] Accepts 2024-02-29 (leap year)
- [ ] Rejects 2023-02-29 (not leap year)

**Tests**:
```typescript
// convex/lib/validation.test.ts
describe("F3.6: Date validation", () => {
  const validDates = [
    "2024-01-15",
    "2024-02-29", // leap year
    "2024-12-31",
    "2000-02-29", // leap year
  ];

  const invalidDates = [
    "2024-13-01", // invalid month
    "2024-02-30", // invalid day
    "2023-02-29", // not leap year
    "2024-00-15", // zero month
    "2024-01-00", // zero day
    "2024-01-32", // day too high
    "24-01-15",   // wrong format
    "2024/01/15", // wrong separator
  ];

  validDates.forEach((date) => {
    it(`should accept ${date}`, () => {
      expect(isValidDate(date)).toBe(true);
    });
  });

  invalidDates.forEach((date) => {
    it(`should reject ${date}`, () => {
      expect(isValidDate(date)).toBe(false);
    });
  });
});
```

---

### F3.7: Handle Running Timer on Deleted Task

**Problem**: Timer continues running on deleted task.

**Files to modify**:
- `convex/tasks.ts`

**Changes**:
```typescript
// convex/tasks.ts
export const softDelete = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    const task = await ctx.db.get(args.id);
    if (!task || task.orgId !== orgId) {
      throw new ConvexError("Task not found");
    }

    if (task.isDeleted) {
      throw new ConvexError("Task is already deleted");
    }

    const now = Date.now();

    // Stop any running timers on this task or its subtasks
    const taskIds = [args.id];

    // Get subtask IDs
    const subtasks = await ctx.db
      .query("tasks")
      .withIndex("by_parentTaskId", (q) => q.eq("parentTaskId", args.id))
      .collect();

    taskIds.push(...subtasks.map((s) => s._id));

    // Find and stop running timers
    for (const taskId of taskIds) {
      const runningEntries = await ctx.db
        .query("timeEntries")
        .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
        .filter((q) => q.eq(q.field("isRunning"), true))
        .collect();

      for (const entry of runningEntries) {
        const duration = Math.floor((now - (entry.startTime || now)) / 1000);
        await ctx.db.patch(entry._id, {
          isRunning: false,
          durationSeconds: duration,
        });

        // Update user's activeTimeEntryId
        const entryUser = await ctx.db.get(entry.userId);
        if (entryUser?.activeTimeEntryId === entry._id) {
          await ctx.db.patch(entry.userId, { activeTimeEntryId: undefined });
        }

        // Update task total time
        const entryTask = await ctx.db.get(entry.taskId);
        if (entryTask) {
          await ctx.db.patch(entry.taskId, {
            totalTimeSeconds: entryTask.totalTimeSeconds + duration,
          });
        }
      }
    }

    // Cascade delete subtasks
    for (const subtask of subtasks) {
      if (!subtask.isDeleted) {
        await ctx.db.patch(subtask._id, { isDeleted: true, updatedAt: now });
      }
    }

    // Delete the task
    await ctx.db.patch(args.id, { isDeleted: true, updatedAt: now });
  },
});
```

**Acceptance Criteria**:
- [ ] Deleting task stops running timers
- [ ] Time is saved before stopping
- [ ] User's activeTimeEntryId is cleared
- [ ] Works for subtasks too

**Tests**:
```typescript
// convex/tasks.test.ts
describe("F3.7: Running timer on delete", () => {
  it("should stop timer when task deleted", async () => {
    // Start timer on task
    await ctx.mutation(api.timeEntries.startTimer, { taskId });

    // Delete task
    await ctx.mutation(api.tasks.softDelete, { id: taskId });

    // Verify timer stopped
    const running = await ctx.query(api.timeEntries.getRunning);
    expect(running).toBeNull();

    // Verify time was saved
    const entries = await ctx.query(api.timeEntries.getByTask, { taskId });
    expect(entries[0].isRunning).toBe(false);
    expect(entries[0].durationSeconds).toBeGreaterThan(0);
  });
});
```

---

### F3.8: Fix Today List Race Condition

**Problem**: Server update during drag resets local state.

**Files to modify**:
- `components/today/today-list.tsx`

**Changes**:
```typescript
// components/today/today-list.tsx
"use client";

import { useState, useEffect, useRef } from "react";
// ... other imports

export function TodayList({ assigneeId }: TodayListProps) {
  // ... existing code ...

  // Track if we're currently dragging
  const isDraggingRef = useRef(false);
  const pendingServerUpdateRef = useRef<TodayTask[] | null>(null);

  // Sync local state with server state (but not during drag)
  useEffect(() => {
    if (todayItems) {
      if (isDraggingRef.current) {
        // Store for later
        pendingServerUpdateRef.current = todayItems;
      } else {
        setLocalItems(todayItems);
      }
    }
  }, [todayItems]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    isDraggingRef.current = false;
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localItems.findIndex((item) => item._id === active.id);
      const newIndex = localItems.findIndex((item) => item._id === over.id);

      // Optimistic update
      const newItems = arrayMove(localItems, oldIndex, newIndex);
      setLocalItems(newItems);

      // Persist to server
      try {
        await reorderToday({
          taskId: active.id as Id<"tasks">,
          newIndex,
        });
      } catch {
        // Revert on error
        setLocalItems(todayItems || []);
        toast.error("Failed to reorder tasks");
      }
    }

    // Apply any pending server updates
    if (pendingServerUpdateRef.current) {
      // Merge: keep our order but update task data
      const serverData = new Map(
        pendingServerUpdateRef.current.map((t) => [t._id, t])
      );
      setLocalItems((current) =>
        current.map((item) => serverData.get(item._id) || item)
      );
      pendingServerUpdateRef.current = null;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* ... rest of JSX */}
    </DndContext>
  );
}
```

**Acceptance Criteria**:
- [ ] Drag not interrupted by server updates
- [ ] Pending updates applied after drag ends
- [ ] Task data stays fresh (title, time, etc. update)

**Tests**:
```typescript
// Manual test
describe("F3.8: Drag race condition", () => {
  it("should not reset during drag", () => {
    // 1. Start dragging item
    // 2. While dragging, another user adds a task (triggers server update)
    // 3. Verify drag continues uninterrupted
    // 4. Drop item
    // 5. Verify new task appears in list
  });
});
```

---

## F4: Missing Features

### F4.1: Add Client Unarchive

**Problem**: No way to restore archived clients.

**Files to modify**:
- `convex/clients.ts`
- `components/clients/client-list.tsx`

**Changes**:
```typescript
// convex/clients.ts
export const unarchive = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const client = await ctx.db.get(args.id);

    if (!client || client.orgId !== orgId) {
      throw new ConvexError("Client not found");
    }

    if (!client.isArchived) {
      throw new ConvexError("Client is not archived");
    }

    await ctx.db.patch(args.id, { isArchived: false });
  },
});

export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getUserOrgId(ctx);

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .collect();

    return clients.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  },
});
```

**Acceptance Criteria**:
- [ ] Can list archived clients
- [ ] Can unarchive a client
- [ ] Unarchived client appears in main list

**Tests**:
```typescript
// convex/clients.test.ts
describe("F4.1: Client unarchive", () => {
  it("should unarchive client", async () => {
    // Create and archive client
    const clientId = await ctx.mutation(api.clients.create, { name: "Test" });
    await ctx.mutation(api.clients.archive, { id: clientId });

    // Unarchive
    await ctx.mutation(api.clients.unarchive, { id: clientId });

    // Verify in main list
    const clients = await ctx.query(api.clients.list);
    expect(clients.some(c => c._id === clientId)).toBe(true);
  });
});
```

---

### F4.2: Fix duplicate() to Include Subtasks

**Problem**: Duplicating parent doesn't duplicate subtasks.

**Files to modify**:
- `convex/tasks.ts`

**Changes**:
```typescript
// convex/tasks.ts
export const duplicate = mutation({
  args: {
    id: v.id("tasks"),
    includeSubtasks: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);

    if (!task || task.orgId !== user.orgId) {
      throw new ConvexError("Task not found");
    }

    // Get max sortOrder
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_orgId", (q) => q.eq("orgId", task.orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();
    const maxOrder = Math.max(...tasks.map((t) => t.sortOrder), 0);

    const now = Date.now();

    // Duplicate the main task
    const newTaskId = await ctx.db.insert("tasks", {
      orgId: task.orgId,
      title: `${task.title} (copy)`,
      description: task.description,
      status: task.status,
      priority: task.priority,
      clientId: task.clientId,
      assigneeIds: task.assigneeIds,
      createdById: user._id,
      parentTaskId: task.parentTaskId,
      sortOrder: maxOrder + 1,
      todaySortOrder: undefined,
      totalTimeSeconds: 0, // Don't copy time
      imageStorageId: undefined, // Don't copy image
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Duplicate subtasks if requested
    if (args.includeSubtasks !== false) { // Default to true
      const subtasks = await ctx.db
        .query("tasks")
        .withIndex("by_parentTaskId", (q) => q.eq("parentTaskId", args.id))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();

      for (const subtask of subtasks) {
        await ctx.db.insert("tasks", {
          orgId: subtask.orgId,
          title: subtask.title,
          description: subtask.description,
          status: subtask.status,
          priority: subtask.priority,
          clientId: subtask.clientId, // Inherited from parent
          assigneeIds: subtask.assigneeIds,
          createdById: user._id,
          parentTaskId: newTaskId, // Point to NEW parent
          sortOrder: subtask.sortOrder,
          todaySortOrder: undefined,
          totalTimeSeconds: 0,
          imageStorageId: undefined,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return newTaskId;
  },
});
```

**Acceptance Criteria**:
- [ ] Subtasks duplicated by default
- [ ] Subtasks point to new parent
- [ ] Can opt out with `includeSubtasks: false`
- [ ] Time and images not copied

**Tests**:
```typescript
// convex/tasks.test.ts
describe("F4.2: Duplicate with subtasks", () => {
  it("should duplicate subtasks by default", async () => {
    // Create parent with 3 subtasks
    const parentId = await ctx.mutation(api.tasks.create, { title: "Parent" });
    await ctx.mutation(api.tasks.create, { title: "Sub1", parentTaskId: parentId });
    await ctx.mutation(api.tasks.create, { title: "Sub2", parentTaskId: parentId });
    await ctx.mutation(api.tasks.create, { title: "Sub3", parentTaskId: parentId });

    // Duplicate
    const newParentId = await ctx.mutation(api.tasks.duplicate, { id: parentId });

    // Verify subtasks duplicated
    const newSubtasks = await ctx.query(api.tasks.getSubtasks, { parentTaskId: newParentId });
    expect(newSubtasks).toHaveLength(3);
  });

  it("should skip subtasks when includeSubtasks=false", async () => {
    // Same setup
    const newParentId = await ctx.mutation(api.tasks.duplicate, {
      id: parentId,
      includeSubtasks: false,
    });

    const newSubtasks = await ctx.query(api.tasks.getSubtasks, { parentTaskId: newParentId });
    expect(newSubtasks).toHaveLength(0);
  });
});
```

---

## Running the Fixes

### Order of Implementation

1. **F1.1-F1.5**: Security fixes (CRITICAL - do first)
2. **F3.1-F3.8**: Correctness fixes
3. **F2.1-F2.5**: Performance fixes
4. **F4.1-F4.2**: Missing features

### Test Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- convex/users.test.ts

# Run tests matching pattern
npm run test -- -t "F1.1"

# Run with coverage
npm run test -- --coverage
```

### Deployment Checklist

- [ ] All tests pass locally
- [ ] Run `npx convex dev --once` to deploy schema changes
- [ ] Test in development environment
- [ ] Deploy to production
- [ ] Monitor for errors

---

## Schema Migration Notes

### F1.3 requires schema change:

```typescript
// Add to users table
isDeleted: v.optional(v.boolean()),
```

This is a non-breaking change (optional field). Run `npx convex dev` to deploy.

---

## Completion Tracking

| Fix | Status | Tested | Deployed |
|-----|--------|--------|----------|
| F1.1 Internal mutations | [ ] | [ ] | [ ] |
| F1.2 Admin race condition | [ ] | [ ] | [ ] |
| F1.3 Proper soft delete | [ ] | [ ] | [ ] |
| F1.4 Rate limiting | [ ] | [ ] | [ ] |
| F1.5 File validation | [ ] | [ ] | [ ] |
| F2.1 Task pagination | [ ] | [ ] | [ ] |
| F2.2 Client pagination | [ ] | [ ] | [ ] |
| F2.3 Subtask counts N+1 | [ ] | [ ] | [ ] |
| F2.4 Timezone performance | [ ] | [ ] | [ ] |
| F2.5 Reorder optimization | [ ] | [ ] | [ ] |
| F3.1 Manual time timezone | [ ] | [ ] | [ ] |
| F3.2 Timer race condition | [ ] | [ ] | [ ] |
| F3.3 batchUpdate validation | [ ] | [ ] | [ ] |
| F3.4 batchDelete cascade | [ ] | [ ] | [ ] |
| F3.5 Max duration | [ ] | [ ] | [ ] |
| F3.6 Date validation | [ ] | [ ] | [ ] |
| F3.7 Timer on delete | [ ] | [ ] | [ ] |
| F3.8 Drag race condition | [ ] | [ ] | [ ] |
| F4.1 Client unarchive | [ ] | [ ] | [ ] |
| F4.2 Duplicate subtasks | [ ] | [ ] | [ ] |
