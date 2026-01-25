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
import { IconFlagFilled } from "@tabler/icons-react";
import { TaskPriority, PRIORITY_CONFIG } from "@/lib/task-constants";

interface PriorityCellProps {
  taskId: Id<"tasks">;
  priority: TaskPriority;
}

export function PriorityCell({ taskId, priority }: PriorityCellProps) {
  const updateTask = useMutation(api.tasks.update);

  const handleChange = async (newPriority: TaskPriority) => {
    try {
      await updateTask({ id: taskId, priority: newPriority });
    } catch {
      toast.error("Failed to update priority");
    }
  };

  return (
    <Select value={priority} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-full border-none shadow-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:border-transparent">
        <SelectValue>
          <Badge
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium border-0 gap-1",
              PRIORITY_CONFIG[priority].bg,
              PRIORITY_CONFIG[priority].text
            )}
          >
            <IconFlagFilled className="h-3 w-3" />
            {PRIORITY_CONFIG[priority].label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
          <SelectItem key={value} value={value}>
            <Badge
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium border-0 gap-1",
                config.bg,
                config.text
              )}
            >
              <IconFlagFilled className="h-3 w-3" />
              {config.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
