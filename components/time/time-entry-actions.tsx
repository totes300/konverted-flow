"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";

interface TimeEntryActionsProps {
  entryId: Id<"timeEntries">;
  onEdit: () => void;
  onDelete: () => void;
}

export function TimeEntryActions({
  onEdit,
  onDelete,
}: TimeEntryActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover/entry:opacity-100 transition-opacity"
        >
          <IconDots className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <IconPencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <IconTrash className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
