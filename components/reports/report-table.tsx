"use client";

import { useState, useRef, useEffect, memo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconRotate } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  formatCurrency,
  formatSecondsForEdit,
  formatSecondsAsDecimalHours,
  parseDurationToSeconds,
  formatCategory,
  Currency,
  TaskCategory,
} from "@/lib/report-utils";

// ============================================
// Constants
// ============================================
const COLUMN_WIDTHS = {
  task: "w-[35%]",
  description: "w-[25%]",
  category: "w-[15%]",
  time: "w-[12%]",
  amount: "w-[13%]",
  subtotalLabel: "w-[75%]",
} as const;

// ============================================
// Types
// ============================================

/**
 * Entry data for the report table.
 * taskTitle is optional for backward compatibility with old reports.
 */
export interface ReportTableEntry {
  taskId: Id<"tasks">;
  taskTitle?: string;
  taskDescription?: string;
  taskCategory?: TaskCategory;
  parentTaskId?: Id<"tasks">;
  parentTaskTitle?: string;
  originalSeconds: number;
  adjustedSeconds: number;
}

interface ReportTableProps {
  entries: ReportTableEntry[];
  currency: Currency;
  hourlyRate: number;
  onEntryChange: (taskId: Id<"tasks">, adjustedSeconds: number) => void;
  onResetEntry?: (taskId: Id<"tasks">) => void;
  readOnly?: boolean;
}

// ============================================
// Editable Time Cell
// ============================================
interface EditableTimeCellProps {
  taskId: Id<"tasks">;
  originalSeconds: number;
  adjustedSeconds: number;
  onSave: (seconds: number) => void;
  onReset?: () => void;
  readOnly?: boolean;
}

