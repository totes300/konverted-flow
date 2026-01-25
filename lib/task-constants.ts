/**
 * Shared task status and priority constants.
 * Centralized to avoid duplication across components.
 */

export type TaskStatus =
  | "today"
  | "next_up"
  | "in_progress"
  | "admin_review"
  | "client_review"
  | "stuck"
  | "done";

export type TaskPriority = "low" | "medium" | "high";

export const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  today: {
    label: "Today",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  next_up: {
    label: "Next up",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-400",
  },
  admin_review: {
    label: "Admin Review",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
  },
  client_review: {
    label: "Client Review",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-700 dark:text-cyan-400",
  },
  stuck: {
    label: "Stuck",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
  done: {
    label: "Done",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
  },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string }> = {
  high: {
    label: "High",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
  medium: {
    label: "Medium",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  low: {
    label: "Low",
    bg: "bg-slate-100 dark:bg-slate-800/50",
    text: "text-slate-600 dark:text-slate-400",
  },
};

export function formatTime(seconds: number): string {
  if (seconds === 0) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
