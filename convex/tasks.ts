import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserOrgId, requireAuth } from "./lib/auth";
import { ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { getDateInTimezone } from "./lib/timezone";
import {
  TaskStatus,
  TaskPriority,
  TaskCategory,
  statusValidator,
  priorityValidator,
  optionalCategoryValidator,
} from "./types";

// Re-export types for backward compatibility
export type { TaskStatus, TaskPriority, TaskCategory };

const categoryValidator = optionalCategoryValidator;

/**
 * List main tasks (no parent) for the current organization.
 * Supports filtering by status (array), clientId, and assigneeId.
 * Returns tasks sorted by sortOrder ascending.
 */
export const list = query({
  args: {
    status: v.optional(v.array(statusValidator)),
    clientId: v.optional(v.id("clients")),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    // Start with all non-deleted tasks in the org
    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_orgId_and_isDeleted", (q) =>
        q.eq("orgId", orgId).eq("isDeleted", false)
      )
      .collect();

    // Filter to main tasks only (no parent)
    tasks = tasks.filter((task) => task.parentTaskId === undefined);

    // Apply status filter (array of allowed statuses)
    if (args.status && args.status.length > 0) {
      tasks = tasks.filter((task) => args.status!.includes(task.status));
    }

    // Apply client filter
    if (args.clientId) {
      tasks = tasks.filter((task) => task.clientId === args.clientId);
    }

    // Apply assignee filter
    if (args.assigneeId) {
      tasks = tasks.filter((task) =>
        task.assigneeIds.includes(args.assigneeId!)
      );
    }

    // Sort by sortOrder ascending
    return tasks.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Get a single task by ID.
 * Returns null if not found or not in user's organization.
 */
export const getById = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const task = await ctx.db.get(args.id);

    // Don't reveal if task exists in another org
    if (!task || task.orgId !== orgId) {
      return null;
    }

    return task;
  },
});

/**
 * Get subtasks for a parent task.
 * Returns subtasks sorted by sortOrder ascending, excludes deleted tasks.
 */
