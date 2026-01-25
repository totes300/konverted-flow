"use client";

import { useEffect, useCallback, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface UseTaskKeyboardOptions {
  taskIds: Id<"tasks">[];
  onEdit: (taskId: Id<"tasks">) => void;
  onDelete: (taskId: Id<"tasks">) => void;
  onDuplicate: (taskId: Id<"tasks">) => void;
  onToggleTimer: (taskId: Id<"tasks">) => void;
  onToggleSelect: (taskId: Id<"tasks">) => void;
  onNewTask: () => void;
}

export function useTaskKeyboard({
  taskIds,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleTimer,
  onToggleSelect,
  onNewTask,
}: UseTaskKeyboardOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const focusedTaskId = focusedIndex >= 0 ? taskIds[focusedIndex] : null;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, taskIds.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "e":
        case "E":
          if (focusedTaskId) {
            e.preventDefault();
            onEdit(focusedTaskId);
          }
          break;
        case "d":
        case "D":
          if (focusedTaskId) {
            e.preventDefault();
            onDelete(focusedTaskId);
          }
          break;
        case "c":
        case "C":
          if (focusedTaskId) {
            e.preventDefault();
            onDuplicate(focusedTaskId);
          }
          break;
        case " ":
          if (focusedTaskId) {
            e.preventDefault();
            onToggleTimer(focusedTaskId);
          }
          break;
        case "x":
        case "X":
          if (focusedTaskId) {
            e.preventDefault();
            onToggleSelect(focusedTaskId);
          }
          break;
        case "n":
        case "N":
          e.preventDefault();
          onNewTask();
          break;
      }
    },
    [
      taskIds,
      focusedTaskId,
      onEdit,
      onDelete,
      onDuplicate,
      onToggleTimer,
      onToggleSelect,
      onNewTask,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    focusedIndex,
    focusedTaskId,
    setFocusedIndex,
  };
}
