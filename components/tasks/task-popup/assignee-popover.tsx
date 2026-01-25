"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconUsers } from "@tabler/icons-react";

interface AssigneePopoverProps {
  assigneeIds: Id<"users">[];
  onChange: (assigneeIds: Id<"users">[]) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AssigneePopover({ assigneeIds, onChange }: AssigneePopoverProps) {
  const [open, setOpen] = useState(false);
  const users = useQuery(api.users.listByOrg);

  const assignedUsers = users?.filter((user) => assigneeIds.includes(user._id)) || [];

  const handleToggle = (userId: Id<"users">, checked: boolean) => {
    if (checked) {
      onChange([...assigneeIds, userId]);
    } else {
      onChange(assigneeIds.filter((id) => id !== userId));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 px-3 gap-2" aria-label="Assign users">
          {assignedUsers.length > 0 ? (
            <>
              <div className="flex -space-x-2">
                {assignedUsers.slice(0, 3).map((user) => (
                  <Avatar key={user._id} className="h-5 w-5 border-2 border-background">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {assignedUsers.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{assignedUsers.length - 3}
                </span>
              )}
            </>
          ) : (
            <>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Assign</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          {users?.map((user) => (
            <label
              key={user._id}
              className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted cursor-pointer"
            >
              <Checkbox
                checked={assigneeIds.includes(user._id)}
                onCheckedChange={(checked) =>
                  handleToggle(user._id, checked as boolean)
                }
                aria-label={`Assign ${user.name}`}
              />
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{user.name}</span>
            </label>
          ))}
          {users?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No users available
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
