"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { TitleCell } from "./cells/title-cell";
import { StatusCell } from "./cells/status-cell";
import { PriorityCell } from "./cells/priority-cell";
import { ClientCell } from "./cells/client-cell";
import { AssigneeCell } from "./cells/assignee-cell";
import { TimeCell } from "./cells/time-cell";
import { TaskCheckbox } from "./task-checkbox";
import { TaskThumbnail } from "./task-thumbnail";
import { TaskActions } from "./task-actions";
import { cn } from "@/lib/utils";

// Shared grid template - checkbox | thumbnail | title | client | assignees | status | priority | time | actions
export const TASK_GRID_COLUMNS = "44px 48px 1fr 155px 80px 140px 135px 145px 135px";

interface TaskGridRowProps {
  task: Doc<"tasks">;
  clientName?: string;
  onRowClick?: (taskId: Id<"tasks">) => void;
  isSelected?: boolean;
  onToggleSelect?: (taskId: Id<"tasks">) => void;
  hasUnseen?: boolean;
  isFocused?: boolean;
}

export function TaskGridRow({
  task,
  clientName,
  onRowClick,
  isSelected = false,
  onToggleSelect,
  hasUnseen = false,
  isFocused = false,
}: TaskGridRowProps) {
  const handleRowClick = () => {
    onRowClick?.(task._id);
  };

  return (
    <div
      className={cn(
        "grid items-center border-b hover:bg-muted/30 transition-colors",
        isSelected && "bg-primary/5",
        isFocused && "ring-2 ring-primary ring-inset"
      )}
      style={{ gridTemplateColumns: TASK_GRID_COLUMNS }}
    >
      <div className="flex items-center justify-center py-2">
        {onToggleSelect && (
          <TaskCheckbox
            taskId={task._id}
            checked={isSelected}
            onCheckedChange={onToggleSelect}
          />
        )}
      </div>
      <div className="flex items-center justify-center py-2">
        <TaskThumbnail taskId={task._id} imageStorageId={task.imageStorageId} />
      </div>
      <div className="py-2 pr-2 min-w-0">
        <TitleCell
          taskId={task._id}
          title={task.title}
          onClick={handleRowClick}
          hasUnseen={hasUnseen}
        />
      </div>
      <div className="py-2 min-w-0">
        <ClientCell
          taskId={task._id}
          clientId={task.clientId}
          clientName={clientName}
        />
      </div>
      <div className="py-2 min-w-0">
        <AssigneeCell taskId={task._id} assigneeIds={task.assigneeIds} />
      </div>
      <div className="py-2 min-w-0 whitespace-nowrap">
        <StatusCell taskId={task._id} status={task.status} />
      </div>
      <div className="py-2 min-w-0 whitespace-nowrap">
        <PriorityCell taskId={task._id} priority={task.priority} />
      </div>
      <div className="py-2 min-w-0 whitespace-nowrap">
        <TimeCell taskId={task._id} totalTimeSeconds={task.totalTimeSeconds} />
      </div>
      <div className="py-2">
        <TaskActions taskId={task._id} onEdit={handleRowClick} />
      </div>
    </div>
  );
}
