// Re-export types from convex for client-side use
export type { Currency, TaskCategory, ReportEntry } from "@/convex/types";
export { CURRENCIES, TASK_CATEGORIES, CATEGORY_LABELS, CURRENCY_LABELS } from "@/convex/types";

import type { Currency, TaskCategory } from "@/convex/types";
import { CATEGORY_LABELS, CURRENCY_LABELS } from "@/convex/types";

/**
 * Format amount with currency symbol.
 */
export function formatCurrency(amount: number, currency: Currency = "USD"): string {
  const formatter = new Intl.NumberFormat(
    currency === "HUF" ? "hu-HU" : currency === "EUR" ? "de-DE" : "en-US",
    {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "HUF" ? 0 : 2,
      maximumFractionDigits: currency === "HUF" ? 0 : 2,
    }
  );
  return formatter.format(amount);
}

/**
 * Format seconds to human-readable format for display/editing.
 * Example: 9000 -> "2h 30m"
 */
export function formatSecondsForEdit(seconds: number): string {
  if (seconds === 0) return "0m";
  if (seconds < 0) return "0m";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Format seconds to decimal hours string.
 * Example: 9000 -> "2.50"
 */
export function formatSecondsAsDecimalHours(seconds: number): string {
  const hours = Math.max(0, seconds) / 3600;
  return hours.toFixed(2);
}

/**
 * Parse duration string to seconds.
 * Supports: "2h 30m", "2h30m", "2.5", "150m", "2h", "2:30"
 * Returns null for invalid input.
 */
export function parseDurationToSeconds(input: string): number | null {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) return null;

  // Try parsing as decimal hours (e.g., "2.5")
  if (/^[\d.]+$/.test(trimmed)) {
    const hours = parseFloat(trimmed);
    if (!isNaN(hours) && hours >= 0) {
      return Math.round(hours * 3600);
    }
    return null;
  }

  // Try parsing as "HH:MM" format
  if (/^\d+:\d{2}$/.test(trimmed)) {
    const [hoursStr, minutesStr] = trimmed.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (!isNaN(hours) && !isNaN(minutes) && minutes < 60 && hours >= 0) {
      return hours * 3600 + minutes * 60;
    }
    return null;
  }

  // Try parsing as "Xh Ym" or "Xh" or "Ym" format
  // Reject if input starts with a negative sign
  if (trimmed.startsWith("-")) return null;

  let totalSeconds = 0;
  let foundMatch = false;

  const hoursMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
  if (hoursMatch) {
    const hours = parseFloat(hoursMatch[1]);
    if (hours >= 0) {
      totalSeconds += hours * 3600;
      foundMatch = true;
    }
  }

  const minutesMatch = trimmed.match(/(\d+)\s*m/);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1], 10);
    if (minutes >= 0) {
      totalSeconds += minutes * 60;
      foundMatch = true;
    }
  }

  return foundMatch ? Math.round(totalSeconds) : null;
}

/**
 * Format category to display label.
 */
export function formatCategory(category: TaskCategory | undefined): string {
  if (!category) return "";
  return CATEGORY_LABELS[category];
}

/**
 * Get category options for select dropdowns.
 */
export function getCategoryOptions(): { value: TaskCategory; label: string }[] {
  return Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value: value as TaskCategory,
    label,
  }));
}

/**
 * Get currency options for select dropdowns.
 */
export function getCurrencyOptions(): { value: Currency; label: string }[] {
  return Object.entries(CURRENCY_LABELS).map(([value, label]) => ({
    value: value as Currency,
    label,
  }));
}

/**
 * Generate report name from client name and date range.
 * Example: "Acme Corp - Jan 2026"
 */
export function generateReportName(clientName: string, startDate: string): string {
  const date = new Date(startDate);
  const monthName = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${clientName} - ${monthName} ${year}`;
}

/**
 * Format date range for display.
 * Example: "Jan 1 - Jan 31, 2026"
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.toLocaleString("en-US", { month: "short" });
  const endMonth = end.toLocaleString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
  }

  if (startMonth !== endMonth) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endYear}`;
  }

  return `${startMonth} ${startDay} - ${endDay}, ${endYear}`;
}

/**
 * Validate date range (start <= end).
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  return startDate <= endDate;
}

/**
 * Get preset date ranges.
 */
export function getDateRangePresets(): {
  label: string;
  getRange: () => { startDate: string; endDate: string };
}[] {
  return [
    {
      label: "This Week",
      getRange: () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          startDate: formatDateToYMD(startOfWeek),
          endDate: formatDateToYMD(endOfWeek),
        };
      },
    },
    {
      label: "This Month",
      getRange: () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          startDate: formatDateToYMD(startOfMonth),
          endDate: formatDateToYMD(endOfMonth),
        };
      },
    },
    {
      label: "Last Month",
      getRange: () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          startDate: formatDateToYMD(startOfMonth),
          endDate: formatDateToYMD(endOfMonth),
        };
      },
    },
    {
      label: "Last Quarter",
      getRange: () => {
        const now = new Date();
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const startMonth = lastQuarter * 3;
        const startOfQuarter = new Date(year, startMonth, 1);
        const endOfQuarter = new Date(year, startMonth + 3, 0);
        return {
          startDate: formatDateToYMD(startOfQuarter),
          endDate: formatDateToYMD(endOfQuarter),
        };
      },
    },
  ];
}

/**
 * Format date to YYYY-MM-DD string.
 */
export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Legacy aliases for backward compatibility
export const formatDurationForEdit = formatSecondsForEdit;
export const formatDurationAsHours = formatSecondsAsDecimalHours;
export const parseDurationFromEdit = parseDurationToSeconds;
