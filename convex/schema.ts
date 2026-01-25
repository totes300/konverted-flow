import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  statusValidator,
  priorityValidator,
  optionalCategoryValidator,
  optionalCurrencyValidator,
  reportEntryValidator,
} from "./types";

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
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_orgId", ["orgId"])
    .index("by_email", ["email"]),

  clients: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    email: v.optional(v.string()),
    defaultHourlyRate: v.optional(v.number()),
    currency: optionalCurrencyValidator,
    isArchived: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_name", ["orgId", "name"]),

  tasks: defineTable({
    orgId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    status: statusValidator,
    priority: priorityValidator,
    category: optionalCategoryValidator,
    clientId: v.optional(v.id("clients")),
    assigneeIds: v.array(v.id("users")),
    createdById: v.id("users"),
    parentTaskId: v.optional(v.id("tasks")),
    sortOrder: v.number(),
    todaySortOrder: v.optional(v.number()),
    totalTimeSeconds: v.number(),
    imageStorageId: v.optional(v.id("_storage")),
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
    startTime: v.optional(v.number()),
    durationSeconds: v.number(),
    isRunning: v.boolean(),
    hourlyRate: v.optional(v.number()),
    isBillable: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_taskId", ["taskId"])
    .index("by_taskId_and_date", ["taskId", "date"]) // For efficient per-task date range queries
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

  reports: defineTable({
    orgId: v.id("organizations"),
    clientId: v.id("clients"),
    // Snapshot fields (optional for backward compat with old reports)
    clientName: v.optional(v.string()), // Snapshot at creation
    clientCurrency: optionalCurrencyValidator, // Snapshot
    clientHourlyRate: v.optional(v.number()), // Snapshot
    name: v.string(), // Auto-generated: "ClientName - Jan 2026"
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
    entries: v.array(reportEntryValidator), // With task snapshots
    // Support both old (totalHours) and new (totalSeconds) formats
    totalHours: v.optional(v.number()), // Deprecated, for backward compat
    totalSeconds: v.optional(v.number()), // New format
    totalAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_clientId", ["clientId"])
    .index("by_orgId_and_clientId", ["orgId", "clientId"]),
});
