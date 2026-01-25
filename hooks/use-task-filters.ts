"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";

type TaskStatus =
  | "today"
  | "next_up"
  | "in_progress"
  | "admin_review"
  | "client_review"
  | "stuck"
  | "done";

export type GroupByOption = "none" | "client" | "status" | "assignee" | "priority";

export interface TaskFilters {
  status: TaskStatus[];
  clientId?: Id<"clients">;
  assigneeId?: Id<"users">;
  search?: string;
  groupBy: GroupByOption;
}

export function useTaskFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo<TaskFilters>(() => {
    const statusParam = searchParams.get("status");
    const status = statusParam
      ? (statusParam.split(",") as TaskStatus[])
      : [];

    return {
      status,
      clientId: (searchParams.get("client") as Id<"clients">) || undefined,
      assigneeId: (searchParams.get("assignee") as Id<"users">) || undefined,
      search: searchParams.get("search") || undefined,
      groupBy: (searchParams.get("groupBy") as GroupByOption) || "none",
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (newFilters: Partial<TaskFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Handle status array
      if (newFilters.status !== undefined) {
        if (newFilters.status.length > 0) {
          params.set("status", newFilters.status.join(","));
        } else {
          params.delete("status");
        }
      }

      // Handle clientId
      if (newFilters.clientId !== undefined) {
        if (newFilters.clientId) {
          params.set("client", newFilters.clientId);
        } else {
          params.delete("client");
        }
      }

      // Handle assigneeId
      if (newFilters.assigneeId !== undefined) {
        if (newFilters.assigneeId) {
          params.set("assignee", newFilters.assigneeId);
        } else {
          params.delete("assignee");
        }
      }

      // Handle search
      if (newFilters.search !== undefined) {
        if (newFilters.search) {
          params.set("search", newFilters.search);
        } else {
          params.delete("search");
        }
      }

      // Handle groupBy
      if (newFilters.groupBy !== undefined) {
        if (newFilters.groupBy && newFilters.groupBy !== "none") {
          params.set("groupBy", newFilters.groupBy);
        } else {
          params.delete("groupBy");
        }
      }

      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [searchParams, router, pathname]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const toggleStatus = useCallback(
    (status: TaskStatus) => {
      const newStatus = filters.status.includes(status)
        ? filters.status.filter((s) => s !== status)
        : [...filters.status, status];
      setFilters({ status: newStatus });
    },
    [filters.status, setFilters]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.clientId) count++;
    if (filters.assigneeId) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const hasFilters = activeFilterCount > 0;

  return {
    filters,
    setFilters,
    clearFilters,
    toggleStatus,
    activeFilterCount,
    hasFilters,
  };
}
