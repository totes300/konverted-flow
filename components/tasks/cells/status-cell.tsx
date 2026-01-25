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
      <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent hover:bg-muted focus:ring-0 focus:ring-offset-0">
        <SelectValue>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[status].color}`} />
            <span className="text-sm">{STATUS_CONFIG[status].label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_CONFIG).map(([value, config]) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${config.color}`} />
              <span>{config.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
