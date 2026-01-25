import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserOrgId, requireAuth } from "./lib/auth";
import { batchGet } from "./lib/batch";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { reportEntryValidator, TaskCategory } from "./types";

/** Default page size for paginated queries */
const DEFAULT_PAGE_SIZE = 50;

/**
 * List all reports for the current organization.
 * Handles both old (totalHours) and new (totalSeconds) formats.
 * Supports pagination for large datasets.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, 100);

    let reportsQuery = ctx.db
      .query("reports")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .order("desc");

    const reports = await reportsQuery.take(limit + 1);

    // Check if there are more results
    const hasMore = reports.length > limit;
    const items = hasMore ? reports.slice(0, limit) : reports;

    // For old reports without clientName, fetch client data
    const clientIds = [
      ...new Set(items.filter((r) => !r.clientName).map((r) => r.clientId)),
    ];
    const clientsMap =
      clientIds.length > 0 ? await batchGet(ctx, "clients", clientIds) : new Map();

    const results = items.map((report) => {
      // Handle backward compatibility: use totalSeconds or convert from totalHours
      const totalSeconds =
        report.totalSeconds ?? (report.totalHours ? report.totalHours * 3600 : 0);
      // Use stored clientName or fetch from client
      const client = clientsMap.get(report.clientId);
      const clientName = report.clientName ?? client?.name ?? "Unknown Client";
      const clientCurrency = report.clientCurrency ?? client?.currency;

      return {
        _id: report._id,
        name: report.name,
        startDate: report.startDate,
        endDate: report.endDate,
        totalSeconds,
        totalAmount: report.totalAmount,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        clientName,
        clientCurrency,
      };
    });

    return {
      items: results,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]._id : undefined,
    };
  },
});

/**
 * Get a single report by ID.
 * Handles both old and new formats, fetching task data for old entries.
 */
export const getById = query({
  args: { id: v.id("reports") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const report = await ctx.db.get(args.id);

    if (!report || report.orgId !== orgId) {
      return null;
    }

    // Handle backward compatibility
    const totalSeconds =
      report.totalSeconds ?? (report.totalHours ? report.totalHours * 3600 : 0);

    // For old reports, fetch client and task data
    let clientName = report.clientName;
    let clientCurrency = report.clientCurrency;
    let clientHourlyRate = report.clientHourlyRate;

    if (!clientName) {
      const client = await ctx.db.get(report.clientId);
      clientName = client?.name ?? "Unknown Client";
      clientCurrency = clientCurrency ?? client?.currency;
      clientHourlyRate = clientHourlyRate ?? client?.defaultHourlyRate;
    }

    // For old entries without taskTitle, fetch task data
    const entriesNeedingTasks = report.entries.filter((e) => !e.taskTitle);
    const taskIds = entriesNeedingTasks.map((e) => e.taskId);
    // Also fetch parent tasks for entries with parentTaskId but no parentTaskTitle
    const parentTaskIds = report.entries
      .filter((e) => e.parentTaskId && !e.parentTaskTitle)
      .map((e) => e.parentTaskId as Id<"tasks">);
    const allTaskIds = [...new Set([...taskIds, ...parentTaskIds])];
    const tasksMap =
      allTaskIds.length > 0 ? await batchGet(ctx, "tasks", allTaskIds) : new Map();

    // Enrich entries with task data where needed
    const entries = report.entries.map((entry) => {
      if (entry.taskTitle) {
        // Already has snapshot data, just ensure parentTaskTitle if needed
        if (entry.parentTaskId && !entry.parentTaskTitle) {
          const parentTask = tasksMap.get(entry.parentTaskId);
          return {
            ...entry,
            parentTaskTitle: parentTask?.title,
          };
        }
        return entry;
      }
      const task = tasksMap.get(entry.taskId);
      const parentTask = entry.parentTaskId
        ? tasksMap.get(entry.parentTaskId)
        : null;
      return {
        ...entry,
        taskTitle: task?.title ?? "Unknown Task",
        taskDescription: entry.taskDescription ?? task?.description,
        taskCategory: entry.taskCategory ?? (task?.category as TaskCategory | undefined),
        parentTaskTitle: entry.parentTaskTitle ?? parentTask?.title,
      };
    });

    return {
      _id: report._id,
      name: report.name,
      startDate: report.startDate,
      endDate: report.endDate,
      totalSeconds,
      totalAmount: report.totalAmount,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      clientId: report.clientId,
      clientName,
      clientCurrency,
      clientHourlyRate,
      entries,
    };
  },
});