export const getSubtasks = query({
  args: { parentTaskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    // Verify parent task exists and belongs to org
    const parentTask = await ctx.db.get(args.parentTaskId);
    if (!parentTask || parentTask.orgId !== orgId) {
      return [];
    }

    const subtasks = await ctx.db
      .query("tasks")
      .withIndex("by_parentTaskId", (q) => q.eq("parentTaskId", args.parentTaskId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Sort by sortOrder ascending
    return subtasks.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Get tasks by status (includes both main tasks and subtasks).
 * Useful for views like "Today" or "Admin Review" that show all items regardless of hierarchy.
 */
export const getByStatus = query({
  args: { status: statusValidator },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", orgId).eq("status", args.status)
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Sort by sortOrder ascending
    return tasks.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Create a new task.
 * If parentTaskId is provided, creates a subtask that inherits clientId from parent.
 * Defaults: status="next_up", priority="medium", sortOrder=max+1, totalTimeSeconds=0
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    assigneeIds: v.optional(v.array(v.id("users"))),
    parentTaskId: v.optional(v.id("tasks")),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    category: categoryValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    // Validate title
    const trimmedTitle = args.title.trim();
    if (trimmedTitle.length === 0) {
      throw new ConvexError("Title is required");
    }
    if (trimmedTitle.length > 500) {
      throw new ConvexError("Title must be 500 characters or less");
    }

    // Validate description if provided
    if (args.description && args.description.length > 10000) {
      throw new ConvexError("Description must be 10,000 characters or less");
    }

    // Determine clientId (inherit from parent if subtask)
    let clientId = args.clientId;
    if (args.parentTaskId) {
      const parentTask = await ctx.db.get(args.parentTaskId);
      if (!parentTask || parentTask.orgId !== orgId) {
        throw new ConvexError("Parent task not found");
      }
      // Subtasks inherit clientId from parent
      clientId = parentTask.clientId;
    }

    // Validate client belongs to org if provided
    if (clientId) {
      const client = await ctx.db.get(clientId);
      if (!client || client.orgId !== orgId) {
        throw new ConvexError("Client not found");
      }
      if (client.isArchived) {
        throw new ConvexError("Cannot assign archived client to task");
      }
    }

    // Validate assignees belong to org if provided
    const assigneeIds = args.assigneeIds || [];
    for (const assigneeId of assigneeIds) {
      const assignee = await ctx.db.get(assigneeId);
      if (!assignee || assignee.orgId !== orgId) {
        throw new ConvexError("Assignee not found");
      }
    }

    // Calculate next sort order
    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();

    // Filter to same level (main tasks or subtasks of same parent)
    const sameLevelTasks = args.parentTaskId
      ? existingTasks.filter((t) => t.parentTaskId === args.parentTaskId)
      : existingTasks.filter((t) => t.parentTaskId === undefined);

    const maxSortOrder = sameLevelTasks.reduce(
      (max, task) => Math.max(max, task.sortOrder),
      0
    );

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      orgId,
      title: trimmedTitle,
      description: args.description?.trim() || undefined,
      status: args.status || "next_up",
      priority: args.priority || "medium",
      category: args.category,
      clientId,
      assigneeIds,
      createdById: user._id,
      parentTaskId: args.parentTaskId,
      sortOrder: maxSortOrder + 1,
      todaySortOrder: undefined,
      totalTimeSeconds: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Log task_created activity event
    await ctx.db.insert("activityEvents", {
      orgId,
      taskId,
      userId: user._id,
      eventType: "task_created",
      data: {},
      isDeleted: false,
      createdAt: now,
    });

    return taskId;
  },
});

/**
 * Update an existing task.
 * Logs activity events for status and assignee changes.
 */
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    category: categoryValidator,
    clientId: v.optional(v.id("clients")),
    assigneeIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    const task = await ctx.db.get(args.id);
    if (!task || task.orgId !== orgId) {
      throw new ConvexError("Task not found");
    }

    if (task.isDeleted) {
      throw new ConvexError("Cannot update deleted task");
    }

    const updates: Partial<Doc<"tasks">> = {};
    const now = Date.now();

    // Validate and set title
    if (args.title !== undefined) {
      const trimmedTitle = args.title.trim();
      if (trimmedTitle.length === 0) {
        throw new ConvexError("Title is required");
      }
      if (trimmedTitle.length > 500) {
        throw new ConvexError("Title must be 500 characters or less");
      }
      updates.title = trimmedTitle;
    }

    // Validate and set description
    if (args.description !== undefined) {
      if (args.description.length > 10000) {
        throw new ConvexError("Description must be 10,000 characters or less");
      }
      updates.description = args.description.trim() || undefined;
    }

    // Handle status change with activity logging
    if (args.status !== undefined && args.status !== task.status) {
      updates.status = args.status;

      // Set todaySortOrder when status becomes "today"
      if (args.status === "today" && task.status !== "today") {
        const todayTasks = await ctx.db
          .query("tasks")
          .withIndex("by_orgId_and_status", (q) =>
            q.eq("orgId", orgId).eq("status", "today")
          )
          .collect();
        const maxTodaySortOrder = todayTasks.reduce(
          (max, t) => Math.max(max, t.todaySortOrder || 0),
          0
        );
        updates.todaySortOrder = maxTodaySortOrder + 1;
      }

      // Clear todaySortOrder when status changes from "today"
      if (task.status === "today" && args.status !== "today") {
        updates.todaySortOrder = undefined;
      }

      // Log status_changed event
      await ctx.db.insert("activityEvents", {
        orgId,
        taskId: args.id,
        userId: user._id,
        eventType: "status_changed",
        data: {
          field: "status",
          fromValue: task.status,
          toValue: args.status,
        },
        isDeleted: false,
        createdAt: now,
      });
    }

    // Set priority
    if (args.priority !== undefined) {
      updates.priority = args.priority;
    }

    // Set category
    if (args.category !== undefined) {
      updates.category = args.category;
    }

    // Validate and set clientId (only for main tasks, not subtasks)
    if (args.clientId !== undefined) {
      if (task.parentTaskId) {
        throw new ConvexError("Cannot change client on subtask");
      }
      if (args.clientId) {
        const client = await ctx.db.get(args.clientId);
        if (!client || client.orgId !== orgId) {
          throw new ConvexError("Client not found");
        }
        if (client.isArchived) {
          throw new ConvexError("Cannot assign archived client to task");
        }
      }
      updates.clientId = args.clientId || undefined;
    }

    // Validate and set assignees with activity logging
    if (args.assigneeIds !== undefined) {
      for (const assigneeId of args.assigneeIds) {
        const assignee = await ctx.db.get(assigneeId);
        if (!assignee || assignee.orgId !== orgId) {
          throw new ConvexError("Assignee not found");
        }
      }

      // Check if assignees actually changed
      const oldAssignees = new Set(task.assigneeIds);
      const newAssignees = new Set(args.assigneeIds);
      const assigneesChanged =
        oldAssignees.size !== newAssignees.size ||
        [...oldAssignees].some((id) => !newAssignees.has(id));

      if (assigneesChanged) {
        updates.assigneeIds = args.assigneeIds;

        // Log assignee_changed event
        await ctx.db.insert("activityEvents", {
          orgId,
          taskId: args.id,
          userId: user._id,
          eventType: "assignee_changed",
          data: {
            field: "assignees",
            fromValue: task.assigneeIds.join(","),
            toValue: args.assigneeIds.join(","),
          },
          isDeleted: false,
          createdAt: now,
        });
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      await ctx.db.patch(args.id, updates);
    }
  },
});

/**
 * Soft delete a task and cascade to all subtasks.
 */
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

    // Cascade delete to all subtasks
    const subtasks = await ctx.db
      .query("tasks")
      .withIndex("by_parentTaskId", (q) => q.eq("parentTaskId", args.id))
      .collect();

    for (const subtask of subtasks) {
      if (!subtask.isDeleted) {
        await ctx.db.patch(subtask._id, { isDeleted: true, updatedAt: now });
      }
    }

    // Delete the parent task
    await ctx.db.patch(args.id, { isDeleted: true, updatedAt: now });
  },
});

