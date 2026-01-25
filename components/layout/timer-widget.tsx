"use client";

import { Button } from "@/components/ui/button";
import { IconPlayerStop, IconClock } from "@tabler/icons-react";
import { useTimer, formatTimerDisplay } from "@/hooks/use-timer";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Timer widget displays the currently running timer in the header.
 * Shows task title and elapsed time with stop button.
 * Clicking the task title opens the task popup.
 */
export function TimerWidget() {
  const { runningTask, elapsedSeconds, isRunning, isLoading, stopTimer } = useTimer();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Don't render anything if no timer running or still loading
  if (isLoading || !isRunning || !runningTask) {
    return null;
  }

  const handleTaskClick = () => {
    // Navigate to tasks page with task popup open
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", runningTask._id);

    if (pathname === "/tasks") {
      router.push(`/tasks?${params.toString()}`);
    } else {
      router.push(`/tasks?task=${runningTask._id}`);
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await stopTimer();
    } catch {
      // Error already handled in hook
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5",
        "border border-primary/20",
        "animate-pulse"
      )}
    >
      <IconClock className="h-4 w-4 text-primary" />

      {/* Timer display */}
      <span className="font-mono text-sm font-medium text-primary tabular-nums">
        {formatTimerDisplay(elapsedSeconds)}
      </span>

      {/* Task title (clickable) */}
      <button
        onClick={handleTaskClick}
        className="max-w-[150px] truncate text-sm text-primary hover:underline"
        title={runningTask.title}
      >
        {runningTask.title}
      </button>

      {/* Stop button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-primary hover:bg-primary/20 hover:text-primary"
        onClick={handleStop}
        title="Stop timer"
      >
        <IconPlayerStop className="h-4 w-4" />
      </Button>
    </div>
  );
}
