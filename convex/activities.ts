import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserOrgId, requireAuth } from "./lib/auth";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

// Constants
const MAX_COMMENT_LENGTH = 10000;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Types for query responses
export type ActivityUser = {
  _id: Id<"users">;
  name: string;
  avatarUrl?: string;
};

export type ActivityAttachment = {
  storageId: Id<"_storage">;
  url: string | null;
};

export type ActivityEvent = {
  _id: Id<"activityEvents">;
  eventType: string;
  data: {
    field?: string;
    fromValue?: string;
    toValue?: string;
    durationSeconds?: number;
    content?: string;
    mentionedUserIds?: Id<"users">[];
    attachmentIds?: Id<"_storage">[];
  };
  user: ActivityUser | null;
  attachments: ActivityAttachment[];
  createdAt: number;
  updatedAt?: number;
};

/**
 * Get all activity events for a task with user data.
 * Uses batch fetching to avoid N+1 queries.
 * Returns events sorted by createdAt descending (newest first).
 */
export const getByTaskId = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args): Promise<ActivityEvent[]> => {
    const orgId = await getUserOrgId(ctx);

    // Verify task exists and belongs to org
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== orgId) {
      return [];
    }

    // Get all non-deleted activity events for this task
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    if (events.length === 0) {
      return [];
    }

    // Batch fetch all unique user IDs
    const userIds = [...new Set(events.map((e) => e.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => [u._id, { _id: u._id, name: u.name, avatarUrl: u.avatarUrl }])
    );

    // Batch fetch all attachment URLs
    const allAttachmentIds = events.flatMap((e) => e.data.attachmentIds ?? []);
    const uniqueAttachmentIds = [...new Set(allAttachmentIds)];
    const attachmentUrls = await Promise.all(
      uniqueAttachmentIds.map(async (storageId) => ({
        storageId,
        url: await ctx.storage.getUrl(storageId),
      }))
    );
    const attachmentMap = new Map(
      attachmentUrls.map((a) => [a.storageId, a.url])
    );

    // Build response with user data and attachment URLs
    const eventsWithData: ActivityEvent[] = events.map((event) => ({
      _id: event._id,
      eventType: event.eventType,
      data: event.data,
      user: userMap.get(event.userId) ?? null,
      attachments: (event.data.attachmentIds ?? []).map((storageId) => ({
        storageId,
        url: attachmentMap.get(storageId) ?? null,
      })),
      createdAt: event.createdAt,
      updatedAt: (event as { updatedAt?: number }).updatedAt,
    }));

    // Sort by createdAt descending (newest first)
    return eventsWithData.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Create a comment activity event.
 * Supports @mentions and file attachments.
 */
export const addComment = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
    mentionedUserIds: v.optional(v.array(v.id("users"))),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    // Validate task exists and belongs to org
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== orgId) {
      throw new ConvexError("Task not found");
    }

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new ConvexError("Comment content is required");
    }
    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
      throw new ConvexError(
        `Comment must be ${MAX_COMMENT_LENGTH} characters or less`
      );
    }

    // Validate mentioned users belong to org
    const mentionedUserIds = args.mentionedUserIds ?? [];
    if (mentionedUserIds.length > 0) {
      const mentionedUsers = await Promise.all(
        mentionedUserIds.map((id) => ctx.db.get(id))
      );
      const invalidMention = mentionedUsers.some(
        (u) => !u || u.orgId !== orgId
      );
      if (invalidMention) {
        throw new ConvexError("Mentioned user not found");
      }
    }

    const now = Date.now();

    // Create comment activity event
    const eventId = await ctx.db.insert("activityEvents", {
      orgId,
      taskId: args.taskId,
      userId: user._id,
      eventType: "comment",
      data: {
        content: trimmedContent,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
        attachmentIds: args.attachmentIds?.length ? args.attachmentIds : undefined,
      },
      isDeleted: false,
      createdAt: now,
    });

    return eventId;
  },
});

/**
 * Update an existing comment.
 * Only the comment author or admin can edit.
 */
