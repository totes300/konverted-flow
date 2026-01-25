"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter, useSearchParams } from "next/navigation";
import { TodayList } from "@/components/today/today-list";
import { TodayFilters } from "@/components/today/today-filters";
import { TaskPopup } from "@/components/tasks/task-popup";
import { useTodayFilters } from "@/hooks/use-today-filters";

export default function TodayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { filters } = useTodayFilters();

  // Task popup state from URL
  const taskIdParam = searchParams.get("task");
  const taskId = taskIdParam as Id<"tasks"> | null;

  // Query today items for progress calculation
  // Use assigneeId from filters
  const todayItems = useQuery(api.tasks.getTodayItems, {
    assigneeId: filters.assigneeId,
  });

  // Apply client filter for display calculations
  const filteredItems = todayItems
    ? filters.clientId
      ? todayItems.filter((t) => t.clientId === filters.clientId)
      : todayItems
    : [];

  // Calculate progress
  const completedCount = filteredItems.filter((t) => t.status === "done").length;
  const totalCount = filteredItems.length;

  // Calculate total time tracked TODAY (not all-time)
  const totalTimeToday = filteredItems.reduce(
    (sum, task) => sum + (task.todayTimeSeconds || 0),
    0
  );

  const handlePopupClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");
    const newUrl = params.toString() ? `/today?${params.toString()}` : "/today";
    router.push(newUrl);
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">
            Focus on what needs to be done today.
          </p>
        </div>
      </div>

      {/* Filter bar with stats */}
      <div className="px-4 lg:px-6">
        <TodayFilters
          completedCount={completedCount}
          totalCount={totalCount}
          totalTimeToday={totalTimeToday}
          isGrouped={filters.groupBy !== "none"}
        />
      </div>

      {/* Task list */}
      <div className="px-4 lg:px-6">
        <TodayList
          assigneeId={filters.assigneeId}
          clientId={filters.clientId}
          groupBy={filters.groupBy}
        />
      </div>

      {/* Task Popup */}
      <TaskPopup
        taskId={taskId}
        open={taskId !== null}
        onOpenChange={(open) => {
          if (!open) {
            handlePopupClose();
          }
        }}
      />
    </>
  );
}
