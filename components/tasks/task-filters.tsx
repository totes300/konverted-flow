"use client";

import { useState, useRef, useEffect } from "react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconChevronDown,
  IconX,
  IconSearch,
  IconLayoutRows,
  IconCheck,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { TaskStatus, STATUS_CONFIG } from "@/lib/task-constants";

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
  value: value as TaskStatus,
  label: config.label,
  bg: config.bg,
  text: config.text,
}));

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
  const [clientOpen, setClientOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(!!filters.search);
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const clients = useQuery(api.clients.list);
  const users = useQuery(api.users.listByOrg);

  // Focus search input when expanded
  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  const handleSearchSubmit = () => {
    setFilters({ search: searchValue.trim() || undefined });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
    if (e.key === "Escape") {
      setSearchValue("");
      setFilters({ search: undefined });
      setSearchExpanded(false);
    }
  };

  const handleSearchBlur = () => {
    handleSearchSubmit();
    if (!searchValue.trim()) {
      setSearchExpanded(false);
    }
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setFilters({ search: undefined });
    setSearchExpanded(false);
  };

  const handleClientSelect = (clientId: Id<"clients"> | null) => {
    setFilters({ clientId: clientId || undefined });
    setClientOpen(false);
  };

  const handleAssigneeSelect = (userId: Id<"users"> | null) => {
    setFilters({ assigneeId: userId || undefined });
    setAssigneeOpen(false);
  };

  const handleClearStatus = () => {
    setFilters({ status: [] });
  };

  const handleClearClient = () => {
    setFilters({ clientId: undefined });
  };

  const handleClearAssignee = () => {
    setFilters({ assigneeId: undefined });
  };

  // Get display names for active filters
  const selectedClientName = filters.clientId
    ? clients?.find((c) => c._id === filters.clientId)?.name
    : null;

  const selectedAssigneeName = filters.assigneeId
    ? users?.find((u) => u._id === filters.assigneeId)?.name
    : null;

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        {/* Status Filter */}
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5",
                filters.status.length > 0 && "border-primary/50"
              )}
            >
              Status
              {filters.status.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 px-1.5 text-xs"
                >
                  {filters.status.length}
                </Badge>
              )}
              <IconChevronDown className="ml-1 h-4 w-4 opacity-50" />
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
                  <Badge
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium border-0",
                      option.bg,
                      option.text
                    )}
                  >
                    {option.label}
                  </Badge>
                </label>
              ))}
            </div>
            {filters.status.length > 0 && (
              <>
                <div className="my-2 border-t" />
                <div className="flex justify-between px-2">
                  <button
                    onClick={() =>
                      setFilters({
                        status: STATUS_OPTIONS.map((s) => s.value),
                      })
                    }
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Select all
                  </button>
                  <button
                    onClick={handleClearStatus}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>

        {/* Client Filter */}
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5",
                filters.clientId && "border-primary/50"
              )}
            >
              Client
              {filters.clientId && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              <IconChevronDown className="ml-1 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search clients..." />
              <CommandList>
                <CommandEmpty>No clients found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => handleClientSelect(null)}
                    className="justify-between"
                  >
                    All clients
                    {!filters.clientId && (
                      <IconCheck className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                  {clients?.map((client) => (
                    <CommandItem
                      key={client._id}
                      value={client.name}
                      onSelect={() => handleClientSelect(client._id)}
                      className="justify-between"
                    >
                      {client.name}
                      {filters.clientId === client._id && (
                        <IconCheck className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Assignee Filter */}
        <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5",
                filters.assigneeId && "border-primary/50"
              )}
            >
              Assignee
              {filters.assigneeId && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              <IconChevronDown className="ml-1 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search people..." />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => handleAssigneeSelect(null)}
                    className="justify-between"
                  >
                    All assignees
                    {!filters.assigneeId && (
                      <IconCheck className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                  {users?.map((user) => (
                    <CommandItem
                      key={user._id}
                      value={user.name}
                      onSelect={() => handleAssigneeSelect(user._id)}
                      className="justify-between"
                    >
                      {user.name}
                      {filters.assigneeId === user._id && (
                        <IconCheck className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapsible Search */}
        {searchExpanded ? (
          <div className="relative">
            <IconSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleSearchBlur}
              placeholder="Search tasks..."
              className="h-9 w-[200px] pl-8 pr-8"
            />
            {searchValue && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 hover:bg-muted"
              >
                <IconX className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSearchExpanded(true)}
              >
                <IconSearch className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search tasks</TooltipContent>
          </Tooltip>
        )}

        {/* Group By */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-9 w-9",
                    filters.groupBy !== "none" && "border-primary/50"
                  )}
                >
                  <IconLayoutRows className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Group by</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Group by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={filters.groupBy}
              onValueChange={(value) =>
                setFilters({ groupBy: value as GroupByOption })
              }
            >
              <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="client">Client</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="assignee">Assignee</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filter Pills */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          {filters.status.map((status) => {
            const config = STATUS_CONFIG[status];
            return (
              <Badge
                key={status}
                variant="secondary"
                className="h-7 gap-1 pl-2.5 pr-1.5 font-normal"
              >
                {config.label}
                <button
                  onClick={() => toggleStatus(status)}
                  className="ml-0.5 rounded-sm p-0.5 hover:bg-background/50"
                >
                  <IconX className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}

          {/* Client Pill */}
          {selectedClientName && (
            <Badge
              variant="secondary"
              className="h-7 gap-1 pl-2.5 pr-1.5 font-normal"
            >
              {selectedClientName}
              <button
                onClick={handleClearClient}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-background/50"
              >
                <IconX className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Assignee Pill */}
          {selectedAssigneeName && (
            <Badge
              variant="secondary"
              className="h-7 gap-1 pl-2.5 pr-1.5 font-normal"
            >
              {selectedAssigneeName}
              <button
                onClick={handleClearAssignee}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-background/50"
              >
                <IconX className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Clear All */}
          <button
            onClick={clearFilters}
            className="ml-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
