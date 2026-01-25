import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatSecondsForEdit,
  formatSecondsAsDecimalHours,
  parseDurationToSeconds,
  formatCategory,
  generateReportName,
  formatDateRange,
  isValidDateRange,
  formatDateToYMD,
  getDateRangePresets,
  getCategoryOptions,
  getCurrencyOptions,
} from "./report-utils";

describe("formatCurrency", () => {
  it("formats USD correctly", () => {
    expect(formatCurrency(100, "USD")).toBe("$100.00");
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
    expect(formatCurrency(0, "USD")).toBe("$0.00");
  });

  it("formats EUR correctly", () => {
    expect(formatCurrency(100, "EUR")).toMatch(/100,00/);
    expect(formatCurrency(1234.56, "EUR")).toMatch(/1\.234,56/);
  });

  it("formats HUF correctly (no decimals)", () => {
    expect(formatCurrency(100, "HUF")).toMatch(/100/);
    expect(formatCurrency(1234, "HUF")).toMatch(/1[\s\u00A0]?234/);
  });

  it("defaults to USD when currency not specified", () => {
    expect(formatCurrency(100)).toBe("$100.00");
  });

  it("handles negative numbers", () => {
    expect(formatCurrency(-50, "USD")).toBe("-$50.00");
  });
});

describe("formatSecondsForEdit", () => {
  it("formats zero seconds", () => {
    expect(formatSecondsForEdit(0)).toBe("0m");
  });

  it("formats negative seconds as zero", () => {
    expect(formatSecondsForEdit(-100)).toBe("0m");
  });

  it("formats minutes only", () => {
    expect(formatSecondsForEdit(60)).toBe("1m");
    expect(formatSecondsForEdit(1800)).toBe("30m");
    expect(formatSecondsForEdit(3540)).toBe("59m");
  });

  it("formats hours only", () => {
    expect(formatSecondsForEdit(3600)).toBe("1h");
    expect(formatSecondsForEdit(7200)).toBe("2h");
  });

  it("formats hours and minutes", () => {
    expect(formatSecondsForEdit(3660)).toBe("1h 1m");
    expect(formatSecondsForEdit(5400)).toBe("1h 30m");
    expect(formatSecondsForEdit(9000)).toBe("2h 30m");
  });

  it("truncates seconds (no rounding)", () => {
    expect(formatSecondsForEdit(3659)).toBe("1h"); // 59 seconds ignored, 0 minutes omitted
    expect(formatSecondsForEdit(90)).toBe("1m"); // 30 seconds ignored
  });
});

describe("formatSecondsAsDecimalHours", () => {
  it("formats zero seconds", () => {
    expect(formatSecondsAsDecimalHours(0)).toBe("0.00");
  });

  it("formats negative seconds as zero", () => {
    expect(formatSecondsAsDecimalHours(-100)).toBe("0.00");
  });

  it("formats whole hours", () => {
    expect(formatSecondsAsDecimalHours(3600)).toBe("1.00");
    expect(formatSecondsAsDecimalHours(7200)).toBe("2.00");
  });

  it("formats fractional hours", () => {
    expect(formatSecondsAsDecimalHours(5400)).toBe("1.50");
    expect(formatSecondsAsDecimalHours(9000)).toBe("2.50");
    expect(formatSecondsAsDecimalHours(2700)).toBe("0.75");
  });

  it("handles large values", () => {
    expect(formatSecondsAsDecimalHours(360000)).toBe("100.00");
  });
});

describe("parseDurationToSeconds", () => {
  describe("decimal hours format", () => {
    it("parses whole numbers", () => {
      expect(parseDurationToSeconds("2")).toBe(7200);
      expect(parseDurationToSeconds("1")).toBe(3600);
      expect(parseDurationToSeconds("0")).toBe(0);
    });

    it("parses decimal numbers", () => {
      expect(parseDurationToSeconds("2.5")).toBe(9000);
      expect(parseDurationToSeconds("1.5")).toBe(5400);
      expect(parseDurationToSeconds("0.5")).toBe(1800);
      expect(parseDurationToSeconds("0.25")).toBe(900);
    });

    it("handles whitespace", () => {
      expect(parseDurationToSeconds("  2.5  ")).toBe(9000);
    });
  });

  describe("HH:MM format", () => {
    it("parses standard time format", () => {
      expect(parseDurationToSeconds("2:30")).toBe(9000);
      expect(parseDurationToSeconds("1:00")).toBe(3600);
      expect(parseDurationToSeconds("0:30")).toBe(1800);
      expect(parseDurationToSeconds("10:45")).toBe(38700);
    });

    it("rejects invalid minutes", () => {
      expect(parseDurationToSeconds("1:60")).toBe(null);
      expect(parseDurationToSeconds("1:99")).toBe(null);
    });

    it("rejects malformed time formats", () => {
      expect(parseDurationToSeconds("1:5")).toBe(null); // must be 2 digits
      expect(parseDurationToSeconds(":30")).toBe(null);
    });
  });

  describe("Xh Ym format", () => {
    it("parses hours only", () => {
      expect(parseDurationToSeconds("2h")).toBe(7200);
      expect(parseDurationToSeconds("1h")).toBe(3600);
      expect(parseDurationToSeconds("10h")).toBe(36000);
    });

    it("parses minutes only", () => {
      expect(parseDurationToSeconds("30m")).toBe(1800);
      expect(parseDurationToSeconds("45m")).toBe(2700);
      expect(parseDurationToSeconds("5m")).toBe(300);
    });

    it("parses hours and minutes", () => {
      expect(parseDurationToSeconds("2h 30m")).toBe(9000);
      expect(parseDurationToSeconds("1h 15m")).toBe(4500);
      expect(parseDurationToSeconds("2h30m")).toBe(9000); // no space
    });

    it("parses fractional hours", () => {
      expect(parseDurationToSeconds("1.5h")).toBe(5400);
      expect(parseDurationToSeconds("0.5h")).toBe(1800);
    });

    it("handles case insensitivity", () => {
      expect(parseDurationToSeconds("2H 30M")).toBe(9000);
      expect(parseDurationToSeconds("2H30M")).toBe(9000);
    });
  });

  describe("invalid inputs", () => {
    it("returns null for empty string", () => {
      expect(parseDurationToSeconds("")).toBe(null);
    });

    it("returns null for whitespace only", () => {
      expect(parseDurationToSeconds("   ")).toBe(null);
    });

    it("returns null for invalid formats", () => {
      expect(parseDurationToSeconds("abc")).toBe(null);
      expect(parseDurationToSeconds("two hours")).toBe(null);
      expect(parseDurationToSeconds("--5")).toBe(null);
    });

    it("returns null for negative numbers", () => {
      expect(parseDurationToSeconds("-2")).toBe(null);
      expect(parseDurationToSeconds("-1h")).toBe(null);
    });
  });

  describe("edge cases", () => {
    it("rounds to nearest second", () => {
      expect(parseDurationToSeconds("0.001")).toBe(4); // 0.001 * 3600 = 3.6 -> rounds to 4
    });

    it("handles very large values", () => {
      expect(parseDurationToSeconds("100")).toBe(360000);
      expect(parseDurationToSeconds("100h")).toBe(360000);
    });
  });
});

