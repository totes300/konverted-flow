"use client";

import { Suspense, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskPopup } from "@/components/tasks/task-popup";
import { BatchActionBar } from "@/components/tasks/batch-action-bar";
import { useTaskFilters } from "@/hooks/use-task-filters";
import { useTaskSelection } from "@/hooks/use-task-selection";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

function TasksContent() {
  const { filters, hasFilters } = useTaskFilters();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Selection state
  const {
    selectedIds,
    selectedCount,
    hasSelection,
    toggle: toggleSelect,
    selectAll,
    clearSelection,
  } = useTaskSelection();

  // Get task ID from URL
  const openTaskId = searchParams.get("task") as Id<"tasks"> | null;

  // Convert filters for the query
  const queryArgs = useMemo(
    () => ({
      status: filters.status.length > 0 ? filters.status : undefined,
      clientId: filters.clientId,
      assigneeId: filters.assigneeId,
    }),
    [filters.status, filters.clientId, filters.assigneeId]
  );

  const tasks = useQuery(api.tasks.list, queryArgs);
  const clients = useQuery(api.clients.list);
  const users = useQuery(api.users.listByOrg);

  // Handle opening a task popup
  const handleOpenTask = useCallback(
    (taskId: Id<"tasks">) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("task", taskId);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Handle closing the task popup
  const handleCloseTask = useCallback(
    (open: boolean) => {
      if (!open) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("task");
        const queryString = params.toString();
        router.push(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      }
    },
    [searchParams, router, pathname]
  );

  const isLoading =
    tasks === undefined || clients === undefined || users === undefined;

  // Client-side search filter (search by title)
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (!filters.search) return tasks;

    const searchLower = filters.search.toLowerCase();
    return tasks.filter((task) =>
      task.title.toLowerCase().includes(searchLower)
    );
  }, [tasks, filters.search]);

  const noResults = !isLoading && filteredTasks.length === 0 && hasFilters;

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all your tasks in one place.
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <TaskFilters />
      </div>

      {/* Batch Action Bar */}
      {hasSelection && (
        <div className="px-4 lg:px-6">
          <BatchActionBar
            selectedCount={selectedCount}
            selectedIds={selectedIds}
            onClear={clearSelection}
          />
        </div>
      )}

      <div className="px-4 lg:px-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : noResults ? (
          <NoResultsState />
        ) : (
          <TaskTable
            tasks={filteredTasks}
            clients={clients}
            users={users}
            onRowClick={handleOpenTask}
            defaultClientId={filters.clientId}
            defaultStatus={filters.status[0]}
            groupBy={filters.groupBy}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
          />
        )}
      </div>

      {/* Task Popup */}
      <TaskPopup
        taskId={openTaskId}
        open={openTaskId !== null}
        onOpenChange={handleCloseTask}
      />
    </TooltipProvider>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <TasksContent />
    </Suspense>
  );
}

function NoResultsState() {
  const { clearFilters } = useTaskFilters();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background py-16 text-center">
      <h3 className="text-lg font-semibold">No tasks match filters</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm px-4">
        Try adjusting your filters or clear them to see all tasks.
      </p>
      <button
        onClick={clearFilters}
        className="mt-4 text-sm text-primary underline-offset-4 hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );
}

function LoadingPage() {
  return (
    <>
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all your tasks in one place.
          </p>
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-9 w-[100px]" />
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-9 w-[150px]" />
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <LoadingSkeleton />
      </div>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-md border bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-[40px]" />
          <Skeleton className="h-4 w-[48px]" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[140px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[90px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b px-4 py-4 last:border-0"
        >
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-[180px]" />
          <Skeleton className="h-4 w-[90px]" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-[90px]" />
          <Skeleton className="h-4 w-[70px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
      ))}
    </div>
  );
}
