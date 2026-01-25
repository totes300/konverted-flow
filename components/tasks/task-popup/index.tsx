"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskPopupHeader } from "./task-popup-header";
import { TaskPopupLeft } from "./task-popup-left";
import { TaskPopupRight } from "./task-popup-right";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskPopupProps {
  taskId: Id<"tasks"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskPopup({ taskId, open, onOpenChange }: TaskPopupProps) {
  const task = useQuery(
    api.tasks.getById,
    taskId ? { id: taskId } : "skip"
  );

  const clients = useQuery(api.clients.list);

  // Get client name for the task
  const clientName = task?.clientId && clients
    ? clients.find((c) => c._id === task.clientId)?.name
    : undefined;

  const isLoading = taskId !== null && task === undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-4xl p-0 gap-0 flex flex-col"
      >
        <VisuallyHidden.Root>
          <SheetTitle>{task?.title ?? "Task Details"}</SheetTitle>
          <SheetDescription>View and edit task details</SheetDescription>
        </VisuallyHidden.Root>
        {isLoading ? (
          <TaskPopupSkeleton />
        ) : task ? (
          <>
            <TaskPopupHeader
              title={task.title}
              onClose={() => onOpenChange(false)}
            />

            {/* Desktop layout: side-by-side */}
            <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
              {/* Left Panel - Details (60%) */}
              <div className="flex-[3] overflow-y-auto border-r">
                <TaskPopupLeft
                  task={task}
                  clientName={clientName}
                />
              </div>
              {/* Right Panel - Activity (40%) */}
              <div className="flex-[2] overflow-y-auto bg-muted/30">
                <TaskPopupRight taskId={task._id} />
              </div>
            </div>

            {/* Mobile layout: tabs */}
            <div className="flex md:hidden flex-1 min-h-0 overflow-hidden flex-col">
              <Tabs defaultValue="details" className="flex flex-1 flex-col overflow-hidden">
                <div className="px-4 pt-2 border-b">
                  <TabsList className="w-full">
                    <TabsTrigger value="details" className="flex-1">
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1">
                      Activity
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="details"
                  className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden"
                >
                  <TaskPopupLeft
                    task={task}
                    clientName={clientName}
                  />
                </TabsContent>
                <TabsContent
                  value="activity"
                  className="flex-1 overflow-hidden mt-0 bg-muted/30 data-[state=inactive]:hidden"
                >
                  <TaskPopupRight taskId={task._id} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Task not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskPopupSkeleton() {
  return (
    <div className="flex flex-col h-full" role="status" aria-label="Loading task">
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <div className="flex-1 md:flex-[3] p-6 space-y-6 md:border-r">
          <Skeleton className="h-8 w-full" />
          <div className="flex gap-4 flex-wrap">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="hidden md:block md:flex-[2] p-4 bg-muted/30">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
