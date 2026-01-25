"use client";

import { useState, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";

export function useTaskSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<Id<"tasks">>>(new Set());

  const toggle = useCallback((taskId: Id<"tasks">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((taskIds: Id<"tasks">[]) => {
    setSelectedIds(new Set(taskIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (taskId: Id<"tasks">) => {
      return selectedIds.has(taskId);
    },
    [selectedIds]
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    hasSelection: selectedIds.size > 0,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
  };
}