describe("formatCategory", () => {
  it("formats known categories", () => {
    expect(formatCategory("strategy")).toBe("Strategy");
    expect(formatCategory("design")).toBe("Design");
    expect(formatCategory("copywriting")).toBe("Copywriting");
    expect(formatCategory("development")).toBe("Development");
    expect(formatCategory("project_management")).toBe("Project Management");
  });

  it("returns empty string for undefined", () => {
    expect(formatCategory(undefined)).toBe("");
  });
});

describe("generateReportName", () => {
  it("generates name from client and date", () => {
    expect(generateReportName("Acme Corp", "2026-01-15")).toBe("Acme Corp - Jan 2026");
    expect(generateReportName("Test Client", "2026-06-01")).toBe("Test Client - Jun 2026");
    expect(generateReportName("Client", "2025-12-31")).toBe("Client - Dec 2025");
  });

  it("handles different months correctly", () => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    months.forEach((expected, index) => {
      const month = String(index + 1).padStart(2, "0");
      const result = generateReportName("Client", `2026-${month}-15`);
      expect(result).toContain(expected);
    });
  });
});

describe("formatDateRange", () => {
  it("formats same month and year", () => {
    expect(formatDateRange("2026-01-01", "2026-01-31")).toBe("Jan 1 - 31, 2026");
  });

  it("formats different months, same year", () => {
    expect(formatDateRange("2026-01-15", "2026-03-20")).toBe("Jan 15 - Mar 20, 2026");
  });

  it("formats different years", () => {
    expect(formatDateRange("2025-12-01", "2026-01-31")).toBe("Dec 1, 2025 - Jan 31, 2026");
  });

  it("handles single day range", () => {
    expect(formatDateRange("2026-01-15", "2026-01-15")).toBe("Jan 15 - 15, 2026");
  });
});

describe("isValidDateRange", () => {
  it("returns true for valid ranges", () => {
    expect(isValidDateRange("2026-01-01", "2026-01-31")).toBe(true);
    expect(isValidDateRange("2026-01-01", "2026-01-01")).toBe(true); // same day
    expect(isValidDateRange("2025-01-01", "2026-12-31")).toBe(true);
  });

  it("returns false for invalid ranges", () => {
    expect(isValidDateRange("2026-01-31", "2026-01-01")).toBe(false);
    expect(isValidDateRange("2026-12-31", "2025-01-01")).toBe(false);
  });
});

describe("formatDateToYMD", () => {
  it("formats date correctly", () => {
    expect(formatDateToYMD(new Date(2026, 0, 15))).toBe("2026-01-15");
    expect(formatDateToYMD(new Date(2026, 11, 31))).toBe("2026-12-31");
    expect(formatDateToYMD(new Date(2026, 5, 1))).toBe("2026-06-01");
  });

  it("pads single digit months and days", () => {
    expect(formatDateToYMD(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(formatDateToYMD(new Date(2026, 8, 5))).toBe("2026-09-05");
  });
});

describe("getDateRangePresets", () => {
  it("returns array of presets", () => {
    const presets = getDateRangePresets();
    expect(presets).toHaveLength(4);
    expect(presets.map(p => p.label)).toEqual([
      "This Week",
      "This Month",
      "Last Month",
      "Last Quarter",
    ]);
  });

  it("presets return valid date ranges", () => {
    const presets = getDateRangePresets();
    presets.forEach(preset => {
      const range = preset.getRange();
      expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(isValidDateRange(range.startDate, range.endDate)).toBe(true);
    });
  });
});

describe("getCategoryOptions", () => {
  it("returns all category options", () => {
    const options = getCategoryOptions();
    expect(options).toHaveLength(5);
    expect(options.map(o => o.value)).toEqual([
      "strategy",
      "design",
      "copywriting",
      "development",
      "project_management",
    ]);
    expect(options.every(o => typeof o.label === "string")).toBe(true);
  });
});

describe("getCurrencyOptions", () => {
  it("returns all currency options", () => {
    const options = getCurrencyOptions();
    expect(options).toHaveLength(3);
    expect(options.map(o => o.value)).toEqual(["USD", "EUR", "HUF"]);
    expect(options.every(o => typeof o.label === "string")).toBe(true);
  });
});
