"use client";

import {
  formatActivityTimestamp,
  formatDuration,
  STATUS_LABELS,
} from "@/lib/format";

interface ActivityEventProps {
  eventType:
    | "task_created"
    | "status_changed"
    | "assignee_changed"
    | "time_logged";
  data: {
    field?: string;
    fromValue?: string;
    toValue?: string;
    durationSeconds?: number;
  };
  user: {
    _id: string;
    name: string;
  } | null;
  createdAt: number;
}

export function ActivityEvent({
  eventType,
  data,
  user,
  createdAt,
}: ActivityEventProps) {
  const userName = user?.name ?? "Unknown user";
  const timestamp = formatActivityTimestamp(createdAt);

  const renderContent = () => {
    switch (eventType) {
      case "task_created":
        return (
          <span>
            Task created by <span className="font-medium">{userName}</span>
          </span>
        );

      case "status_changed": {
        const fromStatus = STATUS_LABELS[data.fromValue ?? ""] ?? data.fromValue;
        const toStatus = STATUS_LABELS[data.toValue ?? ""] ?? data.toValue;
        return (
          <div className="flex flex-col">
            <span>
              <span className="font-medium">{userName}</span> changed status
            </span>
            <span className="text-muted-foreground">
              {fromStatus} <span className="mx-1">&rarr;</span> {toStatus}
            </span>
          </div>
        );
      }

      case "assignee_changed":
        return (
          <span>
            <span className="font-medium">{userName}</span> updated assignees
          </span>
        );

      case "time_logged": {
        const duration = formatDuration(data.durationSeconds ?? 0);
        return (
          <span>
            <span className="font-medium">{userName}</span> logged{" "}
            <span className="font-medium">{duration}</span>
          </span>
        );
      }

      default:
        return (
          <span>
            <span className="font-medium">{userName}</span> performed an action
          </span>
        );
    }
  };

  return (
    <div className="flex gap-3 py-2">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div className="mt-1.5 h-2 w-2 rounded-full bg-muted-foreground/40" />
        <div className="flex-1 w-px bg-border" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-sm text-muted-foreground pb-3">
        {renderContent()}
        <div className="text-xs text-muted-foreground/70 mt-0.5">{timestamp}</div>
      </div>
    </div>
  );
}
