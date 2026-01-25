"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { TodayItem } from "./today-item";
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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { IconSun } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

interface TodayListProps {
  assigneeId?: Id<"users">;
}

type TodayTask = Doc<"tasks"> & { parentTask?: Doc<"tasks"> };

export function TodayList({ assigneeId }: TodayListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const todayItems = useQuery(api.tasks.getTodayItems, { assigneeId });
  const clients = useQuery(api.clients.list);
  const reorderToday = useMutation(api.tasks.reorderToday);

  // Local state for optimistic reordering
  const [localItems, setLocalItems] = useState<TodayTask[]>([]);

  // Sync local state with server state
  useEffect(() => {
    if (todayItems) {
      setLocalItems(todayItems);
    }
  }, [todayItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

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
        setLocalItems(todayItems || []);
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
  const clientMap = new Map(clients?.map((c) => [c._id, c.name]) || []);

  // Loading state
  if (todayItems === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
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
        <div className="space-y-2">
          {localItems.map((task) => (
            <TodayItem
              key={task._id}
              task={task}
              clientName={task.clientId ? clientMap.get(task.clientId) : undefined}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
