"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportTable, ReportTableEntry } from "../report-table";
import { Currency, TaskCategory, ReportEntry } from "@/lib/report-utils";

interface ReportPreviewProps {
  clientId: Id<"clients">;
  startDate: string;
  endDate: string;
  onEntriesChange: (entries: ReportEntry[]) => void;
  onTotalsChange: (totalSeconds: number, totalAmount: number) => void;
}

/**
 * Report preview component for the wizard.
 * Displays tasks with time entries for the selected date range,
 * allowing time adjustments before creating the report.
 */
export function ReportPreview({
  clientId,
  startDate,
  endDate,
  onEntriesChange,
  onTotalsChange,
}: ReportPreviewProps) {
  const reportData = useQuery(api.reports.getReportData, {
    clientId,
    startDate,
    endDate,
  });

  const [entries, setEntries] = useState<Map<Id<"tasks">, ReportTableEntry>>(
    new Map()
  );

  // Track the data key to detect when report data actually changes
  const lastDataKeyRef = useRef<string | null>(null);

  // Create a stable data key from report data
  const dataKey = useMemo(() => {
    if (!reportData) return null;
    return `${reportData.client._id}-${reportData.startDate}-${reportData.endDate}-${reportData.groupedTasks.length}`;
  }, [reportData]);

  // Initialize entries from report data - only when data actually changes
  useEffect(() => {
    if (!reportData || !dataKey) return;

    // Skip if already initialized with this data
    if (lastDataKeyRef.current === dataKey) return;
    lastDataKeyRef.current = dataKey;

    const newEntries = new Map<Id<"tasks">, ReportTableEntry>();

    for (const group of reportData.groupedTasks) {
      // Main task
      newEntries.set(group.mainTask._id, {
        taskId: group.mainTask._id,
        taskTitle: group.mainTask.title,
        taskDescription: group.mainTask.description,
        taskCategory: group.mainTask.category,
        originalSeconds: group.mainTask.timeSeconds,
        adjustedSeconds: group.mainTask.timeSeconds,
      });

      // Subtasks
      for (const subtask of group.subtasks) {
        newEntries.set(subtask._id, {
          taskId: subtask._id,
          taskTitle: subtask.title,
          taskDescription: subtask.description,
          taskCategory: subtask.category,
          parentTaskId: group.mainTask._id,
          parentTaskTitle: group.mainTask.title,
          originalSeconds: subtask.timeSeconds,
          adjustedSeconds: subtask.timeSeconds,
        });
      }
    }

    setEntries(newEntries);
  }, [reportData, dataKey]);

  // Memoize computed values to prevent unnecessary re-renders
  const { reportEntries, totalSeconds, totalAmount } = useMemo(() => {
    if (!reportData || entries.size === 0) {
      return { reportEntries: [], totalSeconds: 0, totalAmount: 0 };
    }

    const reportEntries: ReportEntry[] = Array.from(entries.values()).map(
      (entry) => ({
        taskId: entry.taskId,
        taskTitle: entry.taskTitle,
        taskDescription: entry.taskDescription,
        taskCategory: entry.taskCategory,
        parentTaskId: entry.parentTaskId,
        parentTaskTitle: entry.parentTaskTitle,
        originalSeconds: entry.originalSeconds,
        adjustedSeconds: entry.adjustedSeconds,
      })
    );

    const totalSeconds = reportEntries.reduce(
      (sum, entry) => sum + entry.adjustedSeconds,
      0
    );
    const hourlyRate = reportData.client.defaultHourlyRate || 0;
    const totalAmount = (totalSeconds / 3600) * hourlyRate;

    return { reportEntries, totalSeconds, totalAmount };
  }, [entries, reportData]);

  // Notify parent of changes - uses refs to avoid stale closures
  const onEntriesChangeRef = useRef(onEntriesChange);
  const onTotalsChangeRef = useRef(onTotalsChange);

  useEffect(() => {
    onEntriesChangeRef.current = onEntriesChange;
    onTotalsChangeRef.current = onTotalsChange;
  });

  useEffect(() => {
    if (reportEntries.length === 0) return;
    onEntriesChangeRef.current(reportEntries);
    onTotalsChangeRef.current(totalSeconds, totalAmount);
  }, [reportEntries, totalSeconds, totalAmount]);

  const handleEntryChange = useCallback(
    (taskId: Id<"tasks">, adjustedSeconds: number) => {
      setEntries((prev) => {
        const newEntries = new Map(prev);
        const entry = newEntries.get(taskId);
        if (entry) {
          newEntries.set(taskId, {
            ...entry,
            adjustedSeconds,
          });
        }
        return newEntries;
      });
    },
    []
  );

  const handleResetEntry = useCallback((taskId: Id<"tasks">) => {
    setEntries((prev) => {
      const newEntries = new Map(prev);
      const entry = newEntries.get(taskId);
      if (entry) {
        newEntries.set(taskId, {
          ...entry,
          adjustedSeconds: entry.originalSeconds,
        });
      }
      return newEntries;
    });
  }, []);

  if (!reportData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const currency = (reportData.client.currency || "USD") as Currency;
  const hourlyRate = reportData.client.defaultHourlyRate || 0;

  return (
    <ReportTable
      entries={Array.from(entries.values())}
      currency={currency}
      hourlyRate={hourlyRate}
      onEntryChange={handleEntryChange}
      onResetEntry={handleResetEntry}
    />
  );
}
