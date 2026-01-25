"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTaskFilters, GroupByOption } from "@/hooks/use-task-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconFilter,
  IconX,
  IconSearch,
} from "@tabler/icons-react";

type TaskStatus =
  | "today"
  | "next_up"
  | "in_progress"
  | "admin_review"
  | "client_review"
  | "stuck"
  | "done";

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "today", label: "Today", color: "bg-yellow-500" },
  { value: "next_up", label: "Next up", color: "bg-blue-500" },
  { value: "in_progress", label: "In Progress", color: "bg-purple-500" },
  { value: "admin_review", label: "Admin Review", color: "bg-orange-500" },
  { value: "client_review", label: "Client Review", color: "bg-cyan-500" },
  { value: "stuck", label: "Stuck", color: "bg-red-500" },
  { value: "done", label: "Done", color: "bg-green-500" },
];

export function TaskFilters() {
  const {
    filters,
    setFilters,
    clearFilters,
    toggleStatus,
    activeFilterCount,
    hasFilters,
  } = useTaskFilters();

  const [statusOpen, setStatusOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || "");

  const clients = useQuery(api.clients.list);
  const users = useQuery(api.users.listByOrg);

  const handleSearchSubmit = () => {
    setFilters({ search: searchValue.trim() || undefined });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const handleClientChange = (value: string) => {
    setFilters({ clientId: value === "all" ? undefined : (value as Id<"clients">) });
  };

  const handleAssigneeChange = (value: string) => {
    setFilters({ assigneeId: value === "all" ? undefined : (value as Id<"users">) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <IconSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onBlur={handleSearchSubmit}
          placeholder="Search tasks..."
          className="h-9 w-[200px] pl-8"
        />
      </div>

      {/* Status Filter */}
      <Popover open={statusOpen} onOpenChange={setStatusOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <IconFilter className="mr-2 h-4 w-4" />
            Status
            {filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {filters.status.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <Checkbox
                  checked={filters.status.includes(option.value)}
                  onCheckedChange={() => toggleStatus(option.value)}
                />
                <span className={`h-2 w-2 rounded-full ${option.color}`} />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Client Filter */}
      <Select
        value={filters.clientId || "all"}
        onValueChange={handleClientChange}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder="All clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All clients</SelectItem>
          {clients?.map((client) => (
            <SelectItem key={client._id} value={client._id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assignee Filter */}
      <Select
        value={filters.assigneeId || "all"}
        onValueChange={handleAssigneeChange}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder="All assignees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assignees</SelectItem>
          {users?.map((user) => (
            <SelectItem key={user._id} value={user._id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Group By Selector */}
      <Select
        value={filters.groupBy}
        onValueChange={(value) => setFilters({ groupBy: value as GroupByOption })}
      >
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="Group by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No grouping</SelectItem>
          <SelectItem value="client">By Client</SelectItem>
          <SelectItem value="status">By Status</SelectItem>
          <SelectItem value="assignee">By Assignee</SelectItem>
          <SelectItem value="priority">By Priority</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={clearFilters}
        >
          <IconX className="mr-1 h-4 w-4" />
          Clear
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      )}
    </div>
  );
}
