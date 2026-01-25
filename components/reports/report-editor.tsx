"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatDateRange, Currency, ReportEntry } from "@/lib/report-utils";
import { ReportTable, ReportTableEntry } from "./report-table";

interface ReportEditorProps {
  reportId: Id<"reports">;
}

export function ReportEditor({ reportId }: ReportEditorProps) {
  const router = useRouter();
  const report = useQuery(api.reports.getById, { id: reportId });
  const updateReport = useMutation(api.reports.update);

  // Store entries with both current and initial (saved) values for change tracking
  const [entries, setEntries] = useState<
    Map<Id<"tasks">, ReportTableEntry & { initialAdjustedSeconds: number }>
  >(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize entries from report data
  useEffect(() => {
    if (!report) return;

    const newEntries = new Map<
      Id<"tasks">,
      ReportTableEntry & { initialAdjustedSeconds: number }
    >();

    for (const entry of report.entries) {
      newEntries.set(entry.taskId, {
        taskId: entry.taskId,
        taskTitle: entry.taskTitle,
        taskDescription: entry.taskDescription,
        taskCategory: entry.taskCategory,
        parentTaskId: entry.parentTaskId,
        parentTaskTitle: entry.parentTaskTitle,
        originalSeconds: entry.originalSeconds,
        adjustedSeconds: entry.adjustedSeconds,
        initialAdjustedSeconds: entry.adjustedSeconds,
      });
    }

    setEntries(newEntries);
    setHasChanges(false);
  }, [report]);

  // Check for changes and track them
  useEffect(() => {
    let changed = false;
    for (const entry of entries.values()) {
      if (entry.adjustedSeconds !== entry.initialAdjustedSeconds) {
        changed = true;
        break;
      }
    }
    setHasChanges(changed);
  }, [entries]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

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

  const handleSave = async () => {
    if (!report) return;

    setIsSaving(true);
    try {
      // Build entries array with all snapshot data preserved
      const entriesArray: ReportEntry[] = Array.from(entries.values()).map(
        (e) => ({
          taskId: e.taskId,
          taskTitle: e.taskTitle,
          taskDescription: e.taskDescription,
          taskCategory: e.taskCategory,
          parentTaskId: e.parentTaskId,
          parentTaskTitle: e.parentTaskTitle,
          originalSeconds: e.originalSeconds,
          adjustedSeconds: e.adjustedSeconds,
        })
      );

      // Calculate new totals
      const totalSeconds = entriesArray.reduce(
        (sum, e) => sum + e.adjustedSeconds,
        0
      );
      const hourlyRate = report.clientHourlyRate || 0;
      const totalAmount = (totalSeconds / 3600) * hourlyRate;

      await updateReport({
        id: reportId,
        entries: entriesArray,
        totalSeconds,
        totalAmount,
      });

      // Update initial values to mark as saved
      setEntries((prev) => {
        const newEntries = new Map<
          Id<"tasks">,
          ReportTableEntry & { initialAdjustedSeconds: number }
        >();
        for (const [taskId, entry] of prev) {
          newEntries.set(taskId, {
            ...entry,
            initialAdjustedSeconds: entry.adjustedSeconds,
          });
        }
        return newEntries;
      });

      toast.success("Report saved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save report";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!report) {
    return (
      <div className="space-y-4 px-4 lg:px-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const currency = (report.clientCurrency || "USD") as Currency;
  const hourlyRate = report.clientHourlyRate || 0;

  // Convert entries map to array for ReportTable
  const tableEntries: ReportTableEntry[] = Array.from(entries.values()).map(
    (e) => ({
      taskId: e.taskId,
      taskTitle: e.taskTitle,
      taskDescription: e.taskDescription,
      taskCategory: e.taskCategory,
      parentTaskId: e.parentTaskId,
      parentTaskTitle: e.parentTaskTitle,
      originalSeconds: e.originalSeconds,
      adjustedSeconds: e.adjustedSeconds,
    })
  );

  return (
    <>
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/reports">
              <IconArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to reports</span>
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {report.name}
              </h1>
              {hasChanges && <Badge variant="secondary">Unsaved changes</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {report.clientName} &bull;{" "}
              {formatDateRange(report.startDate, report.endDate)}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <IconDeviceFloppy className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      <div className="px-4 lg:px-6">
        <ReportTable
          entries={tableEntries}
          currency={currency}
          hourlyRate={hourlyRate}
          onEntryChange={handleEntryChange}
          onResetEntry={handleResetEntry}
        />
      </div>
    </>
  );
}
