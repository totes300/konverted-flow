"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { StatusCell } from "@/components/tasks/cells/status-cell";
import { PriorityCell } from "@/components/tasks/cells/priority-cell";
import { TimeCell } from "@/components/tasks/cells/time-cell";

interface SubtaskRowProps {
  subtask: Doc<"tasks">;
}

export function SubtaskRow({ subtask }: SubtaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.softDelete);

  const isDone = subtask.status === "done";

  useEffect(() => {
    setTitle(subtask.title);
  }, [subtask.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCheckChange = async (checked: boolean) => {
    try {
      await updateTask({
        id: subtask._id,
        status: checked ? "done" : "next_up",
      });
    } catch {
      toast.error("Failed to update subtask");
    }
  };

  const handleTitleSave = async () => {
    const trimmed = title.trim();
    if (trimmed === subtask.title) {
      setIsEditing(false);
      return;
    }

    if (trimmed.length === 0) {
      setTitle(subtask.title);
      setIsEditing(false);
      toast.error("Title cannot be empty");
      return;
    }

    try {
      await updateTask({ id: subtask._id, title: trimmed });
      setIsEditing(false);
    } catch {
      setTitle(subtask.title);
      toast.error("Failed to update subtask");
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setTitle(subtask.title);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask({ id: subtask._id });
      toast.success("Subtask deleted");
    } catch {
      toast.error("Failed to delete subtask");
    }
  };

  return (
    <div className="group/row grid grid-cols-[1fr_140px_135px_145px_40px] items-center border-b border-border/40 hover:bg-muted/30 transition-colors duration-100">
      {/* Name cell */}
      <div className="flex items-center gap-3 min-w-0 py-2 px-4">
        <Checkbox
          checked={isDone}
          onCheckedChange={handleCheckChange}
          className="shrink-0"
          aria-label={`Mark "${subtask.title}" as ${isDone ? "incomplete" : "complete"}`}
        />
        {isEditing ? (
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="h-8 flex-1 px-2 border-0 bg-transparent focus-visible:ring-1"
            aria-label="Subtask title"
          />
        ) : (
          <span
            className={cn(
              "flex-1 text-sm cursor-text truncate",
              isDone && "line-through text-muted-foreground"
            )}
            onDoubleClick={() => setIsEditing(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setIsEditing(true)}
          >
            {subtask.title}
          </span>
        )}
      </div>

      {/* Status cell - reuse shared component */}
      <div className="py-2 min-w-0 whitespace-nowrap">
        <StatusCell taskId={subtask._id} status={subtask.status} />
      </div>

      {/* Priority cell - reuse shared component */}
      <div className="py-2 min-w-0 whitespace-nowrap">
        <PriorityCell taskId={subtask._id} priority={subtask.priority} />
      </div>

      {/* Time cell - reuse shared component */}
      <div className="py-2 min-w-0 whitespace-nowrap">
        <TimeCell taskId={subtask._id} totalTimeSeconds={subtask.totalTimeSeconds} />
      </div>

      {/* Actions cell */}
      <div className="flex items-center justify-center py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 opacity-0 group-hover/row:opacity-100 transition-opacity"
              aria-label="Subtask actions"
            >
              <IconDotsVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <IconTrash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
