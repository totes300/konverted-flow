"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { formatEntryDuration, formatTimeRange } from "@/lib/time-parser";
import { TimeEntryActions } from "./time-entry-actions";
import { TimeEditDialog } from "./time-edit-dialog";

interface TimeEntryRowProps {
  entry: {
    _id: Id<"timeEntries">;
    durationSeconds: number;
    date: string;
    startTime?: number;
    isRunning: boolean;
  };
  userName?: string;
}

export function TimeEntryRow({ entry, userName }: TimeEntryRowProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const removeEntry = useMutation(api.timeEntries.remove);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleDelete = async () => {
    try {
      await removeEntry({ id: entry._id });
      toast.success("Time entry deleted");
    } catch (error) {
      console.error("Failed to delete time entry:", error);
      toast.error("Failed to delete time entry");
    }
  };

  // Don't show actions for running entries
  const showActions = !entry.isRunning;

  return (
    <>
      <div className="group/entry flex items-center gap-3 px-4 py-2 hover:bg-muted/50">
        {/* Duration */}
        <span className="text-sm font-medium tabular-nums shrink-0">
          {formatEntryDuration(entry.durationSeconds)}
        </span>

        {/* Date and time range */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0">{formatDate(entry.date)}</span>
          {entry.startTime && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate">
                {formatTimeRange(entry.startTime, entry.durationSeconds)}
              </span>
            </>
          )}
          {userName && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate">{userName}</span>
            </>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <TimeEntryActions
            entryId={entry._id}
            onEdit={() => setEditDialogOpen(true)}
            onDelete={handleDelete}
          />
        )}
      </div>

      <TimeEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        entryId={entry._id}
        currentDurationSeconds={entry.durationSeconds}
        currentDate={entry.date}
      />
    </>
  );
}
