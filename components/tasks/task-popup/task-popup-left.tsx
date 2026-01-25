"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { IconFlagFilled, IconUser } from "@tabler/icons-react";
import { SubtaskList } from "./subtask-list";
import { AssigneePopover } from "./assignee-popover";
import {
  TaskStatus,
  TaskPriority,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/lib/task-constants";

interface TaskPopupLeftProps {
  task: Doc<"tasks">;
  clientName?: string;
}

export function TaskPopupLeft({ task, clientName }: TaskPopupLeftProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const updateTask = useMutation(api.tasks.update);
  const clients = useQuery(api.clients.list);

  const isSubtask = task.parentTaskId !== undefined;

  // Track mounted state to prevent updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync title when task changes
  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  // Sync description when task changes
  useEffect(() => {
    setDescription(task.description || "");
  }, [task.description]);

  // Auto-focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (descriptionTimeoutRef.current) {
        clearTimeout(descriptionTimeoutRef.current);
      }
    };
  }, []);

  const handleTitleSave = async () => {
    const trimmed = title.trim();
    if (trimmed === task.title) {
      setIsEditingTitle(false);
      return;
    }

    if (trimmed.length === 0) {
      setTitle(task.title);
      setIsEditingTitle(false);
      toast.error("Title cannot be empty");
      return;
    }

    try {
      await updateTask({ id: task._id, title: trimmed });
      setIsEditingTitle(false);
    } catch {
      setTitle(task.title);
      toast.error("Failed to update title");
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  // Use useCallback to get fresh task reference in debounced save
  const saveDescription = useCallback(async (value: string, currentDescription: string | undefined) => {
    if (!isMountedRef.current) return;

    if (value.trim() !== (currentDescription || "").trim()) {
      try {
        await updateTask({ id: task._id, description: value.trim() || undefined });
      } catch {
        if (isMountedRef.current) {
          toast.error("Failed to update description");
        }
      }
    }
  }, [task._id, updateTask]);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);

    // Debounce save (300ms per spec)
    if (descriptionTimeoutRef.current) {
      clearTimeout(descriptionTimeoutRef.current);
    }

    descriptionTimeoutRef.current = setTimeout(() => {
      saveDescription(value, task.description);
    }, 300);
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      await updateTask({ id: task._id, status: newStatus });
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    try {
      await updateTask({ id: task._id, priority: newPriority });
    } catch {
      toast.error("Failed to update priority");
    }
  };

  const handleClientChange = async (value: string) => {
    if (isSubtask) return;

    try {
      const newClientId = value === "none" ? undefined : (value as Id<"clients">);
      await updateTask({ id: task._id, clientId: newClientId });
    } catch {
      toast.error("Failed to update client");
    }
  };

  const handleAssigneesChange = async (assigneeIds: Id<"users">[]) => {
    try {
      await updateTask({ id: task._id, assigneeIds });
    } catch {
      toast.error("Failed to update assignees");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      {isEditingTitle ? (
        <Input
          ref={titleInputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={handleTitleKeyDown}
          className="text-xl font-semibold h-auto py-1 px-2 border-0 focus-visible:ring-1"
          aria-label="Task title"
        />
      ) : (
        <h1
          className="text-xl font-semibold cursor-text hover:bg-muted/50 rounded px-2 py-1 -mx-2"
          onClick={() => setIsEditingTitle(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(true)}
          aria-label="Click to edit task title"
        >
          {task.title}
        </h1>
      )}

      {/* Meta bar */}
      <div className="flex flex-wrap gap-3">
        {/* Status */}
        <Select value={task.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-9 w-[150px] border bg-background">
            <SelectValue>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[task.status].color}`} />
                <span className="text-sm">{STATUS_CONFIG[task.status].label}</span>
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
        <Select value={task.priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="h-9 w-[130px] border bg-background">
            <SelectValue>
              <div className="flex items-center gap-2">
                <IconFlagFilled className={`h-4 w-4 ${PRIORITY_CONFIG[task.priority].color}`} />
                <span className="text-sm">{PRIORITY_CONFIG[task.priority].label}</span>
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

        {/* Client */}
        {isSubtask ? (
          <div className="flex items-center gap-2 px-3 py-2 h-9 rounded-md border bg-muted/50 text-sm text-muted-foreground">
            <IconUser className="h-4 w-4" />
            <span className="truncate">{clientName || "No client"}</span>
          </div>
        ) : (
          <Select value={task.clientId ?? "none"} onValueChange={handleClientChange}>
            <SelectTrigger className="h-9 w-[150px] border bg-background">
              <SelectValue placeholder="No client">
                <div className="flex items-center gap-2 truncate">
                  <IconUser className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-sm">{clientName || "No client"}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No client</span>
              </SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client._id} value={client._id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Assignees */}
        <AssigneePopover
          assigneeIds={task.assigneeIds}
          onChange={handleAssigneesChange}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="task-description" className="text-sm font-medium text-muted-foreground">
          Description
        </label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Add a description..."
          className="min-h-[100px] resize-none"
        />
      </div>

      <Separator />

      {/* Subtasks section - only for main tasks */}
      {!isSubtask && (
        <SubtaskList parentTaskId={task._id} />
      )}
    </div>
  );
}
