import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserOrgId, requireAuth } from "./lib/auth";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  getDateInTimezone,
  getDatesBetween,
  getSecondsOnDate,
} from "./lib/timezone";
import { isValidDate } from "./lib/validation";

// F3.5: Maximum duration per time entry (24 hours)
const MAX_DURATION_SECONDS = 24 * 60 * 60;

/**
 * Get the currently running time entry for the authenticated user.
 * Returns null if no timer is running.
 */
export const getRunning = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    // Query for running entry by user
    const runningEntry = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId_and_isRunning", (q) =>
        q.eq("userId", user._id).eq("isRunning", true)
      )
      .first();

    if (!runningEntry) {
      return null;
    }

    // Also fetch the associated task
    const task = await ctx.db.get(runningEntry.taskId);

    return {
      entry: runningEntry,
      task,
    };
  },
});

/**
 * Get all time entries for a specific task.
 * Returns entries sorted by createdAt descending (newest first).
 */
export const getByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    // Verify task belongs to org
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== orgId) {
      return [];
    }

    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();

    // Sort by createdAt descending
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get all time entries for a specific task with user data.
 * Returns entries with user name and avatar, sorted by createdAt descending.
 * F2.2: Optimized to batch-fetch unique users instead of N+1 queries.
 */
export const getByTaskWithUsers = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    // Verify task belongs to org
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== orgId) {
      return [];
    }

    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();

    // F2.2: Batch fetch unique users to avoid N+1 queries
    const uniqueUserIds = [...new Set(entries.map((e) => e.userId))];
    const users = await Promise.all(uniqueUserIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => [u._id, { _id: u._id, name: u.name, avatarUrl: u.avatarUrl }])
    );

    // Map entries with user data
    const entriesWithUsers = entries.map((entry) => ({
      ...entry,
      user: userMap.get(entry.userId) ?? null,
    }));

    // Sort by createdAt descending
    return entriesWithUsers.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get all time entries for a user on a specific date.
 * Date format: YYYY-MM-DD in org timezone.
 */
export const getByUserAndDate = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    // Verify user belongs to org
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser || targetUser.orgId !== orgId) {
      return [];
    }

    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();

    return entries;
  },
});

/**
 * Get today's time entries for the current user.
 */
export const getTodayEntries = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    // Get org timezone
    const org = await ctx.db.get(user.orgId);
    if (!org) {
      return [];
    }

    const todayDate = getDateInTimezone(Date.now(), org.timezone);

    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", user._id).eq("date", todayDate)
      )
      .collect();

    return entries;
  },
});

/**
 * Start a timer on a task.
 * Automatically stops any existing running timer first.
 * Creates a new time entry with isRunning=true.
 */
export const startTimer = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    // Verify task belongs to org
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== orgId) {
      throw new ConvexError("Task not found");
    }

    if (task.isDeleted) {
      throw new ConvexError("Cannot track time on deleted task");
    }

    // Get org timezone
    const org = await ctx.db.get(orgId);
    if (!org) {
      throw new ConvexError("Organization not found");
    }

    const now = Date.now();
    const todayDate = getDateInTimezone(now, org.timezone);

    // Stop any existing running timer first
    const runningEntry = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId_and_isRunning", (q) =>
        q.eq("userId", user._id).eq("isRunning", true)
      )
      .first();

    if (runningEntry) {
      // Stop the running timer using internal logic
      await stopTimerInternal(ctx, user._id, orgId, now, org.timezone);
    }

    // F3.2: Re-check for running timer after stop to prevent race condition
    // This catches the case where another startTimer call created a new timer
    const stillRunning = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId_and_isRunning", (q) =>
        q.eq("userId", user._id).eq("isRunning", true)
      )
      .first();

    if (stillRunning) {
      throw new ConvexError("A timer is already running. Please try again.");
    }

    // Get client's default hourly rate if available
    let hourlyRate: number | undefined;
    if (task.clientId) {
      const client = await ctx.db.get(task.clientId);
      if (client) {
        hourlyRate = client.defaultHourlyRate;
      }
    }

    // Create new time entry
    const entryId = await ctx.db.insert("timeEntries", {
      orgId,
      taskId: args.taskId,
      userId: user._id,
      date: todayDate,
      startTime: now,
      durationSeconds: 0,
      isRunning: true,
      hourlyRate,
      isBillable: hourlyRate !== undefined,
      createdAt: now,
    });

    // Update user's activeTimeEntryId
    await ctx.db.patch(user._id, {
      activeTimeEntryId: entryId,
    });

    return entryId;
  },
});

