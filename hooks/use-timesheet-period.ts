"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  TimesheetPeriod,
  getPeriodDates,
  getNextPeriodDate,
  getPreviousPeriodDate,
} from "@/lib/timesheet-utils";
import { format, parseISO, startOfWeek } from "date-fns";

export function useTimesheetPeriod() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse period from URL, default to "week"
  const period = useMemo<TimesheetPeriod>(() => {
    const p = searchParams.get("period");
    if (p === "biweek" || p === "month") return p;
    return "week";
  }, [searchParams]);

  // Parse base date from URL, default to start of current week
  const baseDate = useMemo(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      try {
        return parseISO(dateParam);
      } catch {
        // Invalid date, fall through to default
      }
    }
    // Default to start of current week
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  }, [searchParams]);

  // Calculate dates array for the current period
  const dates = useMemo(() => getPeriodDates(baseDate, period), [baseDate, period]);

  // Start and end dates
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // Update URL helper
  const updateUrl = useCallback(
    (newPeriod: TimesheetPeriod, newDate: Date) => {
      const params = new URLSearchParams(searchParams.toString());

      // Set period
      if (newPeriod !== "week") {
        params.set("period", newPeriod);
      } else {
        params.delete("period");
      }

      // Set date (start of week for the new date)
      const weekStart = startOfWeek(newDate, { weekStartsOn: 1 });
      const dateStr = format(weekStart, "yyyy-MM-dd");
      const todayWeekStart = format(
        startOfWeek(new Date(), { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );

      if (dateStr !== todayWeekStart) {
        params.set("date", dateStr);
      } else {
        params.delete("date");
      }

      // Preserve task param if present
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [searchParams, router, pathname]
  );

  // Set period (keep current date range)
  const setPeriod = useCallback(
    (newPeriod: TimesheetPeriod) => {
      updateUrl(newPeriod, baseDate);
    },
    [baseDate, updateUrl]
  );

  // Navigate to next period
  const navigateNext = useCallback(() => {
    const nextDate = getNextPeriodDate(baseDate, period);
    updateUrl(period, nextDate);
  }, [baseDate, period, updateUrl]);

  // Navigate to previous period
  const navigatePrevious = useCallback(() => {
    const prevDate = getPreviousPeriodDate(baseDate, period);
    updateUrl(period, prevDate);
  }, [baseDate, period, updateUrl]);

  // Navigate to today
  const goToToday = useCallback(() => {
    updateUrl(period, new Date());
  }, [period, updateUrl]);

  return {
    period,
    dates,
    startDate,
    endDate,
    baseDate,
    setPeriod,
    navigateNext,
    navigatePrevious,
    goToToday,
  };
}
