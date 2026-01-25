"use client";

import { formatDuration } from "@/lib/timesheet-utils";
import { Id } from "@/convex/_generated/dataModel";

interface TimesheetTaskItemProps {
  entry: {
    _id: Id<"timeEntries">;
    taskId: Id<"tasks">;
    durationSeconds: number;
    task: {
      _id: Id<"tasks">;
      title: string;
      isDeleted: boolean;
    } | null;
  };
  onTaskClick: () => void;
}

export function TimesheetTaskItem({ entry, onTaskClick }: TimesheetTaskItemProps) {
  return (
    <button
      onClick={onTaskClick}
      className="group flex flex-col w-full text-left p-1.5 -mx-1.5 rounded-md
        hover:bg-muted/80 transition-colors"
    >
      <span className="text-xs font-medium text-foreground/90 line-clamp-2 group-hover:text-foreground">
        {entry.task?.title ?? "Unknown task"}
      </span>
      <span className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
        {formatDuration(entry.durationSeconds)}
      </span>
    </button>
  );
}