/**
 * Internal function to stop a timer.
 * Handles midnight crossing by creating multiple entries.
 */
async function stopTimerInternal(
  ctx: { db: any },
  userId: Id<"users">,
  orgId: Id<"organizations">,
  stopTime: number,
  timezone: string
) {
  const runningEntry = await ctx.db
    .query("timeEntries")
    .withIndex("by_userId_and_isRunning", (q: any) =>
      q.eq("userId", userId).eq("isRunning", true)
    )
    .first();

  if (!runningEntry || !runningEntry.startTime) {
    return null;
  }

  const startTime = runningEntry.startTime;
  const dates = getDatesBetween(startTime, stopTime, timezone);

  if (dates.length === 1) {
    // Timer didn't cross midnight - simple case
    const durationSeconds = Math.floor((stopTime - startTime) / 1000);

    await ctx.db.patch(runningEntry._id, {
      isRunning: false,
      durationSeconds,
    });

    // Update task totalTimeSeconds
    await updateTaskTotalTime(ctx, runningEntry.taskId, durationSeconds);

    // Log time_logged activity event
    await ctx.db.insert("activityEvents", {
      orgId,
      taskId: runningEntry.taskId,
      userId,
      eventType: "time_logged",
      data: {
        durationSeconds,
      },
      isDeleted: false,
      createdAt: stopTime,
    });

    return runningEntry._id;
  }

  // Timer crossed midnight - create multiple entries
  let totalDuration = 0;

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const secondsOnDate = getSecondsOnDate(startTime, stopTime, date, timezone);

    if (secondsOnDate <= 0) continue;

    totalDuration += secondsOnDate;

    if (i === 0) {
      // Update the original entry for the first day
      await ctx.db.patch(runningEntry._id, {
        isRunning: false,
        durationSeconds: secondsOnDate,
      });
    } else {
      // Create new entries for subsequent days
      await ctx.db.insert("timeEntries", {
        orgId,
        taskId: runningEntry.taskId,
        userId,
        date,
        startTime: undefined, // No start time for split entries
        durationSeconds: secondsOnDate,
        isRunning: false,
        hourlyRate: runningEntry.hourlyRate,
        isBillable: runningEntry.isBillable,
        createdAt: stopTime,
      });
    }
  }

  // Update task totalTimeSeconds
  await updateTaskTotalTime(ctx, runningEntry.taskId, totalDuration);

  // Log time_logged activity event
  await ctx.db.insert("activityEvents", {
    orgId,
    taskId: runningEntry.taskId,
    userId,
    eventType: "time_logged",
    data: {
      durationSeconds: totalDuration,
    },
    isDeleted: false,
    createdAt: stopTime,
  });

  return runningEntry._id;
}

/**
 * Helper to update task's totalTimeSeconds.
 */
