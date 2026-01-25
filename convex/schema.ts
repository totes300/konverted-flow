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
    isDeleted: v.optional(v.boolean()), // F1.3: Proper soft delete
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
    imageStorageId: v.optional(v.id("_storage")), // Task thumbnail image
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
  }).index("by_activityEventId", ["activityEventId"]),
});
