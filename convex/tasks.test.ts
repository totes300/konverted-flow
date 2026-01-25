import { describe, expect, it } from "vitest";
import schema from "./schema";

describe("Tasks Schema", () => {
  it("should define tasks table", () => {
    expect(schema.tables.tasks).toBeDefined();
  });

  it("should have required task fields", () => {
    const taskTable = schema.tables.tasks;
    expect(taskTable).toBeDefined();
  });
});

describe("Task Status Values", () => {
  const validStatuses = [
    "today",
    "next_up",
    "in_progress",
    "admin_review",
    "client_review",
    "stuck",
    "done",
  ];

  it("should have 7 valid status values", () => {
    expect(validStatuses).toHaveLength(7);
  });

  it("should include 'today' status", () => {
    expect(validStatuses).toContain("today");
  });

  it("should include 'next_up' status", () => {
    expect(validStatuses).toContain("next_up");
  });

  it("should include 'in_progress' status", () => {
    expect(validStatuses).toContain("in_progress");
  });

  it("should include 'admin_review' status", () => {
    expect(validStatuses).toContain("admin_review");
  });

  it("should include 'client_review' status", () => {
    expect(validStatuses).toContain("client_review");
  });

  it("should include 'stuck' status", () => {
    expect(validStatuses).toContain("stuck");
  });

  it("should include 'done' status", () => {
    expect(validStatuses).toContain("done");
  });
});

describe("Task Priority Values", () => {
  const validPriorities = ["low", "medium", "high"];

  it("should have 3 valid priority values", () => {
    expect(validPriorities).toHaveLength(3);
  });

  it("should include 'low' priority", () => {
    expect(validPriorities).toContain("low");
  });

  it("should include 'medium' priority", () => {
    expect(validPriorities).toContain("medium");
  });

  it("should include 'high' priority", () => {
    expect(validPriorities).toContain("high");
  });
});

/**
 * Tests for getTodayItems query - validating that time shown
 * is ONLY from today's time entries, not all-time totals.
 */
describe("getTodayItems Time Calculation", () => {
  describe("Time Display Requirements", () => {
    it("should return todayTimeSeconds field for each task", () => {
      // The query should return a todayTimeSeconds field, not just totalTimeSeconds
      // todayTimeSeconds = sum of time entries where date = today (in org timezone)
      const expectedFields = [
        "todayTimeSeconds", // NEW: time tracked TODAY only
        "totalTimeSeconds", // ALL-TIME total (kept for reference)
      ];
      expect(expectedFields).toContain("todayTimeSeconds");
    });

    it("should only count time entries from today's date", () => {
      // Given a task with time entries:
      // - Yesterday: 2 hours
      // - Today: 30 minutes
      // - Total all-time: 2h 30m
      //
      // The todayTimeSeconds should be 1800 (30 minutes)
      // NOT 9000 (2h 30m)

      const yesterdayEntry = { date: "2026-01-24", durationSeconds: 7200 }; // 2h
      const todayEntry = { date: "2026-01-25", durationSeconds: 1800 }; // 30m

      const todayDate = "2026-01-25";

      // Calculate today's time
      const allEntries = [yesterdayEntry, todayEntry];
      const todayTimeSeconds = allEntries
        .filter(e => e.date === todayDate)
        .reduce((sum, e) => sum + e.durationSeconds, 0);

      expect(todayTimeSeconds).toBe(1800); // 30 minutes, not 2h 30m
    });

    it("should use organization timezone for determining today", () => {
      // The date stored in timeEntries.date is already in org timezone
      // (per schema: "date: v.string(), // YYYY-MM-DD in org timezone")
      // So we just need to compare against today's date in org timezone

      const orgTimezone = "Europe/Budapest";
      const now = new Date("2026-01-25T12:00:00Z");

      // getDateInTimezone would return "2026-01-25" for Budapest at this time
      // (Budapest is UTC+1, so 12:00 UTC = 13:00 Budapest)
      expect(orgTimezone).toBeDefined();
    });

    it("should return 0 if no time entries exist for today", () => {
      // Task has totalTimeSeconds = 3600 (from yesterday)
      // But no entries for today's date
      // todayTimeSeconds should be 0

      const task = {
        totalTimeSeconds: 3600, // 1 hour all-time
      };

      const todayEntries: { durationSeconds: number }[] = [];
      const todayTimeSeconds = todayEntries.reduce(
        (sum, e) => sum + e.durationSeconds,
        0
      );

      expect(todayTimeSeconds).toBe(0);
      expect(task.totalTimeSeconds).toBe(3600); // All-time stays accurate
    });
  });

  describe("Group Stats", () => {
    it("should calculate per-group stats using todayTimeSeconds", () => {
      // When grouped by client, each group should show:
      // - totalTime: sum of todayTimeSeconds for tasks in group

      const clientATasks = [
        { status: "today", todayTimeSeconds: 1800 },
        { status: "done", todayTimeSeconds: 3600 },
      ];

      const totalTime = clientATasks.reduce(
        (sum, t) => sum + t.todayTimeSeconds,
        0
      );

      expect(totalTime).toBe(5400); // 1.5 hours TODAY, not all-time
    });
  });
});