const EditableTimeCell = memo(function EditableTimeCell({
  taskId,
  originalSeconds,
  adjustedSeconds,
  onSave,
  onReset,
  readOnly,
}: EditableTimeCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const wasAdjusted = adjustedSeconds !== originalSeconds;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (readOnly) return;
    setEditValue(formatSecondsForEdit(adjustedSeconds));
    setIsEditing(true);
  };

  const handleSave = () => {
    const parsed = parseDurationToSeconds(editValue);
    if (parsed === null) {
      toast.error("Invalid time format. Try: 2h 30m, 2.5, or 2:30");
      setEditValue(formatSecondsForEdit(adjustedSeconds));
    } else if (parsed < 0) {
      toast.error("Time cannot be negative");
      setEditValue(formatSecondsForEdit(adjustedSeconds));
    } else {
      onSave(parsed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue("");
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 w-20 text-right text-sm"
          aria-label="Edit time"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={handleClick}
        disabled={readOnly}
        className={cn(
          "text-sm px-2 py-1 rounded transition-colors text-right",
          !readOnly && "hover:bg-muted cursor-text",
          wasAdjusted && "text-primary font-medium",
          readOnly && "cursor-default"
        )}
        aria-label={`Time: ${formatSecondsForEdit(adjustedSeconds)}${wasAdjusted ? " (adjusted)" : ""}. ${!readOnly ? "Click to edit." : ""}`}
      >
        {formatSecondsForEdit(adjustedSeconds)}
        {wasAdjusted && " *"}
      </button>
      {wasAdjusted && onReset && !readOnly && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          aria-label="Reset to original time"
          title="Reset to original time"
        >
          <IconRotate className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
});

// ============================================
// Task Row Component
// ============================================
interface TaskRowProps {
  entry: ReportTableEntry;
  isSubtask?: boolean;
  currency: Currency;
  hourlyRate: number;
  onEntryChange: (taskId: Id<"tasks">, adjustedSeconds: number) => void;
  onResetEntry?: (taskId: Id<"tasks">) => void;
  readOnly?: boolean;
}

const TaskRow = memo(function TaskRow({
  entry,
  isSubtask = false,
  currency,
  hourlyRate,
  onEntryChange,
  onResetEntry,
  readOnly,
}: TaskRowProps) {
  const amount = (entry.adjustedSeconds / 3600) * hourlyRate;
  const taskTitle = entry.taskTitle ?? "Unknown Task";

  return (
    <div className={cn("flex", !isSubtask && "bg-muted/30")}>
      <div
        className={cn(
          COLUMN_WIDTHS.task,
          "py-4 px-4",
          isSubtask ? "pl-8" : "font-medium"
        )}
      >
        {taskTitle}
      </div>
      <div
        className={cn(
          COLUMN_WIDTHS.description,
          "py-4 px-4 text-sm text-muted-foreground truncate"
        )}
      >
        {entry.taskDescription || "-"}
      </div>
      <div className={cn(COLUMN_WIDTHS.category, "py-4 px-4 text-sm")}>
        {formatCategory(entry.taskCategory)}
      </div>
      <div className={cn(COLUMN_WIDTHS.time, "py-4 px-4")}>
        <EditableTimeCell
          taskId={entry.taskId}
          originalSeconds={entry.originalSeconds}
          adjustedSeconds={entry.adjustedSeconds}
          onSave={(seconds) => onEntryChange(entry.taskId, seconds)}
          onReset={onResetEntry ? () => onResetEntry(entry.taskId) : undefined}
          readOnly={readOnly}
        />
      </div>
      <div className={cn(COLUMN_WIDTHS.amount, "py-4 px-4 text-right text-sm")}>
        {formatCurrency(amount, currency)}
      </div>
    </div>
  );
});

// ============================================
// Group Subtotal Row
// ============================================
interface GroupSubtotalProps {
  taskTitle: string;
  groupSeconds: number;
  currency: Currency;
  hourlyRate: number;
}

const GroupSubtotal = memo(function GroupSubtotal({
  taskTitle,
  groupSeconds,
  currency,
  hourlyRate,
}: GroupSubtotalProps) {
  const groupAmount = (groupSeconds / 3600) * hourlyRate;

  return (
    <div className="flex bg-muted/10">
      <div
        className={cn(COLUMN_WIDTHS.subtotalLabel, "py-3 px-4 text-right font-medium")}
      >
        Subtotal: {taskTitle}
      </div>
      <div className={cn(COLUMN_WIDTHS.time, "py-3 px-4 text-right font-medium")}>
        {formatSecondsAsDecimalHours(groupSeconds)}h
      </div>
      <div className={cn(COLUMN_WIDTHS.amount, "py-3 px-4 text-right font-medium")}>
        {formatCurrency(groupAmount, currency)}
      </div>
    </div>
  );
});

// ============================================
// Main Report Table Component
// ============================================
export function ReportTable({
  entries,
  currency,
  hourlyRate,
  onEntryChange,
  onResetEntry,
  readOnly = false,
}: ReportTableProps) {
  // Group entries by parent task
  const mainTaskEntries = entries.filter((e) => !e.parentTaskId);
  const subtasksByParent = new Map<Id<"tasks">, ReportTableEntry[]>();

  for (const entry of entries) {
    if (entry.parentTaskId) {
      const siblings = subtasksByParent.get(entry.parentTaskId) || [];
      siblings.push(entry);
      subtasksByParent.set(entry.parentTaskId, siblings);
    }
  }

  // Calculate category totals
  const categoryTotals = new Map<TaskCategory, number>();
  for (const entry of entries) {
    if (entry.taskCategory) {
      const current = categoryTotals.get(entry.taskCategory) || 0;
      categoryTotals.set(entry.taskCategory, current + entry.adjustedSeconds);
    }
  }

  // Calculate grand total
  const totalSeconds = entries.reduce((sum, e) => sum + e.adjustedSeconds, 0);
  const totalAmount = (totalSeconds / 3600) * hourlyRate;

  // Handle empty state
  if (entries.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No tasks found for this report period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={COLUMN_WIDTHS.task}>Task</TableHead>
              <TableHead className={COLUMN_WIDTHS.description}>Description</TableHead>
              <TableHead className={COLUMN_WIDTHS.category}>Category</TableHead>
              <TableHead className={cn(COLUMN_WIDTHS.time, "text-right")}>
                Time
              </TableHead>
              <TableHead className={cn(COLUMN_WIDTHS.amount, "text-right")}>
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Task rows grouped by parent */}
            {mainTaskEntries.map((mainEntry) => {
              const subtasks = subtasksByParent.get(mainEntry.taskId) || [];
              const mainTaskTitle = mainEntry.taskTitle ?? "Unknown Task";

              // Calculate group subtotal
              const groupSeconds =
                mainEntry.adjustedSeconds +
                subtasks.reduce((sum, st) => sum + st.adjustedSeconds, 0);

              return (
                <TableRow key={mainEntry.taskId} className="group/task">
                  <TableCell colSpan={5} className="p-0">
                    <div className="divide-y">
                      {/* Main task */}
                      <TaskRow
                        entry={mainEntry}
                        currency={currency}
                        hourlyRate={hourlyRate}
                        onEntryChange={onEntryChange}
                        onResetEntry={onResetEntry}
                        readOnly={readOnly}
                      />

                      {/* Subtasks */}
                      {subtasks.map((subtask) => (
                        <TaskRow
                          key={subtask.taskId}
                          entry={subtask}
                          isSubtask
                          currency={currency}
                          hourlyRate={hourlyRate}
                          onEntryChange={onEntryChange}
                          onResetEntry={onResetEntry}
                          readOnly={readOnly}
                        />
                      ))}

                      {/* Group subtotal */}
                      {subtasks.length > 0 && (
                        <GroupSubtotal
                          taskTitle={mainTaskTitle}
                          groupSeconds={groupSeconds}
                          currency={currency}
                          hourlyRate={hourlyRate}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Category subtotals */}
            {categoryTotals.size > 0 && (
              <>
                <TableRow className="border-t-2">
                  <TableCell
                    colSpan={5}
                    className="font-semibold text-sm text-muted-foreground py-2"
                  >
                    By Category
                  </TableCell>
                </TableRow>
                {Array.from(categoryTotals.entries()).map(([category, seconds]) => {
                  const amount = (seconds / 3600) * hourlyRate;
                  return (
                    <TableRow key={category} className="bg-muted/20">
                      <TableCell colSpan={3} className="font-medium">
                        {formatCategory(category)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatSecondsAsDecimalHours(seconds)}h
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(amount, currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            )}

            {/* Grand total */}
            <TableRow className="border-t-2 bg-primary/5">
              <TableCell colSpan={3} className="font-bold text-lg">
                Grand Total
              </TableCell>
              <TableCell className="text-right font-bold text-lg">
                {formatSecondsAsDecimalHours(totalSeconds)}h
              </TableCell>
              <TableCell className="text-right font-bold text-lg">
                {formatCurrency(totalAmount, currency)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <p className="text-sm text-muted-foreground">
          * Indicates adjusted time. Click time to edit, press Enter to save.
        </p>
      )}
    </div>
  );
}
