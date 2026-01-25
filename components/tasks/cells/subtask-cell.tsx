"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { IconSubtask } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface SubtaskCellProps {
  taskId: Id<"tasks">;
  onClick?: () => void;
}

export function SubtaskCell({ taskId, onClick }: SubtaskCellProps) {
  const count = useQuery(api.tasks.getSubtaskCount, { taskId });

  const isLoading = count === undefined;
  const hasSubtasks = count !== undefined && count > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted transition-colors",
        !hasSubtasks && "opacity-50"
      )}
    >
      <IconSubtask className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm tabular-nums text-muted-foreground">
        {isLoading ? "-" : hasSubtasks ? count : "-"}
      </span>
    </button>
  );
}
