"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { IconPencil, IconCopy, IconArchive, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

interface TaskActionsProps {
  taskId: Id<"tasks">;
  onEdit: () => void;
}

export function TaskActions({ taskId, onEdit }: TaskActionsProps) {
  const duplicateTask = useMutation(api.tasks.duplicate);
  const deleteTask = useMutation(api.tasks.softDelete);

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await duplicateTask({ id: taskId });
      toast.success("Task duplicated");
    } catch {
      toast.error("Failed to duplicate task");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask({ id: taskId });
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <IconPencil className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit (E)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDuplicate}
          >
            <IconCopy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Duplicate (C)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <IconArchive className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Archive</TooltipContent>
      </Tooltip>

      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Delete (D)</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
