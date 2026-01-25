import { describe, expect, it } from "vitest";
import { parseTimeInput, formatDuration, formatTimerDisplay } from "./time-parser";

describe("parseTimeInput", () => {
  describe("simple number (defaults to minutes)", () => {
    it("should parse plain number as minutes", () => {
      const result = parseTimeInput("30");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(30 * 60);
      expect(result.formatted).toBe("30m");
    });

    it("should parse decimal number as minutes", () => {
      const result = parseTimeInput("1.5");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(90); // 1.5 minutes = 90 seconds
    });
  });

  describe("minutes (m)", () => {
    it("should parse '30m'", () => {
      const result = parseTimeInput("30m");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(30 * 60);
      expect(result.formatted).toBe("30m");
    });

    it("should parse '30 m' with space", () => {
      const result = parseTimeInput("30 m");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(30 * 60);
    });

    it("should parse '45M' case insensitive", () => {
      const result = parseTimeInput("45M");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(45 * 60);
    });
  });

  describe("hours (h)", () => {
    it("should parse '2h'", () => {
      const result = parseTimeInput("2h");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(2 * 60 * 60);
      expect(result.formatted).toBe("2h");
    });

    it("should parse '2 h' with space", () => {
      const result = parseTimeInput("2 h");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(2 * 60 * 60);
    });

    it("should parse '1.5h' as 1 hour 30 minutes", () => {
      const result = parseTimeInput("1.5h");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(90 * 60); // 90 minutes
      expect(result.formatted).toBe("1h 30m");
    });

    it("should parse '0.5h' as 30 minutes", () => {
      const result = parseTimeInput("0.5h");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(30 * 60);
      expect(result.formatted).toBe("30m");
    });
  });

  describe("days (d)", () => {
    it("should parse '1d'", () => {
      const result = parseTimeInput("1d");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(24 * 60 * 60);
      expect(result.formatted).toBe("1d");
    });

    it("should parse '8d'", () => {
      const result = parseTimeInput("8d");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(8 * 24 * 60 * 60);
      expect(result.formatted).toBe("8d");
    });

    it("should parse '0.5d' as 12 hours", () => {
      const result = parseTimeInput("0.5d");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(12 * 60 * 60);
      expect(result.formatted).toBe("12h");
    });
  });

  describe("compound times", () => {
    it("should parse '1h 30m'", () => {
      const result = parseTimeInput("1h 30m");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(90 * 60);
      expect(result.formatted).toBe("1h 30m");
    });

    it("should parse '1h30m' without space", () => {
      const result = parseTimeInput("1h30m");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(90 * 60);
    });

    it("should parse '2h 45m'", () => {
      const result = parseTimeInput("2h 45m");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(2 * 60 * 60 + 45 * 60);
      expect(result.formatted).toBe("2h 45m");
    });

    it("should parse '1d 4h'", () => {
      const result = parseTimeInput("1d 4h");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(28 * 60 * 60); // 24 + 4 hours
      expect(result.formatted).toBe("1d 4h");
    });

    it("should parse '2d 4h 30m'", () => {
      const result = parseTimeInput("2d 4h 30m");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(2 * 24 * 60 * 60 + 4 * 60 * 60 + 30 * 60);
      expect(result.formatted).toBe("2d 4h 30m");
    });
  });

  describe("edge cases and validation", () => {
    it("should handle empty string", () => {
      const result = parseTimeInput("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle whitespace only", () => {
      const result = parseTimeInput("   ");
      expect(result.isValid).toBe(false);
    });

    it("should handle zero", () => {
      const result = parseTimeInput("0");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("positive");
    });

    it("should handle negative numbers", () => {
      const result = parseTimeInput("-30m");
      expect(result.isValid).toBe(false);
    });

    it("should handle invalid format", () => {
      const result = parseTimeInput("abc");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("should handle mixed case", () => {
      const result = parseTimeInput("1H 30M");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(90 * 60);
    });

    it("should trim whitespace", () => {
      const result = parseTimeInput("  2h  ");
      expect(result.isValid).toBe(true);
      expect(result.seconds).toBe(2 * 60 * 60);
    });
  });
});

describe("formatDuration", () => {
  it("should return '-' for 0", () => {
    expect(formatDuration(0)).toBe("-");
  });

  it("should return '<1m' for less than 60 seconds", () => {
    expect(formatDuration(30)).toBe("<1m");
    expect(formatDuration(59)).toBe("<1m");
  });

  it("should format minutes only", () => {
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(30 * 60)).toBe("30m");
    expect(formatDuration(59 * 60)).toBe("59m");
  });

  it("should format hours only", () => {
    expect(formatDuration(60 * 60)).toBe("1h");
    expect(formatDuration(2 * 60 * 60)).toBe("2h");
  });

  it("should format hours and minutes", () => {
    expect(formatDuration(90 * 60)).toBe("1h 30m");
    expect(formatDuration(2 * 60 * 60 + 45 * 60)).toBe("2h 45m");
  });

  it("should format days only", () => {
    expect(formatDuration(24 * 60 * 60)).toBe("1d");
    expect(formatDuration(3 * 24 * 60 * 60)).toBe("3d");
  });

  it("should format days and hours", () => {
    expect(formatDuration(24 * 60 * 60 + 4 * 60 * 60)).toBe("1d 4h");
  });

  it("should format days, hours, and minutes", () => {
    expect(formatDuration(2 * 24 * 60 * 60 + 4 * 60 * 60 + 30 * 60)).toBe("2d 4h 30m");
  });
});

describe("formatTimerDisplay", () => {
  it("should handle negative values by treating as 0", () => {
    expect(formatTimerDisplay(-1)).toBe("0:00");
    expect(formatTimerDisplay(-100)).toBe("0:00");
  });

  it("should format MM:SS when under 1 hour", () => {
    expect(formatTimerDisplay(0)).toBe("0:00");
    expect(formatTimerDisplay(59)).toBe("0:59");
    expect(formatTimerDisplay(60)).toBe("1:00");
    expect(formatTimerDisplay(599)).toBe("9:59");
    expect(formatTimerDisplay(3599)).toBe("59:59");
  });

  it("should format HH:MM:SS when 1+ hours", () => {
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
