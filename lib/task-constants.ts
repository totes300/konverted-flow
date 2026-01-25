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
    bg: "bg-[hsl(var(--status-today-bg))]",
    text: "text-[hsl(var(--status-today-text))]",
  },
  next_up: {
    label: "Next up",
    bg: "bg-[hsl(var(--status-next-up-bg))]",
    text: "text-[hsl(var(--status-next-up-text))]",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-[hsl(var(--status-in-progress-bg))]",
    text: "text-[hsl(var(--status-in-progress-text))]",
  },
  admin_review: {
    label: "Admin Review",
    bg: "bg-[hsl(var(--status-admin-review-bg))]",
    text: "text-[hsl(var(--status-admin-review-text))]",
  },
  client_review: {
    label: "Client Review",
    bg: "bg-[hsl(var(--status-client-review-bg))]",
    text: "text-[hsl(var(--status-client-review-text))]",
  },
  stuck: {
    label: "Stuck",
    bg: "bg-[hsl(var(--status-stuck-bg))]",
    text: "text-[hsl(var(--status-stuck-text))]",
  },
  done: {
    label: "Done",
    bg: "bg-[hsl(var(--status-done-bg))]",
    text: "text-[hsl(var(--status-done-text))]",
  },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string }> = {
  high: {
    label: "High",
    bg: "bg-[hsl(var(--priority-high-bg))]",
    text: "text-[hsl(var(--priority-high-text))]",
  },
  medium: {
    label: "Medium",
    bg: "bg-[hsl(var(--priority-medium-bg))]",
    text: "text-[hsl(var(--priority-medium-text))]",
  },
  low: {
    label: "Low",
    bg: "bg-[hsl(var(--priority-low-bg))]",
    text: "text-[hsl(var(--priority-low-text))]",
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
