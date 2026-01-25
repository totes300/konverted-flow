"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { StatusCell } from "@/components/tasks/cells/status-cell";
import { PriorityCell } from "@/components/tasks/cells/priority-cell";
import { AssigneeCell } from "@/components/tasks/cells/assignee-cell";
import { TitleCell } from "@/components/tasks/cells/title-cell";
import { TimePill } from "@/components/time/time-pill";
import { IconGripVertical } from "@tabler/icons-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface TodayItemProps {
  task: Doc<"tasks"> & { parentTask?: Doc<"tasks"> };
  clientName?: string;
  onTaskClick?: (taskId: Id<"tasks">) => void;
}

export function TodayItem({ task, clientName, onTaskClick }: TodayItemProps) {
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

  // Build context line
  const hasContext = task.parentTask || clientName;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-4 rounded-lg border bg-card p-4 transition-all",
        isDragging && "opacity-50 shadow-lg",
        // Animate out when status changes away from "today"
        task.status !== "today" && "animate-out fade-out slide-out-to-right duration-300",
        "hover:border-border/80 hover:bg-accent/50"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
      >
        <IconGripVertical className="h-5 w-5" />
      </button>

      {/* Main content - title with double-click to edit */}
      <div className="min-w-0 flex-1">
        <TitleCell
          taskId={task._id}
          title={task.title}
          onClick={() => onTaskClick?.(task._id)}
        />
        {hasContext && (
          <div className="truncate text-sm text-muted-foreground px-1">
            {task.parentTask && (
              <>
                <span className="text-muted-foreground/70">
                  {task.parentTask.title}
                </span>
                {clientName && " \u2192 "}
              </>
            )}
            {clientName}
          </div>
        )}
      </div>

      {/* Inline editable fields */}
      <div
        className="flex shrink-0 items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <AssigneeCell taskId={task._id} assigneeIds={task.assigneeIds} />
        <PriorityCell taskId={task._id} priority={task.priority} />
        <StatusCell taskId={task._id} status={task.status} />
        <TimePill taskId={task._id} totalTimeSeconds={task.totalTimeSeconds} />
      </div>
    </div>
  );
}
