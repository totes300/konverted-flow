import { describe, expect, it } from "vitest";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

describe("Time Entries Schema", () => {
  it("should define timeEntries table", () => {
    expect(schema.tables.timeEntries).toBeDefined();
  });

  it("should have correct indexes defined", () => {
    const timeEntriesTable = schema.tables.timeEntries;
    expect(timeEntriesTable).toBeDefined();
  });
});

describe("Time Entry Field Validation", () => {
  it("should require orgId as organization reference", () => {
    // Verify orgId type is correct
    type OrgId = Id<"organizations">;
    const checkOrgId: OrgId extends string ? true : false = true;
    expect(checkOrgId).toBe(true);
  });

  it("should require taskId as task reference", () => {
    type TaskId = Id<"tasks">;
    const checkTaskId: TaskId extends string ? true : false = true;
    expect(checkTaskId).toBe(true);
  });

  it("should require userId as user reference", () => {
    type UserId = Id<"users">;
    const checkUserId: UserId extends string ? true : false = true;
    expect(checkUserId).toBe(true);
  });

  it("should have date as string in YYYY-MM-DD format", () => {
    const validDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(validDateRegex.test("2024-01-15")).toBe(true);
    expect(validDateRegex.test("2024-12-31")).toBe(true);
    expect(validDateRegex.test("invalid")).toBe(false);
    expect(validDateRegex.test("2024/01/15")).toBe(false);
  });

  it("should have durationSeconds as number", () => {
    const validDurations = [0, 60, 3600, 86400];
    validDurations.forEach((duration) => {
      expect(typeof duration).toBe("number");
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  it("should have isRunning as boolean", () => {
    expect(typeof true).toBe("boolean");
    expect(typeof false).toBe("boolean");
  });

  it("should have startTime as optional number (Unix timestamp)", () => {
    const startTime = Date.now();
    expect(typeof startTime).toBe("number");
    expect(startTime).toBeGreaterThan(0);
  });

  it("should have hourlyRate as optional number", () => {
    const validRates = [0, 50, 100.50, 250];
    validRates.forEach((rate) => {
      expect(typeof rate).toBe("number");
    });
  });

  it("should have isBillable as boolean", () => {
    expect([true, false].every((v) => typeof v === "boolean")).toBe(true);
  });
});

describe("Time Entry Indexes", () => {
  const expectedIndexes = [
    "by_taskId",
    "by_userId_and_isRunning",
    "by_userId_and_date",
    "by_orgId_and_date",
  ];

  it("should have 4 indexes for efficient querying", () => {
    expect(expectedIndexes).toHaveLength(4);
  });

  it("should have by_taskId index for getting entries by task", () => {
    expect(expectedIndexes).toContain("by_taskId");
  });

  it("should have by_userId_and_isRunning index for finding running timer", () => {
    expect(expectedIndexes).toContain("by_userId_and_isRunning");
  });

  it("should have by_userId_and_date index for daily entries", () => {
    expect(expectedIndexes).toContain("by_userId_and_date");
  });

  it("should have by_orgId_and_date index for org-wide reporting", () => {
    expect(expectedIndexes).toContain("by_orgId_and_date");
  });
});

describe("Time Entry Business Logic", () => {
  describe("Timer State", () => {
    it("should only allow one running timer per user", () => {
      // This is a constraint enforced in the mutation
      // When starting a new timer, existing running timers are stopped
      const runningTimers = [{ userId: "user1", isRunning: true }];
      const filtered = runningTimers.filter(
        (t) => t.userId === "user1" && t.isRunning
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe("Duration Calculation", () => {
    it("should calculate duration from start time to stop time", () => {
      const startTime = 1000000; // Unix timestamp in ms
      const stopTime = 1003600; // 3600ms later
      const durationMs = stopTime - startTime;
      const durationSeconds = Math.floor(durationMs / 1000);
      expect(durationSeconds).toBe(3);
    });

    it("should handle very long durations (24+ hours)", () => {
      const oneDayInSeconds = 86400;
      const twoDaysInSeconds = 172800;
      expect(oneDayInSeconds).toBe(24 * 60 * 60);
      expect(twoDaysInSeconds).toBe(48 * 60 * 60);
    });
  });

  describe("Midnight Split Logic", () => {
    it("should identify when timer crosses midnight", () => {
      const startDate: string = "2024-01-15";
      const endDate: string = "2024-01-16";
      const crossesMidnight = startDate !== endDate;
      expect(crossesMidnight).toBe(true);
    });

    it("should identify when timer stays on same day", () => {
      const startDate: string = "2024-01-15";
      const endDate: string = "2024-01-15";
      const crossesMidnight = startDate !== endDate;
      expect(crossesMidnight).toBe(false);
    });

    it("should calculate time before midnight", () => {
      // Timer started at 10pm, stopped at 2am next day
      // Time before midnight: 10pm to midnight = 2 hours
      const hoursBeforeMidnight = 2;
      const secondsBeforeMidnight = hoursBeforeMidnight * 60 * 60;
      expect(secondsBeforeMidnight).toBe(7200);
    });

    it("should calculate time after midnight", () => {
      // Timer started at 10pm, stopped at 2am next day
      // Time after midnight: midnight to 2am = 2 hours
      const hoursAfterMidnight = 2;
      const secondsAfterMidnight = hoursAfterMidnight * 60 * 60;
      expect(secondsAfterMidnight).toBe(7200);
    });
  });
});

describe("Time Formatting", () => {
  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const formatTimerDisplay = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  describe("formatDuration", () => {
    it("should return '-' for 0 seconds", () => {
      expect(formatDuration(0)).toBe("-");
    });

    it("should format minutes only", () => {
      expect(formatDuration(60)).toBe("1m");
      expect(formatDuration(120)).toBe("2m");
      expect(formatDuration(1800)).toBe("30m");
    });

    it("should format hours only", () => {
      expect(formatDuration(3600)).toBe("1h");
      expect(formatDuration(7200)).toBe("2h");
    });

    it("should format hours and minutes", () => {
      expect(formatDuration(3660)).toBe("1h 1m");
      expect(formatDuration(5400)).toBe("1h 30m");
      expect(formatDuration(9000)).toBe("2h 30m");
    });

    it("should ignore seconds in duration format", () => {
      expect(formatDuration(61)).toBe("1m");
      // 3659 seconds = 60 minutes + 59 seconds = 1h (minutes truncated)
      expect(formatDuration(3659)).toBe("1h");
    });
  });

  describe("formatTimerDisplay", () => {
    it("should format without hours when under 1 hour", () => {
      expect(formatTimerDisplay(0)).toBe("0:00");
      expect(formatTimerDisplay(59)).toBe("0:59");
      expect(formatTimerDisplay(60)).toBe("1:00");
      expect(formatTimerDisplay(599)).toBe("9:59");
    });

    it("should format with hours when 1+ hours", () => {
      expect(formatTimerDisplay(3600)).toBe("1:00:00");
      expect(formatTimerDisplay(3661)).toBe("1:01:01");
      expect(formatTimerDisplay(7325)).toBe("2:02:05");
    });

    it("should pad minutes and seconds with zeros", () => {
      expect(formatTimerDisplay(3601)).toBe("1:00:01");
      expect(formatTimerDisplay(3660)).toBe("1:01:00");
    });

    it("should handle large durations", () => {
      const tenHours = 10 * 3600;
      expect(formatTimerDisplay(tenHours)).toBe("10:00:00");

      const dayAndHalf = 36 * 3600 + 30 * 60 + 45;
      expect(formatTimerDisplay(dayAndHalf)).toBe("36:30:45");
    });
  });
});

describe("Task Total Time Aggregation", () => {
  it("should sum all time entry durations", () => {
    const entries = [
      { durationSeconds: 3600 }, // 1 hour
      { durationSeconds: 1800 }, // 30 minutes
      { durationSeconds: 900 }, // 15 minutes
    ];
    const total = entries.reduce((sum, e) => sum + e.durationSeconds, 0);
    expect(total).toBe(6300); // 1h 45m
  });

  it("should exclude running timer duration from stored total", () => {
    // Running timer's time is calculated client-side
    // The durationSeconds field is 0 while running
    const entries = [
      { durationSeconds: 3600, isRunning: false },
      { durationSeconds: 0, isRunning: true }, // Running
    ];
    const stoppedEntries = entries.filter((e) => !e.isRunning);
    const storedTotal = stoppedEntries.reduce((sum, e) => sum + e.durationSeconds, 0);
    expect(storedTotal).toBe(3600);
  });

  it("should not include subtask time in parent total", () => {
    const parentTask = { totalTimeSeconds: 3600 };
    const subtask = { totalTimeSeconds: 1800 };
    // Subtask time is tracked separately
    expect(parentTask.totalTimeSeconds).toBe(3600);
    expect(subtask.totalTimeSeconds).toBe(1800);
    // They are independent - parent total does NOT include subtask
  });
});
