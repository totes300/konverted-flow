"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { IconFlagFilled, IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  TaskStatus,
  TaskPriority,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/lib/task-constants";
import { TimePill } from "@/components/time/time-pill";

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

  // Sync title when subtask changes
  useEffect(() => {
    setTitle(subtask.title);
  }, [subtask.title]);

  // Auto-focus input when editing
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

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      await updateTask({ id: subtask._id, status: newStatus });
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    try {
      await updateTask({ id: subtask._id, priority: newPriority });
    } catch {
      toast.error("Failed to update priority");
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
    <div className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-muted/50 group">
      {/* Checkbox */}
      <Checkbox
        checked={isDone}
        onCheckedChange={handleCheckChange}
        className="shrink-0"
        aria-label={`Mark "${subtask.title}" as ${isDone ? "incomplete" : "complete"}`}
      />

      {/* Title */}
      {isEditing ? (
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={handleTitleKeyDown}
          className="h-7 flex-1 px-1 border-0 bg-transparent focus-visible:ring-1"
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

      {/* Status */}
      <Select value={subtask.status} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-7 w-[100px] border-0 bg-transparent hover:bg-muted text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
          <SelectValue>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[subtask.status].color}`} />
              <span className="truncate">{STATUS_CONFIG[subtask.status].label}</span>
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

      {/* Priority */}
      <Select value={subtask.priority} onValueChange={handlePriorityChange}>
        <SelectTrigger className="h-7 w-[80px] border-0 bg-transparent hover:bg-muted text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
          <SelectValue>
            <div className="flex items-center gap-1.5">
              <IconFlagFilled className={`h-3 w-3 ${PRIORITY_CONFIG[subtask.priority].color}`} />
              <span className="truncate">{PRIORITY_CONFIG[subtask.priority].label}</span>
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

      {/* Time */}
      <TimePill taskId={subtask._id} totalTimeSeconds={subtask.totalTimeSeconds} />

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
  );
}