/**
 * Reorder a task by setting its new sortOrder.
 * For "today" status tasks, updates todaySortOrder instead.
 */
export const reorder = mutation({
  args: {
    taskId: v.id("tasks"),
    newSortOrder: v.number(),
    isToday: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== orgId) {
      throw new ConvexError("Task not found");
    }

    if (task.isDeleted) {
      throw new ConvexError("Cannot reorder deleted task");
    }

    const updates: Partial<Doc<"tasks">> = {
      updatedAt: Date.now(),
    };

    if (args.isToday) {
      updates.todaySortOrder = args.newSortOrder;
    } else {
      updates.sortOrder = args.newSortOrder;
    }

    await ctx.db.patch(args.taskId, updates);
  },
});

/**
 * Get the count of subtasks for a task.
 * Useful for displaying subtask count in the task table.
 */
export const getSubtaskCount = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== orgId) {
      return 0;
    }

    const subtasks = await ctx.db
      .query("tasks")
      .withIndex("by_parentTaskId", (q) => q.eq("parentTaskId", args.taskId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return subtasks.length;
  },
});

/**
 * Get subtask counts for multiple tasks in one query.
 * More efficient than calling getSubtaskCount for each task.
 */
export const getSubtaskCounts = query({
  args: { taskIds: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    const counts: Record<string, number> = {};

    for (const taskId of args.taskIds) {
      const task = await ctx.db.get(taskId);
      if (!task || task.orgId !== orgId) {
        counts[taskId] = 0;
        continue;
      }

      const subtasks = await ctx.db
        .query("tasks")
        .withIndex("by_parentTaskId", (q) => q.eq("parentTaskId", taskId))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();

      counts[taskId] = subtasks.length;
    }

    return counts;
  },
});

