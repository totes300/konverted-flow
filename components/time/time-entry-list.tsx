"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { TimeEntryRow } from "./time-entry-row";

const INITIAL_ENTRIES_SHOWN = 3;

interface TimeEntryListProps {
  taskId: Id<"tasks">;
}

export function TimeEntryList({ taskId }: TimeEntryListProps) {
  const entries = useQuery(api.timeEntries.getByTaskWithUsers, { taskId });
  const [showAll, setShowAll] = useState(false);

  if (entries === undefined) {
    return (
      <div className="px-4 py-3 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-sm text-muted-foreground">
        No time entries yet
      </div>
    );
  }

  const displayedEntries = showAll
    ? entries
    : entries.slice(0, INITIAL_ENTRIES_SHOWN);
  const hasMore = entries.length > INITIAL_ENTRIES_SHOWN;
  const remainingCount = entries.length - INITIAL_ENTRIES_SHOWN;

  return (
    <div className="max-h-[250px] overflow-y-auto">
      {displayedEntries.map((entry) => (
        <TimeEntryRow
          key={entry._id}
          entry={entry}
          userName={entry.user?.name}
        />
      ))}

      {hasMore && !showAll && (
        <div className="px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground"
            onClick={() => setShowAll(true)}
          >
            Show all entries ({remainingCount} more)
          </Button>
        </div>
      )}

      {showAll && hasMore && (
        <div className="px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground"
            onClick={() => setShowAll(false)}
          >
            Show less
          </Button>
        </div>
      )}
    </div>
  );
}
