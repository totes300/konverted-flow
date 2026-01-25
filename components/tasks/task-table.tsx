"use client";

import { useMemo } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TaskRow } from "./task-row";
import { TaskGroup } from "./task-group";
import { TaskQuickAdd } from "./task-quick-add";
import { IconPlus, IconChecklist } from "@tabler/icons-react";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/task-constants";
import { GroupByOption } from "@/hooks/use-task-filters";

interface TaskTableProps {
  tasks: Doc<"tasks">[];
  clients: Doc<"clients">[];
  users?: Doc<"users">[];
  onRowClick?: (taskId: Id<"tasks">) => void;
  defaultClientId?: Id<"clients">;
  defaultStatus?:
    | "today"
    | "next_up"
    | "in_progress"
    | "admin_review"
    | "client_review"
    | "stuck"
    | "done";
  groupBy?: GroupByOption;
  selectedIds?: Id<"tasks">[];
  onToggleSelect?: (taskId: Id<"tasks">) => void;
  onSelectAll?: (taskIds: Id<"tasks">[]) => void;
  unseenMap?: Record<string, boolean>;
  focusedTaskId?: Id<"tasks"> | null;
}

function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <IconChecklist className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No tasks yet</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm px-4">
        Create your first task to get started. Tasks help you organize and
        track your work.
      </p>
      {onCreate && (
        <Button onClick={onCreate} className="mt-6">
          <IconPlus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      )}
    </div>
  );
}

export function TaskTable({
  tasks,
  clients,
  users = [],
  onRowClick,
  defaultClientId,
  defaultStatus,
  groupBy = "none",
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  unseenMap = {},
  focusedTaskId = null,
}: TaskTableProps) {
  // Create maps for quick lookup
  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c._id, c.name])),
    [clients]
  );
  const userMap = useMemo(
    () => new Map(users.map((u) => [u._id, u.name])),
    [users]
  );

  // Group tasks if needed
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") return null;

    const groups = new Map<string, Doc<"tasks">[]>();

    for (const task of tasks) {
      let groupKey: string;
      switch (groupBy) {
        case "client":
          groupKey = task.clientId
            ? clientMap.get(task.clientId) || "Unknown"
            : "No Client";
          break;
        case "status":
          groupKey = STATUS_CONFIG[task.status].label;
          break;
        case "priority":
          groupKey = PRIORITY_CONFIG[task.priority].label;
          break;
        case "assignee":
          groupKey = task.assigneeIds[0]
            ? userMap.get(task.assigneeIds[0]) || "Unknown"
            : "Unassigned";
          break;
        default:
          groupKey = "Other";
      }

      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(task);
    }

    return groups;
  }, [tasks, groupBy, clientMap, userMap]);

  const allTaskIds = tasks.map((t) => t._id);
  const allSelected =
    selectedIds.length === tasks.length && tasks.length > 0;

  if (tasks.length === 0) {
    return (
      <div className="space-y-0">
        <EmptyState />
        <TaskQuickAdd
          defaultClientId={defaultClientId}
          defaultStatus={defaultStatus}
        />
      </div>
    );
  }

  // Grouped view
  if (groupedTasks) {
    return (
      <div className="space-y-4">
        {Array.from(groupedTasks.entries()).map(([groupName, groupTasks]) => (
          <TaskGroup
            key={groupName}
            groupName={groupName}
            tasks={groupTasks}
            clientMap={clientMap}
            onRowClick={onRowClick}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            unseenMap={unseenMap}
            focusedTaskId={focusedTaskId}
          />
        ))}
        <TaskQuickAdd
          defaultClientId={defaultClientId}
          defaultStatus={defaultStatus}
        />
      </div>
    );
  }

  // Flat list view
  return (
    <div className="rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              {onSelectAll && (
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() =>
                    allSelected ? onSelectAll([]) : onSelectAll(allTaskIds)
                  }
                />
              )}
            </TableHead>
            <TableHead className="w-[48px]"></TableHead>
            <TableHead className="min-w-[200px]">Title</TableHead>
            <TableHead className="w-[140px]">Client</TableHead>
            <TableHead className="w-[100px]">Assignees</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[90px]">Priority</TableHead>
            <TableHead className="w-[120px]">Time</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
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
      <TaskQuickAdd
        defaultClientId={defaultClientId}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}
