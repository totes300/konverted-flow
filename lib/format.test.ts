import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  formatActivityTimestamp,
  formatCommentTimestamp,
  formatDuration,
  STATUS_LABELS,
} from "./format";

describe("formatActivityTimestamp", () => {
  beforeEach(() => {
    // Mock the current date to a fixed point for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should format timestamps from today as relative time", () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const result = formatActivityTimestamp(twoHoursAgo);
    expect(result).toContain("hours ago");
  });

  it("should format timestamps from minutes ago", () => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const result = formatActivityTimestamp(thirtyMinutesAgo);
    expect(result).toContain("minutes ago");
  });

  it("should format yesterday timestamps as 'Yesterday'", () => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    const result = formatActivityTimestamp(yesterday);
    expect(result).toBe("Yesterday");
  });

  it("should format timestamps from this week as day name", () => {
    // 3 days ago (Friday from Monday Jan 15)
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const result = formatActivityTimestamp(threeDaysAgo);
    // Should be a day name
    expect(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]).toContain(result);
  });

  it("should format older timestamps as 'MMM d'", () => {
    // 10 days ago
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const result = formatActivityTimestamp(tenDaysAgo);
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });

  it("should handle timestamps exactly at boundary", () => {
    // Exactly 7 days ago
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const result = formatActivityTimestamp(sevenDaysAgo);
    // Should be month/day format
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});

describe("formatCommentTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should format timestamps from today as relative time", () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const result = formatCommentTimestamp(twoHoursAgo);
    expect(result).toContain("hours ago");
  });

  it("should format yesterday timestamps with time", () => {
    // Yesterday at 3:45 PM
    const yesterday = Date.now() - 26 * 60 * 60 * 1000;
    const result = formatCommentTimestamp(yesterday);
    expect(result).toContain("Yesterday");
    expect(result).toMatch(/Yesterday, \d{1,2}:\d{2} [AP]M/);
  });

  it("should format older timestamps with date and time", () => {
    // 3 days ago
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const result = formatCommentTimestamp(threeDaysAgo);
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M$/);
  });

  it("should handle timestamps just under 24 hours as relative", () => {
    const twentyThreeHoursAgo = Date.now() - 23 * 60 * 60 * 1000;
    const result = formatCommentTimestamp(twentyThreeHoursAgo);
    expect(result).toContain("hours ago");
  });

  it("should handle timestamps just over 48 hours with full date", () => {
    const fiftyHoursAgo = Date.now() - 50 * 60 * 60 * 1000;
    const result = formatCommentTimestamp(fiftyHoursAgo);
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M$/);
  });
});

describe("formatDuration", () => {
  it("should format 0 seconds as '0m'", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  it("should format minutes only", () => {
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(30 * 60)).toBe("30m");
    expect(formatDuration(59 * 60)).toBe("59m");
  });

  it("should format hours only when no remaining minutes", () => {
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(2 * 3600)).toBe("2h");
  });

  it("should format hours and minutes combined", () => {
    expect(formatDuration(3600 + 30 * 60)).toBe("1h 30m");
    expect(formatDuration(2 * 3600 + 45 * 60)).toBe("2h 45m");
  });

  it("should handle large durations", () => {
    expect(formatDuration(10 * 3600)).toBe("10h");
    expect(formatDuration(24 * 3600)).toBe("24h");
    expect(formatDuration(100 * 3600 + 30 * 60)).toBe("100h 30m");
  });

  it("should ignore seconds (floor to minutes)", () => {
    expect(formatDuration(90)).toBe("1m"); // 1 minute 30 seconds = 1m
    expect(formatDuration(3599)).toBe("59m"); // 59m 59s = 59m (floors)
    expect(formatDuration(3659)).toBe("1h"); // 60m 59s = 1h 0m = 1h
  });
});

describe("STATUS_LABELS", () => {
  it("should have all expected status keys", () => {
    expect(STATUS_LABELS).toHaveProperty("today");
    expect(STATUS_LABELS).toHaveProperty("next_up");
    expect(STATUS_LABELS).toHaveProperty("in_progress");
    expect(STATUS_LABELS).toHaveProperty("admin_review");
    expect(STATUS_LABELS).toHaveProperty("client_review");
    expect(STATUS_LABELS).toHaveProperty("stuck");
    expect(STATUS_LABELS).toHaveProperty("done");
  });

  it("should have correct display labels", () => {
    expect(STATUS_LABELS.today).toBe("Today");
    expect(STATUS_LABELS.next_up).toBe("Next up");
    expect(STATUS_LABELS.in_progress).toBe("In Progress");
    expect(STATUS_LABELS.admin_review).toBe("Admin Review");
    expect(STATUS_LABELS.client_review).toBe("Client Review");
    expect(STATUS_LABELS.stuck).toBe("Stuck");
    expect(STATUS_LABELS.done).toBe("Done");
  });

  it("should return undefined for unknown status", () => {
    expect(STATUS_LABELS["unknown"]).toBeUndefined();
  });
});
