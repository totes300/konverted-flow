"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Id } from "@/convex/_generated/dataModel";

interface TaskCheckboxProps {
  taskId: Id<"tasks">;
  checked: boolean;
  onCheckedChange: (taskId: Id<"tasks">) => void;
}

export function TaskCheckbox({
  taskId,
  checked,
  onCheckedChange,
}: TaskCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={() => onCheckedChange(taskId)}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4"
    />
  );
}
