"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { IconUserPlus } from "@tabler/icons-react";

interface AssigneeCellProps {
  taskId: Id<"tasks">;
  assigneeIds: Id<"users">[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AssigneeCell({ taskId, assigneeIds }: AssigneeCellProps) {
  const [open, setOpen] = useState(false);
  const updateTask = useMutation(api.tasks.update);
  const users = useQuery(api.users.listByOrg);

  const assignedUsers = users?.filter((u) => assigneeIds.includes(u._id)) || [];

  const handleToggle = async (userId: Id<"users">) => {
    const newAssigneeIds = assigneeIds.includes(userId)
      ? assigneeIds.filter((id) => id !== userId)
      : [...assigneeIds, userId];

    try {
      await updateTask({ id: taskId, assigneeIds: newAssigneeIds });
    } catch {
      toast.error("Failed to update assignees");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 hover:bg-muted"
        >
          {assignedUsers.length > 0 ? (
            <div className="flex -space-x-2">
              {assignedUsers.slice(0, 3).map((user) => (
                <Avatar key={user._id} className="h-6 w-6 border-[1.5px] border-background ring-1 ring-border/20">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignedUsers.length > 3 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
                  +{assignedUsers.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <IconUserPlus className="h-4 w-4" />
              <span className="text-xs">Assign</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          {users?.map((user) => (
            <label
              key={user._id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
            >
              <Checkbox
                checked={assigneeIds.includes(user._id)}
                onCheckedChange={() => handleToggle(user._id)}
              />
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{user.name}</span>
            </label>
          ))}
          {!users?.length && (
            <p className="text-center text-sm text-muted-foreground py-2">
              No team members
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