/**
 * Get all tasks with status="today" for the Today view.
 * Returns both main tasks and subtasks.
 * For subtasks, includes parent task info for context display.
 * Sorted by: priority desc (high first), todaySortOrder asc, createdAt asc.
 * Optionally filter by assignee.
 */
export const getTodayItems = query({
  args: {
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    // Get organization for timezone
    const org = await ctx.db.get(orgId);
    if (!org) {
      return [];
    }

    // Get today's date in org timezone
    const todayDate = getDateInTimezone(Date.now(), org.timezone);

    // Get all "today" tasks
    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", orgId).eq("status", "today")
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Filter by assignee if provided
    if (args.assigneeId) {
      tasks = tasks.filter((task) =>
        task.assigneeIds.includes(args.assigneeId!)
      );
    }

    // Fetch today's time entries for all tasks
    const todayTimeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_orgId_and_date", (q) =>
        q.eq("orgId", orgId).eq("date", todayDate)
      )
      .collect();

    // Build a map of taskId -> today's time in seconds
    const todayTimeByTask = new Map<Id<"tasks">, number>();
    for (const entry of todayTimeEntries) {
      const current = todayTimeByTask.get(entry.taskId) || 0;
      todayTimeByTask.set(entry.taskId, current + entry.durationSeconds);
    }

    // Fetch parent task info for subtasks and add today's time
    const tasksWithParentAndTime = await Promise.all(
      tasks.map(async (task) => {
        let parentTask: Doc<"tasks"> | null = null;
        if (task.parentTaskId) {
          parentTask = await ctx.db.get(task.parentTaskId);
        }
        return {
          ...task,
          parentTask: parentTask || undefined,
          todayTimeSeconds: todayTimeByTask.get(task._id) || 0,
        };
      })
    );

    // Sort by: priority desc (high > medium > low), todaySortOrder asc, createdAt asc
    const priorityOrder: Record<TaskPriority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return tasksWithParentAndTime.sort((a, b) => {
      // First sort by priority (high first)
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by todaySortOrder (lower first)
      const aSortOrder = a.todaySortOrder ?? Number.MAX_SAFE_INTEGER;
      const bSortOrder = b.todaySortOrder ?? Number.MAX_SAFE_INTEGER;
      if (aSortOrder !== bSortOrder) return aSortOrder - bSortOrder;

      // Finally by createdAt (older first)
      return a.createdAt - b.createdAt;
    });
  },
});

/**
 * Reorder tasks in Today view by updating todaySortOrder for all affected tasks.
 * Takes the full new order array and updates all tasks accordingly.
 */
export const reorderToday = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const now = Date.now();

    // Update todaySortOrder for each task based on its position in the array
    for (let i = 0; i < args.taskIds.length; i++) {
      const taskId = args.taskIds[i];
      const task = await ctx.db.get(taskId);

      if (!task || task.orgId !== orgId) {
        throw new ConvexError("Task not found");
      }

      if (task.isDeleted) {
        throw new ConvexError("Cannot reorder deleted task");
      }

      await ctx.db.patch(taskId, {
        todaySortOrder: i + 1,
        updatedAt: now,
      });
    }
  },
});

/**
 * Generate upload URL for task image.
 */
