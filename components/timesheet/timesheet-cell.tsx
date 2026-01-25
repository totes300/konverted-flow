"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TimesheetTaskItem } from "./timesheet-task-item";
import { formatDuration } from "@/lib/timesheet-utils";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 4;

interface TimeEntryWithTask {
  _id: Id<"timeEntries">;
  userId: Id<"users">;
  taskId: Id<"tasks">;
  date: string;
  durationSeconds: number;
  task: {
    _id: Id<"tasks">;
    title: string;
    isDeleted: boolean;
  } | null;
}

interface TimesheetCellProps {
  entries: TimeEntryWithTask[];
  onTaskClick: (taskId: Id<"tasks">) => void;
  isToday?: boolean;
  isWeekend?: boolean;
}

export function TimesheetCell({
  entries,
  onTaskClick,
  isToday,
  isWeekend,
}: TimesheetCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleEntries = isExpanded ? entries : entries.slice(0, MAX_VISIBLE);
  const hasMore = entries.length > MAX_VISIBLE;
  const hiddenCount = entries.length - MAX_VISIBLE;

  // Calculate total duration
  const totalSeconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0);

  // Empty cell - clean design
  if (entries.length === 0) {
    return (
      <td
        className={cn(
          "min-w-[140px] p-3 align-top border-l border-border/30",
          isWeekend && "bg-muted/30",
          isToday && "bg-primary/5"
        )}
      >
        {/* Empty cell - no content, just subtle background */}
      </td>
    );
  }

  return (
    <td
      className={cn(
        "min-w-[140px] p-3 align-top border-l border-border/30",
        isWeekend && "bg-muted/30",
        isToday && "bg-primary/5"
      )}
    >
      <div className="flex flex-col gap-2">
        {/* Task list */}
        <div className="space-y-1.5">
          {visibleEntries.map((entry) => (
            <TimesheetTaskItem
              key={entry._id}
              entry={entry}
              onTaskClick={() => onTaskClick(entry.taskId)}
            />
          ))}
        </div>

        {/* Expand/Collapse button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs w-full text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show less" : `+${hiddenCount} more`}
          </Button>
        )}

        {/* Daily total */}
        <div className="pt-2 mt-1 border-t border-border/50 text-sm font-semibold text-right tabular-nums">
          {formatDuration(totalSeconds)}
        </div>
      </div>
    </td>
  );
}
