"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  IconPlayerPlay,
  IconPlayerStop,
  IconChevronDown,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useTimer } from "@/hooks/use-timer";
import { formatDuration, formatTimerDisplay } from "@/lib/time-parser";
import { TimePopover } from "./time-popover";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TimePillProps {
  taskId: Id<"tasks">;
  totalTimeSeconds: number;
  className?: string;
}

export function TimePill({
  taskId,
  totalTimeSeconds,
  className,
}: TimePillProps) {
  const { runningEntry, elapsedSeconds, startTimer, stopTimer } = useTimer();
  const createManualEntry = useMutation(api.timeEntries.createManual);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const isThisTaskRunning = runningEntry?.taskId === taskId;

  // Calculate display time: total + elapsed if this task is running
  const displaySeconds = isThisTaskRunning
    ? totalTimeSeconds + elapsedSeconds
    : totalTimeSeconds;

  const handlePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      if (isThisTaskRunning) {
        await stopTimer();
      } else {
        await startTimer(taskId);
      }
    } catch {
      // Error already handled in hook
    }
  };

  const handleAddTime = async (seconds: number) => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];
      await createManualEntry({
        taskId,
        date: today,
        durationSeconds: seconds,
      });
      toast.success(`Added ${formatDuration(seconds)}`);
    } catch {
      toast.error("Failed to add time");
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-all",
        isThisTaskRunning
          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
          : "bg-muted/50 hover:bg-muted",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handlePlayPause}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
          isThisTaskRunning
            ? "bg-white/20 hover:bg-white/30"
            : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
        )}
      >
        {isThisTaskRunning ? (
          <IconPlayerStop className="h-3 w-3" />
        ) : (
          <IconPlayerPlay className="h-3 w-3" />
        )}
      </button>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-0.5 text-sm font-medium tabular-nums",
              isThisTaskRunning ? "text-white" : "text-foreground"
            )}
          >
            <span>
              {isThisTaskRunning
                ? formatTimerDisplay(elapsedSeconds)
                : formatDuration(displaySeconds)}
            </span>
            <IconChevronDown
              className={cn(
                "h-3 w-3",
                isThisTaskRunning ? "text-white/60" : "text-muted-foreground"
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <TimePopover
            taskId={taskId}
            totalSeconds={displaySeconds}
            onAddTime={handleAddTime}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
