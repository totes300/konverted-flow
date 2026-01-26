"use client";

import { Id } from "@/convex/_generated/dataModel";
import { ActivityFeed } from "./activity-feed";

interface TaskPopupRightProps {
  taskId: Id<"tasks">;
}

export function TaskPopupRight({ taskId }: TaskPopupRightProps): React.ReactElement {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-medium text-muted-foreground px-4 pt-4 pb-2">
        Activity
      </h3>
      <div className="flex-1 min-h-0">
        <ActivityFeed taskId={taskId} />
      </div>
    </div>
  );
}
