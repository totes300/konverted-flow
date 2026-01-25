"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { IconPlus } from "@tabler/icons-react";

interface TaskQuickAddProps {
  defaultClientId?: Id<"clients">;
  defaultStatus?: "today" | "next_up" | "in_progress" | "admin_review" | "client_review" | "stuck" | "done";
}

export function TaskQuickAdd({ defaultClientId, defaultStatus }: TaskQuickAddProps) {
  const [title, setTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useMutation(api.tasks.create);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createTask({
        title: trimmedTitle,
        clientId: defaultClientId,
        status: defaultStatus,
      });
      setTitle("");
      inputRef.current?.focus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create task";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setTitle("");
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    if (!title.trim()) {
      setIsEditing(false);
    }
  };

  const handleClick = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2 w-full text-left text-muted-foreground hover:bg-muted/50 transition-colors rounded-md"
      >
        <IconPlus className="h-4 w-4" />
        <span className="text-sm">New task</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <IconPlus className="h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        data-testid="task-quick-add-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Task name..."
        className="border-0 bg-transparent h-8 px-1 focus-visible:ring-0 placeholder:text-muted-foreground/50"
        disabled={isSubmitting}
      />
    </div>
  );
}
