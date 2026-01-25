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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  IconCalendarEvent,
  IconFlagFilled,
  IconUser,
  IconUsers,
  IconCategory,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { SubtaskList } from "./subtask-list";
import { AssigneePopover } from "./assignee-popover";
import {
  TaskStatus,
  TaskPriority,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/lib/task-constants";
import { getCategoryOptions, TaskCategory } from "@/lib/report-utils";

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
  const isDone = task.status === "done";

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    setDescription(task.description || "");
  }, [task.description]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    return () => {
      if (descriptionTimeoutRef.current) {
        clearTimeout(descriptionTimeoutRef.current);
      }
    };
  }, []);

  const handleCheckChange = async (checked: boolean) => {
    try {
      await updateTask({
        id: task._id,
        status: checked ? "done" : "next_up",
      });
    } catch {
      toast.error("Failed to update task");
    }
  };

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

  const handleCategoryChange = async (newCategory: TaskCategory | undefined) => {
    try {
      await updateTask({ id: task._id, category: newCategory });
    } catch {
      toast.error("Failed to update category");
    }
  };

  const categoryOptions = getCategoryOptions();

  return (
    <div className="h-full flex flex-col p-6 lg:p-8">
      {/* Title with checkbox */}
      <div className="flex items-start gap-4 mb-6">
        <Checkbox
          checked={isDone}
          onCheckedChange={handleCheckChange}
          className="h-7 w-7 rounded-full shrink-0 mt-1"
          aria-label={`Mark task as ${isDone ? "incomplete" : "complete"}`}
        />
        {isEditingTitle ? (
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="text-2xl lg:text-3xl font-semibold h-auto py-1 px-2 border-0 focus-visible:ring-1 flex-1"
            aria-label="Task title"
          />
        ) : (
          <h1
            className={cn(
              "text-2xl lg:text-3xl font-semibold cursor-text hover:bg-muted/30 rounded-lg px-2 py-1 -mx-2 flex-1 transition-colors leading-tight",
              isDone && "line-through text-muted-foreground"
            )}
            onClick={() => setIsEditingTitle(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(true)}
            aria-label="Click to edit task title"
          >
            {task.title}
          </h1>
        )}
      </div>

      {/* Attribute grid - responsive 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 py-6 border-y border-border/50 mb-6">
        {/* Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
            <IconCalendarEvent className="h-4 w-4 shrink-0" />
            <span>Status</span>
          </div>
          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 flex-1 max-w-[180px] border-0 bg-muted/40 hover:bg-muted/60 transition-colors">
              <SelectValue>
                <Badge
                  className={cn(
                    "rounded-full px-3 py-0.5 text-xs font-medium border-0",
                    STATUS_CONFIG[task.status].bg,
                    STATUS_CONFIG[task.status].text
                  )}
                >
                  {STATUS_CONFIG[task.status].label}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  <Badge
                    className={cn(
                      "rounded-full px-3 py-0.5 text-xs font-medium border-0",
                      config.bg,
                      config.text
                    )}
                  >
                    {config.label}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignees */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
            <IconUsers className="h-4 w-4 shrink-0" />
            <span>Assignees</span>
          </div>
          <AssigneePopover
            assigneeIds={task.assigneeIds}
            onChange={handleAssigneesChange}
          />
        </div>

        {/* Priority */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
            <IconFlagFilled className="h-4 w-4 shrink-0" />
            <span>Priority</span>
          </div>
          <Select value={task.priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="h-9 flex-1 max-w-[150px] border-0 bg-muted/40 hover:bg-muted/60 transition-colors">
              <SelectValue>
                <Badge
                  className={cn(
                    "rounded-full px-3 py-0.5 text-xs font-medium border-0 gap-1.5",
                    PRIORITY_CONFIG[task.priority].bg,
                    PRIORITY_CONFIG[task.priority].text
                  )}
                >
                  <IconFlagFilled className="h-3 w-3" />
                  {PRIORITY_CONFIG[task.priority].label}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  <Badge
                    className={cn(
                      "rounded-full px-3 py-0.5 text-xs font-medium border-0 gap-1.5",
                      config.bg,
                      config.text
                    )}
                  >
                    <IconFlagFilled className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Client */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
            <IconUser className="h-4 w-4 shrink-0" />
            <span>Client</span>
          </div>
          {isSubtask ? (
            <span className="text-sm text-muted-foreground">{clientName || "No client"}</span>
          ) : (
            <Select value={task.clientId ?? "none"} onValueChange={handleClientChange}>
              <SelectTrigger className="h-9 flex-1 max-w-[180px] border-0 bg-muted/40 hover:bg-muted/60 transition-colors">
                <SelectValue placeholder="No client">
                  <span className="text-sm">{clientName || "No client"}</span>
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
        </div>

        {/* Category */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
            <IconCategory className="h-4 w-4 shrink-0" />
            <span>Category</span>
          </div>
          <Select
            value={(task as { category?: TaskCategory }).category ?? "none"}
            onValueChange={(value) =>
              handleCategoryChange(value === "none" ? undefined : (value as TaskCategory))
            }
          >
            <SelectTrigger className="h-9 flex-1 max-w-[180px] border-0 bg-muted/40 hover:bg-muted/60 transition-colors">
              <SelectValue placeholder="No category">
                <span className="text-sm">
                  {(task as { category?: TaskCategory }).category
                    ? categoryOptions.find(
                        (opt) => opt.value === (task as { category?: TaskCategory }).category
                      )?.label
                    : "No category"}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No category</span>
              </SelectItem>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <Textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Add a description..."
          className="min-h-[120px] resize-none border-0 bg-muted/30 hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring/50 text-sm transition-colors"
          aria-label="Task description"
        />
      </div>

      {/* Subtasks section - fills remaining space */}
      {!isSubtask && (
        <div className="flex-1 min-h-0">
          <SubtaskList parentTaskId={task._id} />
        </div>
      )}
    </div>
  );
}
