"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IconCirclePlus } from "@tabler/icons-react";

interface SubtaskQuickAddProps {
  parentTaskId: Id<"tasks">;
}

export function SubtaskQuickAdd({ parentTaskId }: SubtaskQuickAddProps): React.ReactElement {
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

  async function handleSubmit(): Promise<void> {
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
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to create subtask");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel(): void {
    setTitle("");
    setIsAdding(false);
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  // Inline row that's always visible
  return (
    <div className="grid grid-cols-[1fr_minmax(100px,140px)_minmax(80px,100px)_minmax(80px,120px)_40px] items-center px-4 py-3 hover:bg-muted/20 transition-colors">
      {/* Name cell */}
      <div className="flex items-center gap-2 min-w-0">
        <IconCirclePlus className="h-4 w-4 text-muted-foreground shrink-0" />
        {isAdding ? (
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter subtask title..."
            className="h-7 flex-1 px-1 border-0 bg-transparent focus-visible:ring-1"
            disabled={isSubmitting}
            aria-label="New subtask title"
          />
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
            aria-label="Add new subtask"
          >
            Add subtask...
          </button>
        )}
      </div>

      {/* Empty cells to match grid */}
      <div />
      <div />
      <div />

      {/* Actions cell */}
      <div className="flex items-center justify-end gap-1">
        {isAdding && title.trim().length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-6 px-2 text-xs"
            >
              Save
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
