"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TaskStatus, STATUS_CONFIG } from "@/lib/task-constants";

interface StatusCellProps {
  taskId: Id<"tasks">;
  status: TaskStatus;
}

export function StatusCell({ taskId, status }: StatusCellProps) {
  const updateTask = useMutation(api.tasks.update);

  const handleChange = async (newStatus: TaskStatus) => {
    try {
      await updateTask({ id: taskId, status: newStatus });
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <Select value={status} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-full border-none shadow-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:border-transparent">
        <SelectValue>
          <Badge
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium border-0",
              STATUS_CONFIG[status].bg,
              STATUS_CONFIG[status].text
            )}
          >
            {STATUS_CONFIG[status].label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_CONFIG).map(([value, config]) => (
          <SelectItem key={value} value={value}>
            <Badge
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium border-0",
                config.bg,
                config.text
              )}
            >
              {config.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
