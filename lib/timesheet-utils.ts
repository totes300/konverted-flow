import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  format,
  parseISO,
  eachDayOfInterval,
  isSameMonth,
} from "date-fns";

export type TimesheetPeriod = "week" | "biweek" | "month";

/**
 * Get dates for a week (Mon-Sun) containing the given date.
 */
export function getWeekDates(date: Date): string[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
  return eachDayOfInterval({ start: weekStart, end: weekEnd }).map((d) =>
    format(d, "yyyy-MM-dd")
  );
}

/**
 * Get dates for bi-week: Current week (Mon-Sun) + Next week (Mon-Sun) = 14 days.
 */
export function getBiweekDates(date: Date): string[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const biweekEnd = addDays(weekStart, 13); // 14 days total
  return eachDayOfInterval({ start: weekStart, end: biweekEnd }).map((d) =>
    format(d, "yyyy-MM-dd")
  );
}

/**
 * Get all dates in the month containing the given date.
 */
export function getMonthDates(date: Date): string[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  return eachDayOfInterval({ start: monthStart, end: monthEnd }).map((d) =>
    format(d, "yyyy-MM-dd")
  );
}

/**
 * Get dates for a period.
 */
export function getPeriodDates(date: Date, period: TimesheetPeriod): string[] {
  switch (period) {
    case "week":
      return getWeekDates(date);
    case "biweek":
      return getBiweekDates(date);
    case "month":
      return getMonthDates(date);
  }
}

/**
 * Navigate to the next period.
 */
export function getNextPeriodDate(date: Date, period: TimesheetPeriod): Date {
  switch (period) {
    case "week":
      return addWeeks(date, 1);
    case "biweek":
      return addWeeks(date, 2);
    case "month":
      return addDays(endOfMonth(date), 1); // First day of next month
  }
}

/**
 * Navigate to the previous period.
 */
export function getPreviousPeriodDate(date: Date, period: TimesheetPeriod): Date {
  switch (period) {
    case "week":
      return addWeeks(date, -1);
    case "biweek":
      return addWeeks(date, -2);
    case "month":
      return addDays(startOfMonth(date), -1); // Last day of previous month
  }
}

/**
 * Format duration in seconds to human-readable string.
 * Examples: "2h 30m", "45m", "0h"
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0h";

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
 * Format a date range for display.
 * Examples: "Jan 20 - Jan 26, 2026", "Jan 20 - Feb 2, 2026"
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (isSameMonth(start, end)) {
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }

  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

/**
 * Format a single date for column header.
 */
export function formatColumnDate(dateStr: string): { day: string; date: string } {
  const date = parseISO(dateStr);
  return {
    day: format(date, "EEE"), // Mon, Tue, etc.
    date: format(date, "MMM d"), // Jan 20, etc.
  };
}
