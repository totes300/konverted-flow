/**
 * Timezone utilities for time tracking.
 * All dates are stored in organization timezone.
 */

/**
 * Get the current date string (YYYY-MM-DD) in a given timezone.
 */
export function getDateInTimezone(
  timestamp: number,
  timezone: string
): string {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Get the start of day (midnight) timestamp for a given date in a timezone.
 */
export function getStartOfDayTimestamp(
  dateString: string,
  timezone: string
): number {
  // Parse YYYY-MM-DD
  const [year, month, day] = dateString.split("-").map(Number);

  // Create a date object and format to get the timezone offset
  const tempDate = new Date(year, month - 1, day, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  // Get the parts
  const parts = formatter.formatToParts(tempDate);
  const getPart = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10);

  // This approach calculates the offset by comparing UTC to the timezone
  // Create a date at midnight UTC
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);

  // Get what that time looks like in the target timezone
  const inTz = getDateInTimezone(utcMidnight, timezone);
  const [tzYear, tzMonth, tzDay] = inTz.split("-").map(Number);

  // Calculate offset in milliseconds
  const dayDiff = (year - tzYear) * 365 + (month - tzMonth) * 30 + (day - tzDay);

  // Simple approach: iterate to find the correct timestamp
  // Start from a rough estimate and adjust
  let timestamp = utcMidnight;
  let currentDate = getDateInTimezone(timestamp, timezone);

  // Adjust by hours until we hit the right day
  // Safety limit: max 100 iterations (covers +/- 50 hours which handles all timezone offsets)
  let hourIterations = 0;
  const MAX_HOUR_ITERATIONS = 100;
  while (currentDate !== dateString && hourIterations < MAX_HOUR_ITERATIONS) {
    if (currentDate < dateString) {
      timestamp += 3600000; // Add 1 hour
    } else {
      timestamp -= 3600000; // Subtract 1 hour
    }
    currentDate = getDateInTimezone(timestamp, timezone);
    hourIterations++;
  }

  // If we hit the limit, return best estimate to avoid infinite loop
  if (hourIterations >= MAX_HOUR_ITERATIONS) {
    return timestamp;
  }

  // Now find the exact start of day by going back
  // Safety limit: max 4000 iterations (slightly more than 1 hour in ms)
  let msIterations = 0;
  const MAX_MS_ITERATIONS = 4000;
  while (getDateInTimezone(timestamp - 1, timezone) === dateString && msIterations < MAX_MS_ITERATIONS) {
    timestamp -= 1;
    msIterations++;
  }

  return timestamp;
}

/**
 * Get the end of day (just before midnight) timestamp for a given date in a timezone.
 */
export function getEndOfDayTimestamp(
  dateString: string,
  timezone: string
): number {
  // Get start of next day and subtract 1ms
  const [year, month, day] = dateString.split("-").map(Number);
  const nextDate = new Date(year, month - 1, day + 1);
  const nextDateString = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;

  return getStartOfDayTimestamp(nextDateString, timezone) - 1;
}

/**
 * Get the next day's date string.
 */
export function getNextDay(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const nextDate = new Date(year, month - 1, day + 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
}

/**
 * Calculate seconds between two timestamps that fall on a specific date in a timezone.
 * Used for splitting time entries across midnight.
 */
export function getSecondsOnDate(
  startTime: number,
  endTime: number,
  dateString: string,
  timezone: string
): number {
  const dayStart = getStartOfDayTimestamp(dateString, timezone);
  const dayEnd = getEndOfDayTimestamp(dateString, timezone);

  // Clamp the range to this day
  const effectiveStart = Math.max(startTime, dayStart);
  const effectiveEnd = Math.min(endTime, dayEnd);

  if (effectiveEnd <= effectiveStart) {
    return 0;
  }

  return Math.floor((effectiveEnd - effectiveStart) / 1000);
}

/**
 * Get all dates (YYYY-MM-DD) between two timestamps in a timezone.
 */
export function getDatesBetween(
  startTime: number,
  endTime: number,
  timezone: string
): string[] {
  const dates: string[] = [];
  let currentDate = getDateInTimezone(startTime, timezone);
  const endDate = getDateInTimezone(endTime, timezone);

  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = getNextDay(currentDate);
  }

  return dates;
}
