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

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  today: { label: "Today", color: "bg-yellow-500" },
  next_up: { label: "Next up", color: "bg-blue-500" },
  in_progress: { label: "In Progress", color: "bg-purple-500" },
  admin_review: { label: "Admin Review", color: "bg-orange-500" },
  client_review: { label: "Client Review", color: "bg-cyan-500" },
  stuck: { label: "Stuck", color: "bg-red-500" },
  done: { label: "Done", color: "bg-green-500" },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: "High", color: "text-red-500" },
  medium: { label: "Medium", color: "text-yellow-500" },
  low: { label: "Low", color: "text-green-500" },
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