/**
 * Generate preview data for the report wizard.
 * Optimized: batches all time entry queries to avoid N+1.
 */
export const getReportData = query({
  args: {
    clientId: v.id("clients"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    // Validate dates
    if (args.startDate > args.endDate) {
      throw new ConvexError("Start date must be before or equal to end date");
    }

    // Get client
    const client = await ctx.db.get(args.clientId);
    if (!client || client.orgId !== orgId) {
      throw new ConvexError("Client not found");
    }

    // Get all non-deleted tasks for this client using index
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    if (allTasks.length === 0) {
      return {
        client: {
          _id: client._id,
          name: client.name,
          currency: client.currency,
          defaultHourlyRate: client.defaultHourlyRate,
          isArchived: client.isArchived,
        },
        startDate: args.startDate,
        endDate: args.endDate,
        groupedTasks: [],
      };
    }

    // OPTIMIZATION: Batch all time entry queries using Promise.all
    // This avoids N+1 queries by running them in parallel
    const timeEntryPromises = allTasks.map(async (task) => {
      const entries = await ctx.db
        .query("timeEntries")
        .withIndex("by_taskId_and_date", (q) => q.eq("taskId", task._id))
        .filter((q) =>
          q.and(
            q.gte(q.field("date"), args.startDate),
            q.lte(q.field("date"), args.endDate)
          )
        )
        .collect();

      const totalSeconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0);
      return { taskId: task._id, totalSeconds };
    });

    const timeResults = await Promise.all(timeEntryPromises);
    const timeByTask = new Map<Id<"tasks">, number>(
      timeResults.map((r) => [r.taskId, r.totalSeconds])
    );

    // Separate main tasks and subtasks
    const mainTasks = allTasks.filter((t) => !t.parentTaskId);
    const subtasksByParent = new Map<Id<"tasks">, typeof allTasks>();

    for (const task of allTasks) {
      if (task.parentTaskId) {
        const siblings = subtasksByParent.get(task.parentTaskId) || [];
        siblings.push(task);
        subtasksByParent.set(task.parentTaskId, siblings);
      }
    }

    // Build grouped structure
    const groupedTasks = mainTasks.map((mainTask) => {
      const subtasks = subtasksByParent.get(mainTask._id) || [];
      return {
        mainTask: {
          _id: mainTask._id,
          title: mainTask.title,
          description: mainTask.description,
          category: mainTask.category as TaskCategory | undefined,
          timeSeconds: timeByTask.get(mainTask._id) || 0,
        },
        subtasks: subtasks
          .map((st) => ({
            _id: st._id,
            title: st.title,
            description: st.description,
            category: st.category as TaskCategory | undefined,
            parentTaskId: mainTask._id,
            parentTaskTitle: mainTask.title,
            timeSeconds: timeByTask.get(st._id) || 0,
          }))
          .sort((a, b) => a.title.localeCompare(b.title)),
      };
    });

    // Sort main tasks by title
    groupedTasks.sort((a, b) => a.mainTask.title.localeCompare(b.mainTask.title));

    return {
      client: {
        _id: client._id,
        name: client.name,
        currency: client.currency,
        defaultHourlyRate: client.defaultHourlyRate,
        isArchived: client.isArchived,
      },
      startDate: args.startDate,
      endDate: args.endDate,
      groupedTasks,
    };
  },
});

