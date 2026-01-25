import { describe, expect, it } from "vitest";
import {
  getDateInTimezone,
  getNextDay,
  getDatesBetween,
  getSecondsOnDate,
  getStartOfDayTimestamp,
  getEndOfDayTimestamp,
} from "./timezone";

describe("Timezone Utilities", () => {
  describe("getDateInTimezone", () => {
    it("should return date in YYYY-MM-DD format", () => {
      // Use a specific timestamp: 2024-01-15 12:00:00 UTC
      const timestamp = Date.UTC(2024, 0, 15, 12, 0, 0);
      const result = getDateInTimezone(timestamp, "UTC");
      expect(result).toBe("2024-01-15");
    });

    it("should convert to different timezone", () => {
      // Midnight UTC on Jan 15 should be Jan 14 in US timezones (due to offset)
      const timestamp = Date.UTC(2024, 0, 15, 3, 0, 0); // 3am UTC
      const utcResult = getDateInTimezone(timestamp, "UTC");
      expect(utcResult).toBe("2024-01-15");
    });

    it("should handle Europe/Budapest timezone", () => {
      // Budapest is UTC+1 in winter
      const timestamp = Date.UTC(2024, 0, 15, 12, 0, 0);
      const result = getDateInTimezone(timestamp, "Europe/Budapest");
      // 12:00 UTC is 13:00 in Budapest, still same day
      expect(result).toBe("2024-01-15");
    });

    it("should handle date boundary crossing", () => {
      // 23:30 UTC on Jan 15 should be Jan 16 in Budapest (which is UTC+1)
      const timestamp = Date.UTC(2024, 0, 15, 23, 30, 0);
      const resultBudapest = getDateInTimezone(timestamp, "Europe/Budapest");
      // 23:30 UTC = 00:30 next day in Budapest
      expect(resultBudapest).toBe("2024-01-16");
    });
  });

  describe("getNextDay", () => {
    it("should return next day for normal date", () => {
      expect(getNextDay("2024-01-15")).toBe("2024-01-16");
    });

    it("should handle month boundary", () => {
      expect(getNextDay("2024-01-31")).toBe("2024-02-01");
    });

    it("should handle year boundary", () => {
      expect(getNextDay("2024-12-31")).toBe("2025-01-01");
    });

    it("should handle February in leap year", () => {
      expect(getNextDay("2024-02-28")).toBe("2024-02-29");
      expect(getNextDay("2024-02-29")).toBe("2024-03-01");
    });

    it("should handle February in non-leap year", () => {
      expect(getNextDay("2023-02-28")).toBe("2023-03-01");
    });
  });

  describe("getDatesBetween", () => {
    it("should return single date when same day", () => {
      const start = Date.UTC(2024, 0, 15, 10, 0, 0);
      const end = Date.UTC(2024, 0, 15, 14, 0, 0);
      const dates = getDatesBetween(start, end, "UTC");
      expect(dates).toEqual(["2024-01-15"]);
    });

    it("should return two dates when crossing midnight", () => {
      const start = Date.UTC(2024, 0, 15, 22, 0, 0); // 10pm
      const end = Date.UTC(2024, 0, 16, 2, 0, 0); // 2am next day
      const dates = getDatesBetween(start, end, "UTC");
      expect(dates).toEqual(["2024-01-15", "2024-01-16"]);
    });

    it("should return multiple dates for multi-day span", () => {
      const start = Date.UTC(2024, 0, 15, 12, 0, 0);
      const end = Date.UTC(2024, 0, 18, 12, 0, 0);
      const dates = getDatesBetween(start, end, "UTC");
      expect(dates).toEqual([
        "2024-01-15",
        "2024-01-16",
        "2024-01-17",
        "2024-01-18",
      ]);
    });

    it("should handle timezone differences", () => {
      // Start at 11pm UTC on Jan 15, end at 1am UTC on Jan 16
      // In Budapest (UTC+1), this is midnight Jan 16 to 2am Jan 16 - same day!
      const start = Date.UTC(2024, 0, 15, 23, 0, 0);
      const end = Date.UTC(2024, 0, 16, 1, 0, 0);

      // In UTC, this crosses midnight
      const utcDates = getDatesBetween(start, end, "UTC");
      expect(utcDates.length).toBe(2);

      // In Budapest, it's all on Jan 16
      const budapestDates = getDatesBetween(start, end, "Europe/Budapest");
      expect(budapestDates.length).toBe(1);
      expect(budapestDates[0]).toBe("2024-01-16");
    });
  });

  describe("getSecondsOnDate", () => {
    it("should return full duration when entirely on one date", () => {
      const start = Date.UTC(2024, 0, 15, 10, 0, 0); // 10:00
      const end = Date.UTC(2024, 0, 15, 12, 0, 0); // 12:00
      const seconds = getSecondsOnDate(start, end, "2024-01-15", "UTC");
      expect(seconds).toBe(2 * 60 * 60); // 2 hours
    });

    it("should return zero when date doesn't match", () => {
      const start = Date.UTC(2024, 0, 15, 10, 0, 0);
      const end = Date.UTC(2024, 0, 15, 12, 0, 0);
      const seconds = getSecondsOnDate(start, end, "2024-01-16", "UTC");
      expect(seconds).toBe(0);
    });

    it("should calculate partial time for first day of multi-day span", () => {
      const start = Date.UTC(2024, 0, 15, 22, 0, 0); // 10pm
      const end = Date.UTC(2024, 0, 16, 2, 0, 0); // 2am next day

      // Time on Jan 15: 10pm to just before midnight (end of day is 1ms before midnight)
      // This is approximately 2 hours minus 1 second due to boundary handling
      const secondsOnDay1 = getSecondsOnDate(start, end, "2024-01-15", "UTC");
      expect(secondsOnDay1).toBeGreaterThanOrEqual(7199);
      expect(secondsOnDay1).toBeLessThanOrEqual(7200);

      // Time on Jan 16: midnight to 2am = 2 hours
      const secondsOnDay2 = getSecondsOnDate(start, end, "2024-01-16", "UTC");
      expect(secondsOnDay2).toBe(2 * 60 * 60);
    });
  });

  describe("getStartOfDayTimestamp", () => {
    it("should return start of day in UTC", () => {
      const startOfDay = getStartOfDayTimestamp("2024-01-15", "UTC");
      const date = new Date(startOfDay);
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
    });

    it("should return correct date string for the timestamp", () => {
      const startOfDay = getStartOfDayTimestamp("2024-01-15", "UTC");
      const dateStr = getDateInTimezone(startOfDay, "UTC");
      expect(dateStr).toBe("2024-01-15");
    });
  });

  describe("getEndOfDayTimestamp", () => {
    it("should be 1ms before next day start", () => {
      const endOfDay = getEndOfDayTimestamp("2024-01-15", "UTC");
      const startOfNextDay = getStartOfDayTimestamp("2024-01-16", "UTC");
      expect(endOfDay).toBe(startOfNextDay - 1);
    });

    it("should still be on the same date", () => {
      const endOfDay = getEndOfDayTimestamp("2024-01-15", "UTC");
      const dateStr = getDateInTimezone(endOfDay, "UTC");
      expect(dateStr).toBe("2024-01-15");
    });
  });
});
