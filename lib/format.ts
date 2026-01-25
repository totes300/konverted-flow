import { formatDistanceToNow, format } from "date-fns";

/**
 * Format a timestamp for activity events (compact format).
 * - Today: "2 hours ago"
 * - Yesterday: "Yesterday"
 * - This week: "Monday"
 * - Older: "Jan 15"
 */
export function formatActivityTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return format(date, "EEEE");
  }
  return format(date, "MMM d");
}

/**
 * Format a timestamp for comments (detailed format with time).
 * - Today: "2 hours ago"
 * - Yesterday: "Yesterday, 3:45 PM"
 * - Older: "Jan 15, 3:45 PM"
 */
export function formatCommentTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 24) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  if (diffHours < 48) {
    return "Yesterday, " + format(date, "h:mm a");
  }
  return format(date, "MMM d, h:mm a");
}

/**
 * Format a duration in seconds to human-readable format.
 * - 0 seconds: "0m"
 * - 30 minutes: "30m"
 * - 2 hours: "2h"
 * - 2 hours 30 minutes: "2h 30m"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Status display labels mapping.
 */
export const STATUS_LABELS: Record<string, string> = {
  today: "Today",
  next_up: "Next up",
  in_progress: "In Progress",
  admin_review: "Admin Review",
  client_review: "Client Review",
  stuck: "Stuck",
  done: "Done",
};