/**
 * Create a new report with full validation.
 */
export const create = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    entries: v.array(reportEntryValidator),
    totalSeconds: v.number(),
    totalAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    // Validate client
    const client = await ctx.db.get(args.clientId);
    if (!client || client.orgId !== orgId) {
      throw new ConvexError("Client not found");
    }

    // Validate date format and range
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(args.startDate) || !dateRegex.test(args.endDate)) {
      throw new ConvexError("Invalid date format. Use YYYY-MM-DD");
    }
    if (args.startDate > args.endDate) {
      throw new ConvexError("Start date must be before or equal to end date");
    }

    // Validate non-empty report
    if (args.entries.length === 0) {
      throw new ConvexError("Report must have at least one task entry");
    }

    // Validate total seconds is positive
    const calculatedTotal = args.entries.reduce(
      (sum, e) => sum + e.adjustedSeconds,
      0
    );
    if (calculatedTotal <= 0) {
      throw new ConvexError("Report must have time entries with positive duration");
    }

    // Validate all tasks belong to this client and org
    const taskIds = args.entries.map((e) => e.taskId);
    const tasksMap = await batchGet(ctx, "tasks", taskIds);

    for (const entry of args.entries) {
      const task = tasksMap.get(entry.taskId);
      if (!task) {
        throw new ConvexError(`Task not found: ${entry.taskId}`);
      }
      if (task.clientId !== args.clientId) {
        throw new ConvexError(
          `Task "${task.title}" does not belong to this client`
        );
      }
      if (task.orgId !== orgId) {
        throw new ConvexError("Unauthorized access to task");
      }
    }

    const now = Date.now();
    const reportId = await ctx.db.insert("reports", {
      orgId,
      clientId: args.clientId,
      clientName: client.name,
      clientCurrency: client.currency,
      clientHourlyRate: client.defaultHourlyRate,
      name: args.name.trim(),
      startDate: args.startDate,
      endDate: args.endDate,
      entries: args.entries,
      totalSeconds: args.totalSeconds,
      totalAmount: args.totalAmount,
      createdAt: now,
      updatedAt: now,
    });

    return reportId;
  },
});

/**
 * Update an existing report.
 */
export const update = mutation({
  args: {
    id: v.id("reports"),
    name: v.optional(v.string()),
    entries: v.optional(v.array(reportEntryValidator)),
    totalSeconds: v.optional(v.number()),
    totalAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    const report = await ctx.db.get(args.id);
    if (!report || report.orgId !== orgId) {
      throw new ConvexError("Report not found");
    }

    // If updating entries, validate them
    if (args.entries !== undefined) {
      if (args.entries.length === 0) {
        throw new ConvexError("Report must have at least one task entry");
      }

      // Validate all tasks belong to this client
      const taskIds = args.entries.map((e) => e.taskId);
      const tasksMap = await batchGet(ctx, "tasks", taskIds);

      for (const entry of args.entries) {
        const task = tasksMap.get(entry.taskId);
        if (!task) {
          throw new ConvexError(`Task not found: ${entry.taskId}`);
        }
        if (task.clientId !== report.clientId) {
          throw new ConvexError(
            `Task "${task.title}" does not belong to this client`
          );
        }
      }
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name.trim();
    }
    if (args.entries !== undefined) {
      updates.entries = args.entries;
    }
    if (args.totalSeconds !== undefined) {
      updates.totalSeconds = args.totalSeconds;
    }
    if (args.totalAmount !== undefined) {
      updates.totalAmount = args.totalAmount;
    }

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Delete a report.
 */
export const remove = mutation({
  args: { id: v.id("reports") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    const report = await ctx.db.get(args.id);
    if (!report || report.orgId !== orgId) {
      throw new ConvexError("Report not found");
    }

    await ctx.db.delete(args.id);
  },
});
