"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SubtaskRow } from "./subtask-row";
import { SubtaskQuickAdd } from "./subtask-quick-add";
import { IconSubtask } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";

interface SubtaskListProps {
  parentTaskId: Id<"tasks">;
}

export function SubtaskList({ parentTaskId }: SubtaskListProps) {
  const subtasks = useQuery(api.tasks.getSubtasks, { parentTaskId });

  const isLoading = subtasks === undefined;
  const subtaskCount = subtasks?.length || 0;
  const completedCount = subtasks?.filter((s) => s.status === "done").length || 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <IconSubtask className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Subtasks</span>
        {subtaskCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {completedCount}/{subtaskCount}
          </Badge>
        )}
      </div>

      {/* Subtask list */}
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading subtasks">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : subtaskCount === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          No subtasks yet
        </div>
      ) : (
        <div className="space-y-1 rounded-md border bg-background">
          {subtasks.map((subtask) => (
            <SubtaskRow key={subtask._id} subtask={subtask} />
          ))}
        </div>
      )}

      {/* Quick add */}
      <SubtaskQuickAdd parentTaskId={parentTaskId} />
    </div>
  );
}
