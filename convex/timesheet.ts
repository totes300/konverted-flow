import { v } from "convex/values";
import { query } from "./_generated/server";
import { getUserOrgId } from "./lib/auth";

/**
 * Get timesheet data for a date range.
 * Returns all users and their time entries with task info.
 */
export const getTimesheetData = query({
  args: {
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    // Get all non-deleted users in the org
    const users = await ctx.db
      .query("users")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    // Get time entries in date range using the org+date index
    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_orgId_and_date", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .collect();

    // Batch fetch unique tasks
    const uniqueTaskIds = [...new Set(entries.map((e) => e.taskId))];
    const tasks = await Promise.all(uniqueTaskIds.map((id) => ctx.db.get(id)));
    const taskMap = new Map(
      tasks
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .map((t) => [t._id, { _id: t._id, title: t.title, isDeleted: t.isDeleted }])
    );

    return {
      users: users.map((u) => ({
        _id: u._id,
        name: u.name,
        avatarUrl: u.avatarUrl,
      })),
      entries: entries.map((e) => ({
        _id: e._id,
        userId: e.userId,
        taskId: e.taskId,
        date: e.date,
        durationSeconds: e.durationSeconds,
        task: taskMap.get(e.taskId) ?? null,
      })),
    };
  },
});
