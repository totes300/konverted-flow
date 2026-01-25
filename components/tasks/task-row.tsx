"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { TableCell, TableRow } from "@/components/ui/table";
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

interface TaskRowProps {
  task: Doc<"tasks">;
  clientName?: string;
  onRowClick?: (taskId: Id<"tasks">) => void;
  isSelected?: boolean;
  onToggleSelect?: (taskId: Id<"tasks">) => void;
  hasUnseen?: boolean;
  isFocused?: boolean;
}

export function TaskRow({
  task,
  clientName,
  onRowClick,
  isSelected = false,
  onToggleSelect,
  hasUnseen = false,
  isFocused = false,
}: TaskRowProps) {
  const handleRowClick = () => {
    onRowClick?.(task._id);
  };

  return (
    <TableRow
      className={cn(
        "group hover:bg-muted/50",
        isSelected && "bg-primary/5",
        isFocused && "ring-2 ring-primary ring-inset"
      )}
    >
      <TableCell className="w-[40px]">
        {onToggleSelect && (
          <TaskCheckbox
            taskId={task._id}
            checked={isSelected}
            onCheckedChange={onToggleSelect}
          />
        )}
      </TableCell>
      <TableCell className="w-[48px]">
        <TaskThumbnail taskId={task._id} imageStorageId={task.imageStorageId} />
      </TableCell>
      <TableCell className="min-w-[200px]">
        <TitleCell
          taskId={task._id}
          title={task.title}
          onClick={handleRowClick}
          hasUnseen={hasUnseen}
        />
      </TableCell>
      <TableCell className="w-[140px]">
        <ClientCell
          taskId={task._id}
          clientId={task.clientId}
          clientName={clientName}
        />
      </TableCell>
      <TableCell className="w-[100px]">
        <AssigneeCell taskId={task._id} assigneeIds={task.assigneeIds} />
      </TableCell>
      <TableCell className="w-[120px]">
        <StatusCell taskId={task._id} status={task.status} />
      </TableCell>
      <TableCell className="w-[90px]">
        <PriorityCell taskId={task._id} priority={task.priority} />
      </TableCell>
      <TableCell className="w-[120px]">
        <TimeCell taskId={task._id} totalTimeSeconds={task.totalTimeSeconds} />
      </TableCell>
      <TableCell className="w-[100px]">
        <TaskActions taskId={task._id} onEdit={handleRowClick} />
      </TableCell>
    </TableRow>
  );
}
