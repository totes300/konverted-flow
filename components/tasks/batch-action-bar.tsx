"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconX, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { STATUS_CONFIG, TaskStatus } from "@/lib/task-constants";

interface BatchActionBarProps {
  selectedCount: number;
  selectedIds: Id<"tasks">[];
  onClear: () => void;
}

export function BatchActionBar({
  selectedCount,
  selectedIds,
  onClear,
}: BatchActionBarProps) {
  const batchUpdate = useMutation(api.tasks.batchUpdate);
  const batchDelete = useMutation(api.tasks.batchDelete);

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      await batchUpdate({ taskIds: selectedIds, updates: { status } });
      toast.success(`Updated ${selectedCount} tasks`);
      onClear();
    } catch {
      toast.error("Failed to update tasks");
    }
  };

  const handleDelete = async () => {
    try {
      await batchDelete({ taskIds: selectedIds });
      toast.success(`Deleted ${selectedCount} tasks`);
      onClear();
    } catch {
      toast.error("Failed to delete tasks");
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center gap-4 rounded-lg border bg-background p-3 shadow-lg">
      <span className="text-sm font-medium">{selectedCount} selected</span>

      <Select onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[150px] h-8">
          <SelectValue placeholder="Change status" />
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

      <Button variant="destructive" size="sm" onClick={handleDelete}>
        <IconTrash className="h-4 w-4 mr-1" />
        Delete
      </Button>

      <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto">
        <IconX className="h-4 w-4 mr-1" />
        Clear
      </Button>
    </div>
  );
}