export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// F1.5: File upload validation constants
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Update task with image.
 * F1.5: Validates file type and size before accepting.
 * Deletes old image if exists.
 */
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

    // F1.5: Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(args.fileType)) {
      // Delete the uploaded file since it's invalid
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`
      );
    }

    // F1.5: Validate file size
    if (args.fileSize > MAX_IMAGE_SIZE) {
      // Delete the uploaded file since it's too large
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

/**
 * Remove task image.
 */
export const removeTaskImage = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);

    if (!task || task.orgId !== user.orgId) {
      throw new ConvexError("Task not found");
    }

    if (task.imageStorageId) {
      await ctx.storage.delete(task.imageStorageId);
    }

    await ctx.db.patch(args.id, {
      imageStorageId: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get image URL for a task.
 */
export const getTaskImageUrl = query({
  args: { storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, args) => {
    if (!args.storageId) return null;
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Batch update multiple tasks.
 * F3.3: Validates clientId and assigneeIds belong to org.
 */
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
    const now = Date.now();

    // F3.3: Validate clientId if provided
    if (args.updates.clientId !== undefined) {
      const client = await ctx.db.get(args.updates.clientId);
      if (!client || client.orgId !== user.orgId || client.isArchived) {
        throw new ConvexError("Invalid client");
      }
    }

    // F3.3: Validate assigneeIds if provided
    if (args.updates.assigneeIds !== undefined) {
      for (const assigneeId of args.updates.assigneeIds) {
        const assignee = await ctx.db.get(assigneeId);
        if (!assignee || assignee.orgId !== user.orgId || assignee.isDeleted) {
          throw new ConvexError("Invalid assignee");
        }
      }
    }

    for (const taskId of args.taskIds) {
      const task = await ctx.db.get(taskId);
      if (!task || task.isDeleted || task.orgId !== user.orgId) continue;

      const updates: Partial<Doc<"tasks">> = { updatedAt: now };

      if (args.updates.status !== undefined) {
        updates.status = args.updates.status;
      }
      if (args.updates.priority !== undefined) {
        updates.priority = args.updates.priority;
      }
      if (args.updates.clientId !== undefined) {
        updates.clientId = args.updates.clientId;
      }
      if (args.updates.assigneeIds !== undefined) {
        updates.assigneeIds = args.updates.assigneeIds;
      }

      await ctx.db.patch(taskId, updates);
    }
  },
});

/**
 * Batch delete multiple tasks (soft delete).
 * F3.4: Also deletes subtasks and stops running timers.
 */
export const batchDelete = mutation({
  args: { taskIds: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const now = Date.now();

    // Helper to soft-delete a single task with cleanup
    async function deleteTaskWithCleanup(taskId: Id<"tasks">) {
      const task = await ctx.db.get(taskId);
      if (!task || task.orgId !== user.orgId || task.isDeleted) return;

      // F3.7: Stop any running timers on this task
      const runningTimers = await ctx.db
        .query("timeEntries")
        .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
        .filter((q) => q.eq(q.field("isRunning"), true))
        .collect();

      for (const timer of runningTimers) {
        if (timer.startTime) {
          const durationSeconds = Math.floor((now - timer.startTime) / 1000);
          await ctx.db.patch(timer._id, {
            isRunning: false,
            durationSeconds,
          });
          // Clear user's activeTimeEntryId
          await ctx.db.patch(timer.userId, {
            activeTimeEntryId: undefined,
          });
        } else {
          // Timer has no start time, just stop it
          await ctx.db.patch(timer._id, {
            isRunning: false,
          });
          // Also clear user's activeTimeEntryId to prevent orphaned reference
          await ctx.db.patch(timer.userId, {
            activeTimeEntryId: undefined,
          });
        }
      }

      // Soft delete the task
      await ctx.db.patch(taskId, {
        isDeleted: true,
        updatedAt: now,
      });

      // F3.4: Also delete subtasks
      const subtasks = await ctx.db
        .query("tasks")
        .withIndex("by_parentTaskId", (q) => q.eq("parentTaskId", taskId))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();

      for (const subtask of subtasks) {
        await deleteTaskWithCleanup(subtask._id);
      }
    }

    for (const taskId of args.taskIds) {
      await deleteTaskWithCleanup(taskId);
    }
  },
});

/**
 * Duplicate a task.
 * F4.2: Also duplicates subtasks with the new parent task ID.
 */
export const duplicate = mutation({
  args: { id: v.id("tasks") },
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
      totalTimeSeconds: 0,
      imageStorageId: undefined, // Don't copy image
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // F4.2: Duplicate subtasks
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
        clientId: subtask.clientId,
        assigneeIds: subtask.assigneeIds,
        createdById: user._id,
        parentTaskId: newTaskId, // Link to the new parent
        sortOrder: subtask.sortOrder,
        todaySortOrder: undefined,
        totalTimeSeconds: 0,
        imageStorageId: undefined,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return newTaskId;
  },
});
