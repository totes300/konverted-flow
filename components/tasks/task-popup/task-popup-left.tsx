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
  task: Doc<"tasks"> & { category?: TaskCategory };
  clientName?: string;
}

interface AttributeRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function AttributeRow({ icon, label, children }: AttributeRowProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

export function TaskPopupLeft({ task, clientName }: TaskPopupLeftProps): React.ReactElement {
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

  async function handleCheckChange(checked: boolean): Promise<void> {
    try {
      await updateTask({
        id: task._id,
        status: checked ? "done" : "next_up",
      });
    } catch {
      toast.error("Failed to update task");
    }
  }

  async function handleTitleSave(): Promise<void> {
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
  }

  function handleTitleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setTitle(task.title);
      setIsEditingTitle(false);
    }
  }

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

  function handleDescriptionChange(value: string): void {
    setDescription(value);

    if (descriptionTimeoutRef.current) {
      clearTimeout(descriptionTimeoutRef.current);
    }

    descriptionTimeoutRef.current = setTimeout(() => {
      saveDescription(value, task.description);
    }, 300);
  }

  async function handleStatusChange(newStatus: TaskStatus): Promise<void> {
    try {
      await updateTask({ id: task._id, status: newStatus });
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handlePriorityChange(newPriority: TaskPriority): Promise<void> {
    try {
      await updateTask({ id: task._id, priority: newPriority });
    } catch {
      toast.error("Failed to update priority");
    }
  }

  async function handleClientChange(value: string): Promise<void> {
    if (isSubtask) return;

    const newClientId = value === "none" ? undefined : (value as Id<"clients">);
    try {
      await updateTask({ id: task._id, clientId: newClientId });
    } catch {
      toast.error("Failed to update client");
    }
  }

  async function handleAssigneesChange(assigneeIds: Id<"users">[]): Promise<void> {
    try {
      await updateTask({ id: task._id, assigneeIds });
    } catch {
      toast.error("Failed to update assignees");
    }
  }

  async function handleCategoryChange(newCategory: TaskCategory | undefined): Promise<void> {
    try {
      await updateTask({ id: task._id, category: newCategory });
    } catch {
      toast.error("Failed to update category");
    }
  }

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
        <AttributeRow icon={<IconCalendarEvent className="h-4 w-4 shrink-0" />} label="Status">
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
        </AttributeRow>

        {/* Assignees */}
        <AttributeRow icon={<IconUsers className="h-4 w-4 shrink-0" />} label="Assignees">
          <AssigneePopover
            assigneeIds={task.assigneeIds}
            onChange={handleAssigneesChange}
          />
        </AttributeRow>

        {/* Priority */}
        <AttributeRow icon={<IconFlagFilled className="h-4 w-4 shrink-0" />} label="Priority">
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
        </AttributeRow>

        {/* Client */}
        <AttributeRow icon={<IconUser className="h-4 w-4 shrink-0" />} label="Client">
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
        </AttributeRow>

        {/* Category */}
        <AttributeRow icon={<IconCategory className="h-4 w-4 shrink-0" />} label="Category">
          <Select
            value={task.category ?? "none"}
            onValueChange={(value) =>
              handleCategoryChange(value === "none" ? undefined : (value as TaskCategory))
            }
          >
            <SelectTrigger className="h-9 flex-1 max-w-[180px] border-0 bg-muted/40 hover:bg-muted/60 transition-colors">
              <SelectValue placeholder="No category">
                <span className="text-sm">
                  {task.category
                    ? categoryOptions.find((opt) => opt.value === task.category)?.label
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
        </AttributeRow>
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
