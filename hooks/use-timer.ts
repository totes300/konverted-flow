"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// Re-export formatting functions from the centralized utility
export { formatDuration, formatTimerDisplay } from "@/lib/time-parser";

/**
 * Hook for managing timer state.
 * Subscribes to the running timer via Convex and provides controls.
 */
export function useTimer() {
  const runningData = useQuery(api.timeEntries.getRunning);
  const startTimerMutation = useMutation(api.timeEntries.startTimer);
  const stopTimerMutation = useMutation(api.timeEntries.stopTimer);

  // Local state for elapsed seconds (updated every second)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Calculate elapsed time from startTime
  useEffect(() => {
    if (!runningData?.entry?.startTime) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = runningData.entry.startTime;

    // Calculate initial elapsed time (ensure non-negative due to clock sync issues)
    const calculateElapsed = () => {
      return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    };

    setElapsedSeconds(calculateElapsed());

    // Update every second
    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [runningData?.entry?.startTime]);

  const startTimer = useCallback(
    async (taskId: Id<"tasks">) => {
      try {
        await startTimerMutation({ taskId });
      } catch (error) {
        console.error("Failed to start timer:", error);
        toast.error("Failed to start timer");
        throw error;
      }
    },
    [startTimerMutation]
  );

  const stopTimer = useCallback(async () => {
    try {
      await stopTimerMutation();
      toast.success("Timer stopped");
    } catch (error) {
      console.error("Failed to stop timer:", error);
      toast.error("Failed to stop timer");
      throw error;
    }
  }, [stopTimerMutation]);

  return {
    runningEntry: runningData?.entry ?? null,
    runningTask: runningData?.task ?? null,
    elapsedSeconds,
    isRunning: !!runningData?.entry?.isRunning,
    isLoading: runningData === undefined,
    startTimer,
    stopTimer,
  };
}
