"use client";

import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTimesheetPeriod } from "@/hooks/use-timesheet-period";
import { formatDateRange } from "@/lib/timesheet-utils";
import { TimesheetHeader } from "@/components/timesheet/timesheet-header";
import { TimesheetGrid } from "@/components/timesheet/timesheet-grid";
import { TaskPopup } from "@/components/tasks/task-popup";

export default function TimesheetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Period state from URL
  const {
    period,
    dates,
    startDate,
    endDate,
    setPeriod,
    navigateNext,
    navigatePrevious,
    goToToday,
  } = useTimesheetPeriod();

  // Fetch timesheet data
  const data = useQuery(api.timesheet.getTimesheetData, {
    startDate,
    endDate,
  });

  // Task popup state from URL (same pattern as Today page)
  const taskIdParam = searchParams.get("task");
  const taskId = taskIdParam as Id<"tasks"> | null;

  const handleTaskClick = (id: Id<"tasks">) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", id);
    router.push(`/timesheet?${params.toString()}`);
  };

  const handlePopupClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");
    const newUrl = params.toString()
      ? `/timesheet?${params.toString()}`
      : "/timesheet";
    router.push(newUrl);
  };

  return (
    <>
      {/* Header with title + period controls */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Timesheet</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateRange(startDate, endDate)}
          </p>
        </div>
        <TimesheetHeader
          period={period}
          onPeriodChange={setPeriod}
          onNavigatePrevious={navigatePrevious}
          onNavigateNext={navigateNext}
          onGoToToday={goToToday}
        />
      </div>

      {/* Grid */}
      <div className="px-4 lg:px-6">
        <TimesheetGrid
          users={data?.users}
          entries={data?.entries}
          dates={dates}
          onTaskClick={handleTaskClick}
          isLoading={data === undefined}
        />
      </div>

      {/* Task Popup */}
      <TaskPopup
        taskId={taskId}
        open={taskId !== null}
        onOpenChange={(open) => {
          if (!open) handlePopupClose();
        }}
      />
    </>
  );
}
