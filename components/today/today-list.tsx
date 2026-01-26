"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { TodayGridRow, TODAY_GRID_COLUMNS } from "./today-grid-row";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { IconSun, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { TodayGroupByOption } from "@/hooks/use-today-filters";
import { PRIORITY_CONFIG, TaskPriority } from "@/lib/task-constants";
import { formatDuration } from "@/lib/time-parser";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface TodayListProps {
  assigneeId?: Id<"users">;
  clientId?: Id<"clients">;
  groupBy?: TodayGroupByOption;
}

type TodayTask = Doc<"tasks"> & {
  parentTask?: Doc<"tasks">;
  todayTimeSeconds?: number;
};

interface TodayGroupProps {
  groupName: string;
  tasks: TodayTask[];
  clientMap: Map<Id<"clients">, string>;
  onTaskClick: (taskId: Id<"tasks">) => void;
  defaultOpen?: boolean;
  completedCount: number;
  totalCount: number;
  totalTime: number;
}

function TodayGroup({
  groupName,
  tasks,
  clientMap,
  onTaskClick,
  defaultOpen = true,
  completedCount,
  totalCount,
  totalTime,
}: TodayGroupProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="rounded-lg overflow-hidden"
    >
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/10 hover:bg-muted/20 transition-colors">
          <IconChevronRight
            className={cn(
              "h-4 w-4 transition-transform shrink-0",
              isOpen && "rotate-90"
            )}
          />
          <span className="font-medium">{groupName || "Unassigned"}</span>

          {/* Per-group stats */}
          <span className="text-sm text-muted-foreground ml-2">
            {completedCount}/{totalCount} done
            {totalTime > 0 && ` • ${formatDuration(totalTime)}`}
          </span>

          <Badge variant="secondary" className="ml-auto">
            {tasks.length}
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div>
          {tasks.map((task) => (
            <TodayGridRow
              key={task._id}
              task={task}
              clientName={
                task.clientId ? clientMap.get(task.clientId) : undefined
              }
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function TodayList({ assigneeId, clientId, groupBy = "none" }: TodayListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const todayItems = useQuery(api.tasks.getTodayItems, { assigneeId });
  const clients = useQuery(api.clients.list);
  const reorderToday = useMutation(api.tasks.reorderToday);

  // Local state for optimistic reordering
  const [localItems, setLocalItems] = useState<TodayTask[]>([]);

  // Sync local state with server state and apply client filter
  useEffect(() => {
    if (todayItems) {
      let filtered = todayItems;
      if (clientId) {
        filtered = todayItems.filter((task) => task.clientId === clientId);
      }
      setLocalItems(filtered);
    }
  }, [todayItems, clientId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Disable drag when grouped
    if (groupBy !== "none") return;

    if (over && active.id !== over.id) {
      const oldIndex = localItems.findIndex((item) => item._id === active.id);
      const newIndex = localItems.findIndex((item) => item._id === over.id);

      // Optimistic update
      const newItems = arrayMove(localItems, oldIndex, newIndex);
      setLocalItems(newItems);

      // Persist to server
      try {
        await reorderToday({
          taskIds: newItems.map((item) => item._id),
        });
      } catch {
        // Revert on error
        const filtered = clientId
          ? todayItems?.filter((task) => task.clientId === clientId) || []
          : todayItems || [];
        setLocalItems(filtered);
        toast.error("Failed to reorder tasks");
      }
    }
  };

  const handleTaskClick = (taskId: Id<"tasks">) => {
    // Open task popup by updating URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", taskId);
    router.push(`/today?${params.toString()}`);
  };

  // Build client lookup map
  const clientMap = useMemo(
    () => new Map(clients?.map((c) => [c._id, c.name]) || []),
    [clients]
  );

  // Group tasks based on groupBy option
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") {
      return null;
    }

    // Helper to get group key for a task
    function getGroupKey(task: TodayTask): string {
      if (groupBy === "client") return task.clientId || "none";
      if (groupBy === "priority") return task.priority;
      if (groupBy === "parent") return task.parentTaskId || "none";
      return "all";
    }

    // Helper to get group label
    function getGroupLabel(key: string, tasks: TodayTask[]): string {
      if (groupBy === "client") {
        return key === "none" ? "No Client" : clientMap.get(key as Id<"clients">) || "Unknown Client";
      }
      if (groupBy === "priority") {
        return PRIORITY_CONFIG[key as TaskPriority]?.label || key;
      }
      if (groupBy === "parent") {
        return key === "none" ? "No Parent Task" : tasks[0]?.parentTask?.title || "Unknown";
      }
      return key;
    }

    // Helper to calculate stats for a group
    function calcStats(tasks: TodayTask[]): { completedCount: number; totalCount: number; totalTime: number } {
      return {
        completedCount: tasks.filter((t) => t.status === "done").length,
        totalCount: tasks.length,
        totalTime: tasks.reduce((sum, t) => sum + (t.todayTimeSeconds ?? 0), 0),
      };
    }

    // Build groups map
    const groups = new Map<string, TodayTask[]>();
    for (const task of localItems) {
      const key = getGroupKey(task);
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, task]);
    }

    // Sort entries based on groupBy type
    let sortedEntries = Array.from(groups.entries());
    if (groupBy === "priority") {
      const priorityOrder = ["high", "medium", "low"];
      sortedEntries = sortedEntries.sort(
        (a, b) => priorityOrder.indexOf(a[0]) - priorityOrder.indexOf(b[0])
      );
    } else {
      sortedEntries.sort((a, b) => {
        if (a[0] === "none") return 1;
        if (b[0] === "none") return -1;
        return a[0].localeCompare(b[0]);
      });
    }

    // Build result array
    return sortedEntries.map(([key, tasks]) => ({
      key,
      label: getGroupLabel(key, tasks),
      tasks,
      ...calcStats(tasks),
    }));
  }, [localItems, groupBy, clientMap]);

  // Loading state
  if (todayItems === undefined) {
    return (
      <div className="space-y-0">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full border-b" />
        ))}
      </div>
    );
  }

  // Empty state
  if (localItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <IconSun className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Nothing planned for today</h3>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          Mark some tasks as &quot;Today&quot; to get started with your daily focus.
        </p>
        <Button className="mt-6" onClick={() => router.push("/tasks")}>
          Go to Tasks
        </Button>
      </div>
    );
  }

  // Grouped view
  if (groupBy !== "none" && groupedTasks) {
    return (
      <div className="bg-background space-y-2">
        {groupedTasks.map((group) => (
          <TodayGroup
            key={group.key}
            groupName={group.label}
            tasks={group.tasks}
            clientMap={clientMap}
            onTaskClick={handleTaskClick}
            completedCount={group.completedCount}
            totalCount={group.totalCount}
            totalTime={group.totalTime}
          />
        ))}
      </div>
    );
  }

  // Flat list with drag-and-drop
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localItems.map((item) => item._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="bg-background rounded-lg border border-border/30 shadow-[var(--task-container-shadow)] overflow-hidden">
          {/* Header row - same style as task-table.tsx */}
          <div
            className="grid items-center border-b border-border/30 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider"
            style={{ gridTemplateColumns: TODAY_GRID_COLUMNS }}
          >
            <div className="py-3"></div>
            <div className="py-3"></div>
            <div className="py-3">Title</div>
            <div className="py-3">Assignees</div>
            <div className="py-3">Status</div>
            <div className="py-3">Priority</div>
            <div className="py-3">Time</div>
          </div>

          {/* Task rows - flat list */}
          <div>
            {localItems.map((task) => (
              <TodayGridRow
                key={task._id}
                task={task}
                clientName={task.clientId ? clientMap.get(task.clientId) : undefined}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}
