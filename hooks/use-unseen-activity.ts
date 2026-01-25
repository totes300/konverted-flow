"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useUnseenActivity(taskIds: Id<"tasks">[]) {
  const unseenMap = useQuery(
    api.activities.getUnseenForTasks,
    taskIds.length > 0 ? { taskIds } : "skip"
  );

  return {
    unseenMap: unseenMap || {},
    isLoading: unseenMap === undefined,
    hasUnseen: (taskId: Id<"tasks">) => unseenMap?.[taskId] || false,
  };
}
