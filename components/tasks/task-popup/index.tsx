"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

export function TaskPopup({ taskId, open, onOpenChange }: TaskPopupProps): React.ReactElement {
  const task = useQuery(api.tasks.getById, taskId ? { id: taskId } : "skip");
  const clients = useQuery(api.clients.list);

  const clientName = task?.clientId
    ? clients?.find((c) => c._id === task.clientId)?.name
    : undefined;

  const isLoading = taskId !== null && task === undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        fullScreen
        className="p-0 gap-0 flex flex-col overflow-hidden"
      >
        <VisuallyHidden.Root>
          <DialogTitle>{task?.title ?? "Task Details"}</DialogTitle>
          <DialogDescription>View and edit task details</DialogDescription>
        </VisuallyHidden.Root>

        {isLoading ? (
          <TaskPopupSkeleton />
        ) : task ? (
          <div className="flex flex-col h-full overflow-hidden">
            <TaskPopupHeader onClose={() => onOpenChange(false)} />

            {/* Desktop layout: side-by-side */}
            <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
              {/* Left Panel - Details (~70%) */}
              <div className="flex-[7] overflow-y-auto">
                <TaskPopupLeft
                  task={task}
                  clientName={clientName}
                />
              </div>
              {/* Right Panel - Activity (~30%) */}
              <div className="flex-[3] overflow-y-auto bg-muted/10 border-l border-muted/30">
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
                  className="flex-1 overflow-hidden mt-0 bg-muted/10 data-[state=inactive]:hidden"
                >
                  <TaskPopupRight taskId={task._id} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Task not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaskPopupSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col h-full" role="status" aria-label="Loading task">
      {/* Close button placeholder */}
      <div className="absolute top-4 right-4 z-10">
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <div className="flex-1 md:flex-[7] p-6 space-y-6">
          {/* Title with checkbox */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-8 w-96" />
          </div>
          {/* Attribute grid */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-12 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-32 w-full" />
          {/* Subtasks */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
        <div className="hidden md:block md:flex-[3] p-4 bg-muted/10 border-l border-muted/30">
          <Skeleton className="h-5 w-24 mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
