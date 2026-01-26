"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";

export type TodayGroupByOption = "none" | "client" | "priority" | "parent";

export interface TodayFilters {
  clientId?: Id<"clients">;
  assigneeId?: Id<"users">;
  groupBy: TodayGroupByOption;
}

interface UseTodayFiltersReturn {
  filters: TodayFilters;
  setFilters: (newFilters: Partial<TodayFilters>) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  hasFilters: boolean;
}

export function useTodayFilters(): UseTodayFiltersReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo<TodayFilters>(() => ({
    clientId: (searchParams.get("client") as Id<"clients">) || undefined,
    assigneeId: (searchParams.get("assignee") as Id<"users">) || undefined,
    groupBy: (searchParams.get("groupBy") as TodayGroupByOption) || "none",
  }), [searchParams]);

  const setFilters = useCallback(
    (newFilters: Partial<TodayFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

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

      // Handle groupBy
      if (newFilters.groupBy !== undefined) {
        if (newFilters.groupBy && newFilters.groupBy !== "none") {
          params.set("groupBy", newFilters.groupBy);
        } else {
          params.delete("groupBy");
        }
      }

      // Preserve task param if present
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [searchParams, router, pathname]
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    // Keep task param if present
    const taskParam = params.get("task");
    params.delete("client");
    params.delete("assignee");
    params.delete("groupBy");
    if (taskParam) {
      params.set("task", taskParam);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }, [searchParams, router, pathname]);

  const activeFilterCount = useMemo(() => {
    return (filters.clientId ? 1 : 0) + (filters.assigneeId ? 1 : 0);
  }, [filters.clientId, filters.assigneeId]);

  const hasFilters = activeFilterCount > 0;

  return {
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasFilters,
  };
}
