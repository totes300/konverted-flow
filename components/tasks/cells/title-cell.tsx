"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IconSubtask } from "@tabler/icons-react";
import { toast } from "sonner";

interface TitleCellProps {
  taskId: Id<"tasks">;
  title: string;
  onClick?: () => void;
  hasUnseen?: boolean;
}

export function TitleCell({
  taskId,
  title,
  onClick,
  hasUnseen = false,
}: TitleCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTask = useMutation(api.tasks.update);
  const subtaskCount = useQuery(api.tasks.getSubtaskCount, { taskId });

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue === title) {
      setIsEditing(false);
      return;
    }

    if (trimmedValue.length === 0) {
      setEditValue(title);
      setIsEditing(false);
      toast.error("Title cannot be empty");
      return;
    }

    try {
      await updateTask({ id: taskId, title: trimmedValue });
      setIsEditing(false);
    } catch {
      setEditValue(title);
      toast.error("Failed to update title");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 border-0 bg-transparent px-1 focus-visible:ring-1"
      />
    );
  }

  const hasSubtasks = subtaskCount !== undefined && subtaskCount > 0;

  return (
    <div
      className="flex items-center gap-2 cursor-pointer px-1 py-1 hover:bg-muted/50 rounded"
      onDoubleClick={handleDoubleClick}
      onClick={onClick}
    >
      <span className="font-medium truncate">{title}</span>

      {hasSubtasks && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs shrink-0">
          <IconSubtask className="h-3 w-3 mr-0.5" />
          {subtaskCount}
        </Badge>
      )}

      {hasUnseen && (
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
      )}
    </div>
  );
}
