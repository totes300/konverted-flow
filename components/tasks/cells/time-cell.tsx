"use client";

import { TimePill } from "@/components/time/time-pill";
import { Id } from "@/convex/_generated/dataModel";

interface TimeCellProps {
  taskId: Id<"tasks">;
  totalTimeSeconds: number;
}

export function TimeCell({ taskId, totalTimeSeconds }: TimeCellProps) {
  return <TimePill taskId={taskId} totalTimeSeconds={totalTimeSeconds} />;
}
