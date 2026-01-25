"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { TitleCell } from "@/components/tasks/cells/title-cell";
import { StatusCell } from "@/components/tasks/cells/status-cell";
import { PriorityCell } from "@/components/tasks/cells/priority-cell";
import { AssigneeCell } from "@/components/tasks/cells/assignee-cell";
import { TaskThumbnail } from "@/components/tasks/task-thumbnail";
import { TimeCell } from "@/components/tasks/cells/time-cell";
import { IconGripVertical } from "@tabler/icons-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

// Grid template matching Tasks (without client column and actions)
// Tasks: 44px 48px 1fr 155px 80px 140px 135px 145px 135px
// Today: drag | thumb | title | assignees | status | priority | time
export const TODAY_GRID_COLUMNS = "44px 48px 1fr 80px 140px 135px 145px";

interface TodayGridRowProps {
  task: Doc<"tasks"> & { parentTask?: Doc<"tasks"> };
  clientName?: string;
  onTaskClick?: (taskId: Id<"tasks">) => void;
}

export function TodayGridRow({ task, clientName, onTaskClick }: TodayGridRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRowClick = () => {
    onTaskClick?.(task._id);
  };

  // Build context line (parent → client)
  const hasContext = task.parentTask || clientName;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, gridTemplateColumns: TODAY_GRID_COLUMNS }}
      className={cn(
        "group/row grid items-center",
        "border-b border-border/40",
        "hover:bg-muted/30",
        "transition-colors duration-100",
        isDragging && "opacity-50 shadow-lg bg-card z-50",
        task.status !== "today" && "animate-out fade-out slide-out-to-right duration-300"
      )}
    >
      {/* Drag handle */}
      <div className="flex items-center justify-center py-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 focus:opacity-100"
        >
          <IconGripVertical className="h-5 w-5" />
        </button>
      </div>

      {/* Thumbnail */}
      <div className="flex items-center justify-center py-2">
        <TaskThumbnail taskId={task._id} imageStorageId={task.imageStorageId} />
      </div>

      {/* Title with context line below */}
      <div className="py-2 pr-2 min-w-0">
        <TitleCell
          taskId={task._id}
          title={task.title}
          onClick={handleRowClick}
        />
        {hasContext && (
          <div className="truncate text-xs text-muted-foreground mt-0.5 pl-1">
            {task.parentTask && (
              <span className="text-muted-foreground/70">
                {task.parentTask.title}
              </span>
            )}
            {task.parentTask && clientName && " → "}
            {clientName}
          </div>
        )}
      </div>

      {/* Assignees - same width as Tasks (80px) */}
      <div className="py-2 min-w-0" onClick={(e) => e.stopPropagation()}>
        <AssigneeCell taskId={task._id} assigneeIds={task.assigneeIds} />
      </div>

      {/* Status - same width as Tasks (140px) */}
      <div className="py-2 min-w-0 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <StatusCell taskId={task._id} status={task.status} />
      </div>

      {/* Priority - same width as Tasks (135px) */}
      <div className="py-2 min-w-0 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <PriorityCell taskId={task._id} priority={task.priority} />
      </div>

      {/* Time - same width as Tasks (145px) */}
      <div className="py-2 min-w-0 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <TimeCell taskId={task._id} totalTimeSeconds={task.totalTimeSeconds} />
      </div>
    </div>
  );
}
