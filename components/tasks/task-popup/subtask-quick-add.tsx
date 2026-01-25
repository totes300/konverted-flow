"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { IconPlus } from "@tabler/icons-react";

interface SubtaskQuickAddProps {
  parentTaskId: Id<"tasks">;
}

export function SubtaskQuickAdd({ parentTaskId }: SubtaskQuickAddProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createTask = useMutation(api.tasks.create);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setIsAdding(false);
      setTitle("");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await createTask({
        title: trimmed,
        parentTaskId,
      });
      setTitle("");
      // Keep input focused for rapid entry
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to create subtask");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setTitle("");
      setIsAdding(false);
    }
  };

  const handleBlur = () => {
    // Submit on blur if there's content, otherwise close
    if (title.trim().length > 0) {
      handleSubmit();
    } else {
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
        aria-label="Add new subtask"
      >
        <IconPlus className="h-4 w-4" />
        Add subtask
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
      <IconPlus className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Enter subtask title..."
        className="h-7 border-0 bg-transparent focus-visible:ring-0 px-0"
        disabled={isSubmitting}
        aria-label="New subtask title"
      />
    </div>
  );
}
