"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TodayList } from "@/components/today/today-list";
import { TaskPopup } from "@/components/tasks/task-popup";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function TodayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentUser = useQuery(api.users.getCurrentUser);
  const users = useQuery(api.users.listByOrg);

  // Filter state
  const [showAll, setShowAll] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);

  // Task popup state from URL
  const taskIdParam = searchParams.get("task");
  const taskId = taskIdParam as Id<"tasks"> | null;

  // Initialize selected user to current user when loaded
  useEffect(() => {
    if (currentUser && selectedUserId === null && !showAll) {
      setSelectedUserId(currentUser._id);
    }
  }, [currentUser, selectedUserId, showAll]);

  const handlePopupClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");
    const newUrl = params.toString() ? `/today?${params.toString()}` : "/today";
    router.push(newUrl);
  };

  const handleShowAllChange = (checked: boolean) => {
    setShowAll(checked);
    if (checked) {
      setSelectedUserId(null);
    } else if (currentUser) {
      setSelectedUserId(currentUser._id);
    }
  };

  const handleUserChange = (value: string) => {
    if (value === "all") {
      setShowAll(true);
      setSelectedUserId(null);
    } else {
      setShowAll(false);
      setSelectedUserId(value as Id<"users">);
    }
  };

  // Get the assignee filter value
  const assigneeFilter = showAll ? undefined : (selectedUserId ?? undefined);

  return (
    <>
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">
            Focus on what needs to be done today.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-all"
              checked={showAll}
              onCheckedChange={handleShowAllChange}
            />
            <Label htmlFor="show-all" className="text-sm">
              Show all
            </Label>
          </div>

          {!showAll && (
            <Select
              value={selectedUserId ?? ""}
              onValueChange={handleUserChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{user.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardContent className="p-4">
            <TodayList assigneeId={assigneeFilter} />
          </CardContent>
        </Card>
      </div>

      {/* Task Popup */}
      <TaskPopup
        taskId={taskId}
        open={taskId !== null}
        onOpenChange={(open) => {
          if (!open) {
            handlePopupClose();
          }
        }}
      />
    </>
  );
}
