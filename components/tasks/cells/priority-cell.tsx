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
import { toast } from "sonner";
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
      <SelectTrigger className="h-8 w-[110px] border-0 bg-transparent hover:bg-muted focus:ring-0 focus:ring-offset-0">
        <SelectValue>
          <div className="flex items-center gap-2">
            <IconFlagFilled className={`h-4 w-4 ${PRIORITY_CONFIG[priority].color}`} />
            <span className="text-sm">{PRIORITY_CONFIG[priority].label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <IconFlagFilled className={`h-4 w-4 ${config.color}`} />
              <span>{config.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