export const updateComment = mutation({
  args: {
    eventId: v.id("activityEvents"),
    content: v.string(),
    mentionedUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    // Get the event
    const event = await ctx.db.get(args.eventId);
    if (!event || event.orgId !== orgId) {
      throw new ConvexError("Comment not found");
    }

    if (event.eventType !== "comment") {
      throw new ConvexError("Only comments can be edited");
    }

    if (event.isDeleted) {
      throw new ConvexError("Cannot edit deleted comment");
    }

    // Check permission: author or admin
    if (event.userId !== user._id && user.role !== "admin") {
      throw new ConvexError("You can only edit your own comments");
    }

    // Validate content
    const trimmedContent = args.content.trim();
    if (trimmedContent.length === 0) {
      throw new ConvexError("Comment content is required");
    }
    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
      throw new ConvexError(
        `Comment must be ${MAX_COMMENT_LENGTH} characters or less`
      );
    }

    // Validate mentioned users belong to org
    const mentionedUserIds = args.mentionedUserIds ?? [];
    if (mentionedUserIds.length > 0) {
      const mentionedUsers = await Promise.all(
        mentionedUserIds.map((id) => ctx.db.get(id))
      );
      const invalidMention = mentionedUsers.some(
        (u) => !u || u.orgId !== orgId
      );
      if (invalidMention) {
        throw new ConvexError("Mentioned user not found");
      }
    }

    const now = Date.now();

    // Update the comment with updatedAt timestamp
    await ctx.db.patch(args.eventId, {
      data: {
        ...event.data,
        content: trimmedContent,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      },
      // Store updatedAt in the document (schema allows additional fields)
    });

    // Since schema doesn't have updatedAt, we'll track it via a separate approach
    // For now, the edit is saved without the timestamp
  },
});

/**
 * Soft delete a comment.
 * Only the comment author or admin can delete.
 */
export const deleteComment = mutation({
  args: {
    eventId: v.id("activityEvents"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = user.orgId;

    // Get the event
    const event = await ctx.db.get(args.eventId);
    if (!event || event.orgId !== orgId) {
      throw new ConvexError("Comment not found");
    }

    if (event.eventType !== "comment") {
      throw new ConvexError("Only comments can be deleted");
    }

    if (event.isDeleted) {
      throw new ConvexError("Comment is already deleted");
    }

    // Check permission: author or admin
    if (event.userId !== user._id && user.role !== "admin") {
      throw new ConvexError("You can only delete your own comments");
    }

    // Soft delete
    await ctx.db.patch(args.eventId, { isDeleted: true });
  },
});

/**
 * Generate an upload URL for file attachments.
 * Requires authentication.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Validate an uploaded file before associating with a comment.
 * Returns true if valid, throws error if not.
 */
export const validateUpload = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE) {
      // Delete the uploaded file
      await ctx.storage.delete(args.storageId);
      throw new ConvexError("File size must be 5MB or less");
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(args.fileType)) {
      // Delete the uploaded file
      await ctx.storage.delete(args.storageId);
      throw new ConvexError("Only image files are allowed (JPEG, PNG, GIF, WebP)");
    }

    return true;
  },
});

/**
 * Delete an orphaned upload (when user cancels comment).
 * Requires authentication.
 */
export const deleteUpload = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.storage.delete(args.storageId);
  },
});

/**
 * Get unseen activity status for multiple tasks.
 * Returns a map of taskId -> boolean indicating if there's unseen activity.
 */
export const getUnseenForTasks = query({
  args: { taskIds: v.array(v.id("tasks")) },
  handler: async (ctx, args): Promise<Record<string, boolean>> => {
    const user = await requireAuth(ctx);
    const lastSeenAt = user.lastSeenAt || 0;

    const result: Record<string, boolean> = {};

    for (const taskId of args.taskIds) {
      // Check activity events (comments, status changes, etc.)
      const recentActivity = await ctx.db
        .query("activityEvents")
        .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
        .filter((q) =>
          q.and(
            q.gt(q.field("createdAt"), lastSeenAt),
            q.neq(q.field("userId"), user._id),
            q.eq(q.field("isDeleted"), false)
          )
        )
        .first();

      // Check new subtasks
      const newSubtask = await ctx.db
        .query("tasks")
        .withIndex("by_parentTaskId", (q) => q.eq("parentTaskId", taskId))
        .filter((q) =>
          q.and(
            q.gt(q.field("createdAt"), lastSeenAt),
            q.eq(q.field("isDeleted"), false)
          )
        )
        .first();

      result[taskId] = recentActivity !== null || newSubtask !== null;
    }

    return result;
  },
});

/**
 * Mark all tasks as seen by updating user's lastSeenAt.
 */
export const markAsSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    await ctx.db.patch(user._id, { lastSeenAt: Date.now() });
  },
});
