/**
 * Parse a time string into seconds.
 * Supports formats:
 * - "30" or "30m" → 30 minutes
 * - "2h" or "2 h" → 2 hours
 * - "8d" or "8 d" → 8 days
 * - "1h 30m" or "1h30m" → 1 hour 30 minutes
 * - "1.5h" → 90 minutes (decimal support)
 * - "2d 4h 30m" → complex combinations
 */

interface ParseResult {
  seconds: number;
  formatted: string;
  isValid: boolean;
  error?: string;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * 60;
const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * Parse a time string into seconds.
 */
export function parseTimeInput(input: string): ParseResult {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    return { seconds: 0, formatted: "", isValid: false, error: "Enter a time value" };
  }

  // Reject if contains negative sign
  if (trimmed.includes("-")) {
    return { seconds: 0, formatted: "", isValid: false, error: "Time must be positive" };
  }

  // Try to parse as a simple number (defaults to minutes)
  const simpleNumber = parseFloat(trimmed);
  if (!isNaN(simpleNumber) && /^[\d.]+$/.test(trimmed)) {
    if (simpleNumber <= 0) {
      return { seconds: 0, formatted: "", isValid: false, error: "Time must be positive" };
    }
    const seconds = Math.round(simpleNumber * SECONDS_PER_MINUTE);
    return {
      seconds,
      formatted: formatDuration(seconds),
      isValid: true,
    };
  }

  // Parse compound time strings like "1h 30m", "2d 4h", etc.
  let totalSeconds = 0;
  let hasMatch = false;

  // Match patterns: number followed by unit (d, h, m)
  // Supports: 1d, 1.5h, 30m, 1 h, 2 d, etc.
  const pattern = /(\d+(?:\.\d+)?)\s*(d|h|m)/gi;
  let match;

  while ((match = pattern.exec(trimmed)) !== null) {
    hasMatch = true;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case "d":
        totalSeconds += value * SECONDS_PER_DAY;
        break;
      case "h":
        totalSeconds += value * SECONDS_PER_HOUR;
        break;
      case "m":
        totalSeconds += value * SECONDS_PER_MINUTE;
        break;
    }
  }

  if (!hasMatch) {
    return {
      seconds: 0,
      formatted: "",
      isValid: false,
      error: "Invalid format. Try: 30m, 2h, 1d, or 1h 30m",
    };
  }

  if (totalSeconds <= 0) {
    return { seconds: 0, formatted: "", isValid: false, error: "Time must be positive" };
  }

  totalSeconds = Math.round(totalSeconds);

  return {
    seconds: totalSeconds,
    formatted: formatDuration(totalSeconds),
    isValid: true,
  };
}

/**
 * Format seconds into a human-readable duration string.
 * Examples: "30m", "2h", "1h 30m", "1d 4h"
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "-";

  const days = Math.floor(totalSeconds / SECONDS_PER_DAY);
  const hours = Math.floor((totalSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  // If no parts (e.g., less than a minute), show as minutes
  if (parts.length === 0) {
    return "<1m";
  }

  return parts.join(" ");
}

/**
 * Format seconds for the timer display (HH:MM:SS or MM:SS).
 */
export function formatTimerDisplay(seconds: number): string {
  // Ensure non-negative value (can happen due to clock sync issues)
  const safeSeconds = Math.max(0, seconds);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format seconds as HH:MM:SS (always includes hours).
 * Used for displaying entry durations in detailed views.
 */
export function formatEntryDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format a time range from start time and duration.
 * Returns format like "8:16 AM - 10:08 AM".
 */
export function formatTimeRange(startTime: number, durationSeconds: number): string {
  const start = new Date(startTime);
  const end = new Date(startTime + durationSeconds * 1000);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return `${formatTime(start)} - ${formatTime(end)}`;
}
