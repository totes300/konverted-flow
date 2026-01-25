"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SubtaskRow } from "./subtask-row";
import { SubtaskQuickAdd } from "./subtask-quick-add";
import { SubtaskProgress } from "./subtask-progress";
import { SubtaskTableHeader } from "./subtask-table-header";
import { IconSubtask } from "@tabler/icons-react";

interface SubtaskListProps {
  parentTaskId: Id<"tasks">;
}

export function SubtaskList({ parentTaskId }: SubtaskListProps) {
  const subtasks = useQuery(api.tasks.getSubtasks, { parentTaskId });

  const isLoading = subtasks === undefined;
  const subtaskCount = subtasks?.length || 0;
  const completedCount = subtasks?.filter((s) => s.status === "done").length || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <IconSubtask className="h-5 w-5 text-muted-foreground" />
        <span className="text-base font-medium">Subtasks</span>
        <SubtaskProgress completed={completedCount} total={subtaskCount} />
      </div>

      {/* Subtask table */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="bg-background overflow-hidden h-full" role="status" aria-label="Loading subtasks">
            <SubtaskTableHeader />
            <div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/20 animate-pulse border-b" />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-background rounded-lg border border-border/30 shadow-[var(--task-container-shadow)] overflow-hidden flex flex-col h-full">
            {subtaskCount > 0 && <SubtaskTableHeader />}
            <div className="flex-1 overflow-y-auto">
              {subtasks.map((subtask) => (
                <SubtaskRow key={subtask._id} subtask={subtask} />
              ))}
              <SubtaskQuickAdd parentTaskId={parentTaskId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