async function updateTaskTotalTime(
  ctx: { db: any },
  taskId: Id<"tasks">,
  additionalSeconds: number
) {
  const task = await ctx.db.get(taskId);
  if (task) {
    await ctx.db.patch(taskId, {
      totalTimeSeconds: task.totalTimeSeconds + additionalSeconds,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Stop the current running timer.
 * Handles midnight crossing by creating multiple entries if needed.
 */
export const stopTimer = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    // Get org timezone
    const org = await ctx.db.get(orgId);
    if (!org) {
      throw new ConvexError("Organization not found");
    }

    const now = Date.now();
    const result = await stopTimerInternal(ctx, user._id, orgId, now, org.timezone);

    if (!result) {
      throw new ConvexError("No running timer");
    }

    // Clear user's activeTimeEntryId
    await ctx.db.patch(user._id, {
      activeTimeEntryId: undefined,
    });

    return result;
  },
});

/**
 * Create a manual time entry (not from timer).
 * F3.5: Validates max duration (24 hours)
 * F3.6: Validates date format properly
 */
export const createManual = mutation({
  args: {
    taskId: v.id("tasks"),
    date: v.string(), // YYYY-MM-DD
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    // Validate duration
    if (args.durationSeconds <= 0) {
      throw new ConvexError("Duration must be positive");
    }

    // F3.5: Validate max duration
    if (args.durationSeconds > MAX_DURATION_SECONDS) {
      throw new ConvexError("Duration cannot exceed 24 hours per entry");
    }

    // F3.6: Validate date format properly (not just regex)
    if (!isValidDate(args.date)) {
      throw new ConvexError("Invalid date. Use YYYY-MM-DD format with valid date");
    }

    // Verify task belongs to org
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== orgId) {
      throw new ConvexError("Task not found");
    }

    if (task.isDeleted) {
      throw new ConvexError("Cannot track time on deleted task");
    }

    // Get client's default hourly rate if available
    let hourlyRate: number | undefined;
    if (task.clientId) {
      const client = await ctx.db.get(task.clientId);
      if (client) {
        hourlyRate = client.defaultHourlyRate;
      }
    }

    const now = Date.now();

    // Create time entry
    const entryId = await ctx.db.insert("timeEntries", {
      orgId,
      taskId: args.taskId,
      userId: user._id,
      date: args.date,
      startTime: undefined, // Manual entries don't have a start time
      durationSeconds: args.durationSeconds,
      isRunning: false,
      hourlyRate,
      isBillable: hourlyRate !== undefined,
      createdAt: now,
    });

    // Update task totalTimeSeconds
    await updateTaskTotalTime(ctx, args.taskId, args.durationSeconds);

    // Log time_logged activity event
    await ctx.db.insert("activityEvents", {
      orgId,
      taskId: args.taskId,
      userId: user._id,
      eventType: "time_logged",
      data: {
        durationSeconds: args.durationSeconds,
      },
      isDeleted: false,
      createdAt: now,
    });

    return entryId;
  },
});

/**
 * Update an existing time entry.
 */
export const update = mutation({
  args: {
    id: v.id("timeEntries"),
    durationSeconds: v.optional(v.number()),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.orgId !== orgId) {
      throw new ConvexError("Time entry not found");
    }

    if (entry.isRunning) {
      throw new ConvexError("Cannot update a running time entry");
    }

    const updates: Record<string, any> = {};

    // Validate and set duration
    if (args.durationSeconds !== undefined) {
      if (args.durationSeconds <= 0) {
        throw new ConvexError("Duration must be positive");
      }

      // F3.5: Validate max duration
      if (args.durationSeconds > MAX_DURATION_SECONDS) {
        throw new ConvexError("Duration cannot exceed 24 hours per entry");
      }

      // Calculate the difference to update task total
      const durationDiff = args.durationSeconds - entry.durationSeconds;
      if (durationDiff !== 0) {
        await updateTaskTotalTime(ctx, entry.taskId, durationDiff);
      }

      updates.durationSeconds = args.durationSeconds;
    }

    // F3.6: Validate date properly (not just regex)
    if (args.date !== undefined) {
      if (!isValidDate(args.date)) {
        throw new ConvexError("Invalid date. Use YYYY-MM-DD format with valid date");
      }
      updates.date = args.date;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.id, updates);
    }
  },
});

/**
 * Delete a time entry.
 */
export const remove = mutation({
  args: { id: v.id("timeEntries") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.orgId !== orgId) {
      throw new ConvexError("Time entry not found");
    }

    if (entry.isRunning) {
      throw new ConvexError("Cannot delete a running time entry. Stop it first.");
    }

    // Update task totalTimeSeconds (subtract the duration)
    await updateTaskTotalTime(ctx, entry.taskId, -entry.durationSeconds);

    // Delete the entry
    await ctx.db.delete(args.id);
  },
});

/**
 * Recalculate task's totalTimeSeconds from all time entries.
 * Useful for fixing any inconsistencies.
 */
export const recalculateTaskTotal = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== orgId) {
      throw new ConvexError("Task not found");
    }

    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();

    const totalSeconds = entries.reduce(
      (sum, entry) => sum + entry.durationSeconds,
      0
    );

    await ctx.db.patch(args.taskId, {
      totalTimeSeconds: totalSeconds,
      updatedAt: Date.now(),
    });

    return totalSeconds;
  },
});
