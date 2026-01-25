"use client";

import { useState } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { IconChevronRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { TaskRow } from "./task-row";
import { Table, TableBody } from "@/components/ui/table";

interface TaskGroupProps {
  groupName: string;
  tasks: Doc<"tasks">[];
  clientMap: Map<Id<"clients">, string>;
  onRowClick?: (taskId: Id<"tasks">) => void;
  selectedIds?: Id<"tasks">[];
  onToggleSelect?: (taskId: Id<"tasks">) => void;
  unseenMap?: Record<string, boolean>;
  focusedTaskId?: Id<"tasks"> | null;
  defaultOpen?: boolean;
}

export function TaskGroup({
  groupName,
  tasks,
  clientMap,
  onRowClick,
  selectedIds = [],
  onToggleSelect,
  unseenMap = {},
  focusedTaskId = null,
  defaultOpen = true,
}: TaskGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-lg overflow-hidden"
    >
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50">
          <IconChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-90"
            )}
          />
          <span className="font-medium">{groupName || "Unassigned"}</span>
          <Badge variant="secondary" className="ml-auto">
            {tasks.length}
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Table>
          <TableBody>
            {tasks.map((task) => (
              <TaskRow
                key={task._id}
                task={task}
                clientName={
                  task.clientId ? clientMap.get(task.clientId) : undefined
                }
                onRowClick={onRowClick}
                isSelected={selectedIds.includes(task._id)}
                onToggleSelect={onToggleSelect}
                hasUnseen={unseenMap[task._id] || false}
                isFocused={focusedTaskId === task._id}
              />
            ))}
          </TableBody>
        </Table>
      </CollapsibleContent>
    </Collapsible>
  );
}
