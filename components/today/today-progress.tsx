"use client";

import { IconCheck, IconConfetti } from "@tabler/icons-react";
import { formatDuration } from "@/lib/time-parser";
import { cn } from "@/lib/utils";

interface TodayProgressProps {
  completed: number;
  total: number;
  totalTimeToday?: number; // in seconds
}

export function TodayProgress({ completed, total, totalTimeToday = 0 }: TodayProgressProps): React.ReactElement | null {
  if (total === 0) {
    return null;
  }

  const percentage = Math.round((completed / total) * 100);
  const allDone = completed === total;

  return (
    <div className="flex items-center gap-4 py-2">
      {/* Left side: completion count + time */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
        <span className={cn("flex items-center gap-1", allDone && "text-green-600 dark:text-green-500")}>
          {allDone ? (
            <IconConfetti className="h-4 w-4" />
          ) : (
            <IconCheck className="h-4 w-4" />
          )}
          <span className="font-medium">
            {completed}/{total} done
          </span>
        </span>
        {totalTimeToday > 0 && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <span className="flex items-center gap-1">
              <span className="text-xs">⏱</span>
              {formatDuration(totalTimeToday)} today
            </span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              allDone ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground tabular-nums w-10 text-right">
          {percentage}%
        </span>
      </div>
    </div>
  );
}
