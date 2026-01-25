import { v, Infer } from "convex/values";

// ============================================
// Task Categories
// ============================================
export const TASK_CATEGORIES = [
  "strategy",
  "design",
  "copywriting",
  "development",
  "project_management",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const categoryValidator = v.union(
  v.literal("strategy"),
  v.literal("design"),
  v.literal("copywriting"),
  v.literal("development"),
  v.literal("project_management")
);

export const optionalCategoryValidator = v.optional(categoryValidator);

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  strategy: "Strategy",
  design: "Design",
  copywriting: "Copywriting",
  development: "Development",
  project_management: "Project Management",
};

// ============================================
// Currencies
// ============================================
export const CURRENCIES = ["USD", "EUR", "HUF"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const currencyValidator = v.union(
  v.literal("USD"),
  v.literal("EUR"),
  v.literal("HUF")
);

export const optionalCurrencyValidator = v.optional(currencyValidator);

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "USD ($)",
  EUR: "EUR",
  HUF: "HUF (Ft)",
};

// ============================================
// Task Status
// ============================================
export const TASK_STATUSES = [
  "today",
  "next_up",
  "in_progress",
  "admin_review",
  "client_review",
  "stuck",
  "done",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const statusValidator = v.union(
  v.literal("today"),
  v.literal("next_up"),
  v.literal("in_progress"),
  v.literal("admin_review"),
  v.literal("client_review"),
  v.literal("stuck"),
  v.literal("done")
);

// ============================================
// Task Priority
// ============================================
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
);

// ============================================
// Report Entry (stored snapshot)
// ============================================
// Backward-compatible: taskTitle is optional for old entries
export const reportEntryValidator = v.object({
  taskId: v.id("tasks"),
  taskTitle: v.optional(v.string()), // Snapshot at creation time (optional for backward compat)
  taskDescription: v.optional(v.string()),
  taskCategory: v.optional(categoryValidator),
  parentTaskId: v.optional(v.id("tasks")),
  parentTaskTitle: v.optional(v.string()), // Snapshot
  originalSeconds: v.number(),
  adjustedSeconds: v.number(),
});

// Infer the type from the validator to ensure consistency
export type ReportEntry = Infer<typeof reportEntryValidator>;
